"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

  // Stable event handlers to prevent socket reconnections
  const socketEvents = useMemo(
    () => ({
      onParticipantsUpdate: (updated: Participant[]) => {
        console.log("👥 Host dashboard - participants updated:", updated);
        const validParticipants = Array.isArray(updated) ? updated : [];
        setParticipants(validParticipants);
      },
      onQuizStart: (data: { sessionId?: string }) => {
        console.log("🚀 Host dashboard - quiz started:", data);
        if (data?.sessionId && roomId) {
          router.push(`/quiz/${roomId}?sessionId=${data.sessionId}`);
        }
      },
    }),
    [roomId, router]
  );

  // Only initialize socket when prerequisites are met
  const socket = useMemo(() => {
    if (!roomId || !user?.id || !isLoaded || !isSignedIn) {
      return null;
    }
    
    try {
      return useSocket(roomId, user.id, user.firstName ?? undefined, socketEvents);
    } catch (err) {
      console.error("Socket initialization error:", err);
      return null;
    }
  }, [roomId, user?.id, user?.firstName, isLoaded, isSignedIn, socketEvents]);

  const loadData = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !roomId) return;

    try {
      setLoading(true);
      setError("");

      // Load room data
      const roomRes = await fetch(`/api/room/${roomId}`);
      if (!roomRes.ok) {
        const errorData = await roomRes.json().catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(errorData.error || "Room not found");
      }
      
      const roomData = await roomRes.json();
      if (roomData?.room) {
        setRoom(roomData.room);
        setQuestionCount(roomData.room.questionCount || 5);
        setTimePerQuestion(roomData.room.timePerQuestion || 30);
      }

      // Load questions
      const questionsRes = await fetch(`/api/question/list?roomId=${roomId}`);
      if (questionsRes.ok) {
        const questionsData = await questionsRes.json();
        const validQuestions = Array.isArray(questionsData) ? questionsData : [];
        setQuestions(validQuestions);
      } else {
        setQuestions([]);
      }

      // Load participants
      const participantsRes = await fetch(`/api/participants?roomId=${roomId}`);
      if (participantsRes.ok) {
        const participantsData = await participantsRes.json();
        const validParticipants = Array.isArray(participantsData?.participants) 
          ? participantsData.participants 
          : [];
        setParticipants(validParticipants);
      } else {
        setParticipants([]);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Load data error:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, roomId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    loadData();
  }, [isLoaded, isSignedIn, loadData, router]);

  // Polling participants as a fallback
  useEffect(() => {
    if (!roomId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/participants?roomId=${roomId}`);
        if (res.ok) {
          const data = await res.json();
          const validParticipants = Array.isArray(data?.participants) 
            ? data.participants 
            : [];
          setParticipants(validParticipants);
        }
      } catch (err) {
        // Silently ignore polling errors
        console.warn("Participant polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [roomId]);

  const updateSettings = useCallback(async () => {
    if (!roomId) return;
    
    setSaveLoading(true);
    setError("");
    
    try {
      const res = await fetch(`/api/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionCount, timePerQuestion }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to update settings" }));
        throw new Error(errorData.error || "Failed to update settings");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update settings";
      setError(errorMessage);
    } finally {
      setSaveLoading(false);
    }
  }, [roomId, questionCount, timePerQuestion]);

  const startQuiz = useCallback(async () => {
    if (!roomId) return;
    
    const questionsLength = questions?.length ?? 0;
    if (questionsLength === 0) {
      setError("Please add at least one question before starting");
      return;
    }
    
    setStartLoading(true);
    setError("");
    
    try {
      const res = await fetch(`/api/room/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, questionCount, timePerQuestion }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to start quiz" }));
        throw new Error(errorData.error || "Failed to start quiz");
      }
      
      const data = await res.json();
      if (data?.session?.id) {
        router.push(`/quiz/${roomId}?sessionId=${data.session.id}`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start quiz";
      setError(errorMessage);
    } finally {
      setStartLoading(false);
    }
  }, [roomId, questionCount, timePerQuestion, questions, router]);

  const copyRoomCode = useCallback(() => {
    const code = room?.code;
    if (!code) return;
    
    navigator.clipboard.writeText(code).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
    
    const btn = document.querySelector("[data-copy-button]") as HTMLButtonElement;
    if (btn) {
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => {
        if (btn) btn.textContent = original;
      }, 2000);
    }
  }, [room?.code]);

  const addQuestion = useCallback((newQuestion: Question) => {
    setQuestions(prev => {
      const currentQuestions = Array.isArray(prev) ? prev : [];
      return [...currentQuestions, newQuestion];
    });
  }, []);

  // Early returns for loading and auth states
  if (!isLoaded || loading) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    router.replace("/sign-in");
    return null;
  }

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

  const questionsLength = questions?.length ?? 0;
  const participantsLength = participants?.length ?? 0;
  const roomName = room?.name ?? "Quiz Room";
  const roomCode = room?.code ?? "----";

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
              <h1 className="text-3xl font-bold neon-text">{roomName}</h1>
              <p className="text-gray-300 mt-1">
                Room Code: <span className="font-mono text-neonCyan">{roomCode}</span>
              </p>
              {socket && (
                <p className="text-sm text-gray-400 mt-1">
                  Socket: {socket.isConnected && socket.isConnected() ? "🟢 Connected" : "🔴 Disconnected"}
                </p>
              )}
            </div>
            <div>
              <NeonButton onClick={copyRoomCode} className="text-sm px-4 py-2" data-copy-button>
                Copy Code
              </NeonButton>
            </div>
          </div>
        </motion.header>

        {/* Error Display */}
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
          {/* Host-only sections */}
          {isHost && (
            <>
              {/* Quiz Settings */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-800 p-6 rounded-lg border border-gray-700"
              >
                <h2 className="text-xl font-bold neon-text mb-4">Quiz Settings</h2>
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
                      onChange={(e) => {
                        const value = Math.min(Math.max(1, Number(e.target.value) || 1), 50);
                        setQuestionCount(value);
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-neonCyan"
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
                      onChange={(e) => {
                        const value = Math.min(Math.max(5, Number(e.target.value) || 5), 300);
                        setTimePerQuestion(value);
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-neonCyan"
                    />
                  </div>
                </div>
                <NeonButton onClick={updateSettings} disabled={saveLoading} className="px-6 py-2">
                  {saveLoading ? "Saving..." : "Save Settings"}
                </NeonButton>
              </motion.section>

              {/* Start Quiz Section */}
              <motion.section
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-green-900 p-6 rounded-lg border border-green-700"
              >
                <h2 className="text-xl font-bold neon-text mb-4">Ready to Start?</h2>
                <p className="mb-4 text-gray-400 font-medium">
                  Make sure you have added at least one question before starting.
                </p>
                <div className="flex items-center gap-4">
                  <NeonButton
                    onClick={startQuiz}
                    disabled={startLoading || questionsLength === 0}
                    className="px-6 py-2"
                  >
                    {startLoading ? "Starting..." : "Start Quiz"}
                  </NeonButton>
                  {questionsLength === 0 && (
                    <span className="text-yellow-400 font-semibold">
                      No questions added yet
                    </span>
                  )}
                </div>
              </motion.section>
            </>
          )}

          {/* Participants Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 p-6 rounded-lg border border-gray-700"
          >
            <h2 className="text-xl font-bold text-neonCyan mb-4">
              Participants ({participantsLength})
            </h2>
            {participantsLength === 0 ? (
              <p className="text-gray-500">No participants have joined yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                {participants.map((participant) => {
                  const { id, name, email } = participant || {};
                  const displayName = name || email || "Anonymous";
                  const initial = displayName.charAt(0).toUpperCase();
                  
                  return (
                    <div
                      key={id || Math.random()}
                      className="bg-gray-900 rounded-md p-3 border border-gray-700 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neonPink to-neonCyan flex items-center justify-center text-black font-bold text-lg">
                        {initial}
                      </div>
                      <div className="truncate">{displayName}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>

          {/* Questions Section (Host only) */}
          {isHost && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800 p-6 rounded-lg border border-gray-700"
            >
              <h2 className="text-xl font-bold text-neonPink mb-4">Quiz Questions</h2>
              
              {roomId && (
                <AddQuestionForm roomId={roomId} onAdded={addQuestion} />
              )}
              
              {questionsLength === 0 ? (
                <p className="mt-6 text-gray-500">No questions added yet.</p>
              ) : (
                <ul className="mt-6 space-y-3 max-h-64 overflow-y-auto">
                  {questions.map((question, idx) => {
                    const { id, text, options = [], answer } = question || {};
                    
                    return (
                      <li key={id || idx} className="bg-gray-900 border border-gray-700 rounded-md p-3">
                        <p className="mb-2 font-semibold">{`${idx + 1}. ${text || "Untitled Question"}`}</p>
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
                              {option || `Option ${i + 1}`}
                            </span>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}