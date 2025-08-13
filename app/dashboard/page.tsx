"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import useSocket from "@/lib/useSocket";
import NeonButton from "@/components/NeonButton";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Participant {
  id: string;
  name?: string;
  email?: string;
  clerkId: string;
}

export default function DashboardPage() {
  const [roomCode, setRoomCode] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);

  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Socket connection for waiting room
  useSocket(
    joinedRoomId || "",
    (updated) => setParticipants(updated),
    undefined,
    (data) => {
      const sid = data.sessionId || sessionId;
      router.push(`/quiz/${joinedRoomId}?sessionId=${sid}`);
    }
  );

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  const handleCreateRoom = async () => {
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create room");
      }
      
      const data = await res.json();
      router.push(`/dashboard/${data.room.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Find room by code
      const roomRes = await fetch(`/api/room/by-code?code=${roomCode.toUpperCase()}`);
      if (!roomRes.ok) {
        throw new Error("Room not found");
      }
      const { room } = await roomRes.json();

      // Try to join active session
      const joinRes = await fetch("/api/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id }),
      });

      if (joinRes.ok) {
        const { sessionId: sid } = await joinRes.json();
        setSessionId(sid);
      }

      // Set waiting state
      setJoinedRoomId(room.id);
      setWaiting(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    setWaiting(false);
    setJoinedRoomId(null);
    setSessionId(null);
    setParticipants([]);
    setRoomCode("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold neon-text mb-4">Quiz Dashboard</h1>
          <p className="text-gray-400 text-lg">
            Welcome back, {user?.firstName || "Player"}! Ready to compete?
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4 mb-6 text-center"
          >
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        <div className="max-w-4xl mx-auto space-y-8">
          {!waiting ? (
            <>
              {/* Host Section */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-lg p-8 shadow-xl border border-purple-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-neonPink mb-2">Host a Quiz</h2>
                    <p className="text-gray-300 mb-6">
                      Create a new room and invite participants using a join code.
                    </p>
                  </div>
                  <div className="text-6xl opacity-20">🎯</div>
                </div>
                <NeonButton
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="px-8 py-3"
                >
                  {loading ? "Creating..." : "Create Room"}
                </NeonButton>
              </motion.section>

              {/* Join Section */}
              <motion.section
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-cyan-900 to-blue-900 rounded-lg p-8 shadow-xl border border-cyan-500"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-neonCyan mb-2">Join a Quiz</h2>
                    <p className="text-gray-300">
                      Enter the room code to join an existing quiz.
                    </p>
                  </div>
                  <div className="text-6xl opacity-20">🚀</div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter Room Code (e.g., ABC123)"
                    maxLength={6}
                    className="flex-1 px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-neonCyan focus:outline-none transition-colors font-mono text-center text-xl tracking-widest"
                  />
                  <NeonButton
                    onClick={handleJoinRoom}
                    disabled={loading || !roomCode.trim()}
                    className="px-8 py-3 bg-neonCyan text-black"
                  >
                    {loading ? "Joining..." : "Join Room"}
                  </NeonButton>
                </div>
              </motion.section>
            </>
          ) : (
            // Waiting Room
            <motion.section
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-8 shadow-xl border border-gray-600"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-neonPink mb-4">Waiting Room</h2>
                <p className="text-gray-400">
                  Waiting for the host to start the quiz. You'll be redirected automatically.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4 text-center">
                  Participants ({participants.length})
                </h3>
                {participants.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse text-4xl mb-4">⏳</div>
                    <p className="text-gray-400">No participants yet...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                    {participants.map((participant, index) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gray-800 rounded-lg p-3 border border-gray-700"
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
              </div>

              <div className="text-center">
                <button
                  onClick={handleBackToDashboard}
                  className="text-gray-400 hover:text-white transition-colors underline"
                >
                  ← Back to Dashboard
                </button>
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}
