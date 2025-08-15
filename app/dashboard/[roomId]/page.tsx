"use client";

import { useEffect, useState, useCallback } from "react";
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

export default function RoomDashboard({
  params,
}: {
  params: { roomId: string };
}) {
  const { roomId } = params;
  const { user, isLoaded, isSignedIn } = useUser();
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

  // Socket connection for real-time updates with user info passed correctly
  useSocket(roomId, user?.id ?? undefined, user?.firstName ?? undefined, {
    onParticipantsUpdate: (updated) => {
      setParticipants(updated);
    },
    onQuizStart: (data) => {
      if (data?.sessionId) {
        router.push(`/quiz/${roomId}?sessionId=${data.sessionId}`);
      }
    },
  });

  // Load room, questions and participants data on mount and user status change
  const loadData = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      setLoading(true);
      setError("");

      // Fetch room details
      const roomRes = await fetch(`/api/room/${roomId}`);
      if (!roomRes.ok) throw new Error("Room not found");
      const roomData = await roomRes.json();
      setRoom(roomData.room);
      setQuestionCount(roomData.room.questionCount);
      setTimePerQuestion(roomData.room.timePerQuestion);

      // Fetch questions
      const questionsRes = await fetch(`/api/question/list?roomId=${roomId}`);
      if (questionsRes.ok) {
        const questionsData = await questionsRes.json();
        setQuestions(questionsData);
      }

      // Fetch participants
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
  }, [roomId, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    loadData();
  }, [isLoaded, isSignedIn, loadData, router]);

  // Poll participants every 2 seconds when host is waiting or viewing dashboard
  useEffect(() => {
    if (!roomId) return;

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
  }, [roomId]);

  // Save settings API call
  const updateSettings = async () => {
    setSaveLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/room`, {
        method: "PUT",
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

  // Start quiz API call
  const startQuiz = async () => {
    if (questions.length === 0) {
      setError("Please add at least one question before starting");
      return;
    }

    setStartLoading(true);
    setError("");
    try {
      console.log(`🚀 Starting quiz for room ${roomId}`);
      const res = await fetch(`/api/room/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, questionCount, timePerQuestion }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start quiz");
      }
      const data = await res.json();
      console.log("✅ Quiz started", data);
      router.push(`/quiz/${roomId}?sessionId=${data.session.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStartLoading(false);
    }
  };

  // Copy room code to clipboard
  const copyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    const btn = document.querySelector(
      "[data-copy-button]"
    ) as HTMLButtonElement;
    if (btn) {
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = original), 2000);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error && !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-3xl font-bold text-red-600">Error</h2>
          <p className="text-gray-300">{error}</p>
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
        {/* Room Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-lg border border-purple-500 p-6 mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
            <div>
              <h1 className="text-3xl font-bold neon-text">{room?.name}</h1>
              <p className="text-gray-300 mt-1">
                Room Code:{" "}
                <span className="font-mono text-neon-cyan">{room?.code}</span>
              </p>
            </div>
            <div>
              <NeonButton onClick={copyRoomCode} className="text-sm px-4 py-2">
                Copy Code
              </NeonButton>
            </div>
          </div>
        </motion.header>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-700 bg-opacity-30 border border-red-600 rounded-md p-4 mb-6 max-w-3xl mx-auto text-center"
          >
            <p>{error}</p>
          </motion.div>
        )}

        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Host Controls */}
          {isHost && (
            <>
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-800 p-6 rounded-lg border border-gray-700"
              >
                <h2 className="text-xl font-bold neon-text mb-4">
                  Quiz Settings
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block mb-1 text-gray-400 font-semibold">
                      Number of Questions
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={questionCount}
                      onChange={(e) =>
                        setQuestionCount(
                          Math.min(Math.max(1, Number(e.target.value)), 50)
                        )
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-neon-cyan"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-gray-400 font-semibold">
                      Time per Question (seconds)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={timePerQuestion}
                      onChange={(e) =>
                        setTimePerQuestion(
                          Math.min(Math.max(5, Number(e.target.value)), 300)
                        )
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-neon-cyan"
                    />
                  </div>
                </div>
                <NeonButton
                  onClick={updateSettings}
                  disabled={saveLoading}
                  className="px-6 py-2"
                >
                  {saveLoading ? "Saving..." : "Save Settings"}
                </NeonButton>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-green-900 p-6 rounded-lg border border-green-700"
              >
                <h2 className="text-xl font-bold neon-text mb-4">
                  Ready to Start?
                </h2>
                <p className="mb-4 text-gray-400 font-medium">
                  Make sure you have added at least one question before
                  starting.
                </p>
                <div className="flex items-center gap-4">
                  <NeonButton
                    onClick={startQuiz}
                    disabled={startLoading || questions.length === 0}
                    className="px-6 py-2"
                  >
                    {startLoading ? "Starting..." : "Start Quiz"}
                  </NeonButton>
                  {questions.length === 0 && (
                    <span className="text-yellow-400 font-semibold">
                      No questions added yet
                    </span>
                  )}
                </div>
              </motion.section>
            </>
          )}

          {/* Participants List */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h2 className="text-xl font-bold neon-cyan mb-4">
              Participants ({participants.length})
            </h2>
            {participants.length === 0 ? (
              <p className="text-gray-500">No participants have joined yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                {participants.map(({ id, name, email }) => (
                  <div
                    key={id}
                    className="bg-gray-900 rounded-md p-3 border border-gray-700 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-pink to-neon-cyan flex items-center justify-center text-black font-bold text-lg">
                      {(name || email || "A")[0].toUpperCase()}
                    </div>
                    <div className="truncate">
                      {name || email || "Anonymous"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Questions Management */}
          {isHost && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800 p-6 rounded-lg border border-gray-700"
            >
              <h2 className="text-xl font-bold neon-pink mb-4">
                Quiz Questions
              </h2>
              <AddQuestionForm
                roomId={roomId}
                onAdded={(q) => setQuestions((prev) => [...prev, q])}
              />
              {questions.length === 0 ? (
                <p className="mt-6 text-gray-500">No questions added yet.</p>
              ) : (
                <ul className="mt-6 space-y-3 max-h-64 overflow-y-auto">
                  {questions.map(({ id, text, options, answer }, idx) => (
                    <li
                      key={id}
                      className="bg-gray-900 border border-gray-700 rounded-md p-3"
                    >
                      <p className="mb-2 font-semibold">{`${
                        idx + 1
                      }. ${text}`}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {options.map((option, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded ${
                              option === answer
                                ? "bg-green-600 text-white"
                                : "bg-gray-700 text-gray-300"
                            }`}
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}
