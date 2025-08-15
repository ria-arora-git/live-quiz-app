"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import useSocket from "@/lib/useSocket";
import AddQuestionForm from "@/components/AddQuestionForm";
import NeonButton from "@/components/NeonButton";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Room {
  id: string;
  code: string;
  name: string;
  createdBy: string;
  questionCount: number;
  timePerQuestion: number;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  answer: string;
}

interface Participant {
  id: string;
  name?: string;
  email?: string;
  clerkId: string;
}

export default function RoomDashboard({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [saveLoading, setSaveLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);

  const isHost = room?.createdBy === user?.id;

  // Socket connection for real-time updates
  useSocket(
    roomId,
    user?.id,
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress,
    {
      onParticipantsUpdate: (updated: Participant[]) => {
        console.log("👥 Host dashboard - participants updated:", updated);
        setParticipants(updated);
      },
      onQuizStart: (data: { sessionId?: string }) => {
        console.log("🚀 Host dashboard - quiz started:", data);
        if (data?.sessionId) {
          router.push(`/quiz/${roomId}?sessionId=${data.sessionId}`);
        }
      }
    }
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    
    const loadData = async () => {
      try {
        // Load room data
        const roomRes = await fetch(`/api/room/${roomId}`);
        if (!roomRes.ok) throw new Error("Room not found");
        const roomData = await roomRes.json();
        setRoom(roomData.room);
        setQuestionCount(roomData.room.questionCount);
        setTimePerQuestion(roomData.room.timePerQuestion);

        // Load questions
        const questionsRes = await fetch(`/api/question/list?roomId=${roomId}`);
        if (questionsRes.ok) {
          const questionsData = await questionsRes.json();
          setQuestions(questionsData);
        }

        // Load participants
        const participantsRes = await fetch(`/api/participants?roomId=${roomId}`);
        if (participantsRes.ok) {
          const participantsData = await participantsRes.json();
          setParticipants(participantsData.participants || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up periodic participant updates
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/participants?roomId=${roomId}`);
        if (res.ok) {
          const data = await res.json();
          setParticipants(data.participants || []);
        }
      } catch (error) {
        console.error("❌ Error fetching participants:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, roomId, router]);

  const updateSettings = async () => {
    setSaveLoading(true);
    setError("");
    try {
      const res = await fetch("/api/room/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, questionCount, timePerQuestion }),
      });
      
      if (!res.ok) throw new Error("Failed to update settings");
      console.log("✅ Room settings updated successfully");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const startQuiz = async () => {
    if (questions.length === 0) {
      setError("Please add at least one question before starting the quiz");
      return;
    }
    
    setStartLoading(true);
    setError("");
    
    try {
      console.log(`🚀 Host starting quiz for room ${roomId}`);
      
      const res = await fetch("/api/room/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, questionCount, timePerQuestion }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to start quiz");
      }
      
      const data = await res.json();
      console.log("✅ Quiz started successfully:", data);
      
      // Navigate to quiz page
      router.push(`/quiz/${roomId}?sessionId=${data.session.id}`);
    } catch (err: any) {
      console.error("❌ Error starting quiz:", err);
      setError(err.message);
    } finally {
      setStartLoading(false);
    }
  };

  const copyRoomCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      const btn = document.querySelector('[data-copy-button]') as HTMLButtonElement;
      if (btn) {
        const original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = original, 2000);
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <NeonButton onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </NeonButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto px-6 py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-lg p-6 mb-8 border border-purple-500"
        >
          <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold neon-text mb-2">{room?.name}</h1>
              <p className="text-gray-300">
                Room Code: <span className="font-mono text-neonCyan text-xl">{room?.code}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <NeonButton
                onClick={copyRoomCode}
                className="text-sm px-4 py-2 bg-neonCyan text-black"
                data-copy-button
              >
                Copy Code
              </NeonButton>
            </div>
          </div>
        </motion.header>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4 mb-6"
          >
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        <div className="space-y-8">
          {isHost && (
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <h2 className="text-2xl font-bold mb-4 text-neonPink">Quiz Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-neonPink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time per Question (seconds)</label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 5)}
                    className="w-full bg-gray-900 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-neonPink focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={updateSettings}
                disabled={saveLoading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {saveLoading ? "Saving..." : "Save Settings"}
              </button>
            </motion.section>
          )}

          {isHost && (
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-lg p-6 border border-green-500"
            >
              <h2 className="text-2xl font-bold mb-4 text-green-400">Ready to Start?</h2>
              <p className="text-gray-300 mb-4">
                Make sure you've added questions and configured the settings before starting.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <NeonButton
                  onClick={startQuiz}
                  disabled={startLoading || questions.length === 0}
                  className="px-8 py-3 bg-green-500 text-black"
                >
                  {startLoading ? "Starting..." : "Start Quiz"}
                </NeonButton>
                {questions.length === 0 && (
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Please add at least one question before starting
                  </p>
                )}
                {participants.length === 0 && (
                  <p className="text-blue-400 text-sm">
                    💡 Share the room code <span className="font-mono">{room?.code}</span> to invite participants
                  </p>
                )}
              </div>
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700"
          >
            <h2 className="text-2xl font-bold mb-4 text-neonCyan">
              Participants ({participants.length})
            </h2>
            {participants.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4 opacity-50">👥</div>
                <p className="text-gray-400">No participants yet...</p>
                <p className="text-gray-500 text-sm mt-2">
                  Share the room code <span className="font-mono text-neonCyan">{room?.code}</span> to invite players
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                {participants.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-900 rounded-lg p-3 border border-gray-600 hover:border-neonCyan transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-neonPink to-neonCyan rounded-full flex items-center justify-center text-black font-bold text-sm">
                        {(participant.name || participant.email || "A").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {participant.name || participant.email || "Anonymous"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {isHost && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <h2 className="text-2xl font-bold mb-4 text-neonPink">Questions</h2>
              
              <AddQuestionForm
                roomId={roomId}
                onAdded={(question) => setQuestions((prev) => [...prev, question])}
              />

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">
                  Current Questions ({questions.length})
                </h3>
                {questions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4 opacity-50">❓</div>
                    <p className="text-gray-400">No questions added yet</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Add questions using the form above
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {questions.map((question, index) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gray-900 rounded-lg p-4 border border-gray-600"
                      >
                        <div className="flex items-start gap-3">
                          <span className="bg-neonPink text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium mb-2">{question.text}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {question.options.map((option, optIndex) => (
                                <span
                                  key={optIndex}
                                  className={`px-2 py-1 rounded ${
                                    option === question.answer
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-700 text-gray-300"
                                  }`}
                                >
                                  {option}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}