"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import NeonButton from "@/components/NeonButton";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Room {
  id: string;
  code: string;
  name: string;
  createdBy: string;
  questionCount: number;
  timePerQuestion: number;
  createdAt: string;
}

export default function Dashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // Load user's rooms
  const loadRooms = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      setError("");
      const res = await fetch("/api/room/list");
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to load rooms" }));
        throw new Error(errorData.error || "Failed to load rooms");
      }
      
      const data = await res.json();
      const validRooms = Array.isArray(data?.rooms) ? data.rooms : [];
      setRooms(validRooms);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load rooms";
      console.error("Load rooms error:", err);
      setError(errorMessage);
      setRooms([]); // Ensure rooms is always an array
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    loadRooms();
  }, [isLoaded, isSignedIn, loadRooms, router]);

  // Create new room
  const createRoom = useCallback(async () => {
    const roomName = prompt("Enter room name:")?.trim();
    if (!roomName) return;

    setCreateLoading(true);
    setError("");

    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to create room" }));
        throw new Error(errorData.error || "Failed to create room");
      }

      const data = await res.json();
      if (data?.room?.id) {
        router.push(`/dashboard/${data.room.id}`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create room";
      setError(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  }, [router]);

  // Join existing room
  const joinRoom = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = joinCode?.trim();
    if (!code) {
      setError("Please enter a room code");
      return;
    }

    setJoinLoading(true);
    setError("");

    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to join room" }));
        throw new Error(errorData.error || "Room not found");
      }

      const data = await res.json();
      if (data?.room?.id) {
        router.push(`/dashboard/${data.room.id}`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to join room";
      setError(errorMessage);
    } finally {
      setJoinLoading(false);
    }
  }, [joinCode, router]);

  // Delete room
  const deleteRoom = useCallback(async (roomId: string, roomName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${roomName}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setError("");
      const res = await fetch(`/api/room/${roomId}`, { method: "DELETE" });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to delete room" }));
        throw new Error(errorData.error || "Failed to delete room");
      }

      // Remove from local state
      setRooms(prev => (prev || []).filter(room => room.id !== roomId));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete room";
      setError(errorMessage);
    }
  }, []);

  if (!isLoaded || loading) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    router.replace("/sign-in");
    return null;
  }

  const roomsLength = rooms?.length ?? 0;
  const userName = user?.firstName || user?.fullName || "User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold neon-text mb-4">QuizMaster Dashboard</h1>
          <p className="text-xl text-gray-300">Welcome back, {userName}!</p>
        </motion.header>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-700 bg-opacity-30 border border-red-600 rounded-lg p-4 mb-6 max-w-2xl mx-auto text-center"
          >
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12 max-w-2xl mx-auto"
        >
          <NeonButton
            onClick={createRoom}
            disabled={createLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 py-4 text-lg font-semibold"
          >
            {createLoading ? "Creating..." : "🎯 Create New Quiz"}
          </NeonButton>

          <form onSubmit={joinRoom} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Enter room code..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-4 border border-gray-600 focus:border-neonCyan focus:outline-none text-center font-mono"
              disabled={joinLoading}
              maxLength={6}
            />
            <NeonButton
              type="submit"
              disabled={joinLoading || !joinCode.trim()}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-4"
            >
              {joinLoading ? "..." : "Join"}
            </NeonButton>
          </form>
        </motion.div>

        {/* Rooms List */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-8">Your Quiz Rooms ({roomsLength})</h2>

          {roomsLength === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-xl text-gray-400 mb-4">No quiz rooms yet</p>
              <p className="text-gray-500">Create your first room to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => {
                const { id, name, code, questionCount, timePerQuestion, createdAt } = room || {};
                const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString() : "Unknown";
                
                return (
                  <motion.div
                    key={id || Math.random()}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-600 p-6 hover:border-neonPink transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-neonCyan truncate">
                        {name || "Unnamed Room"}
                      </h3>
                      <button
                        onClick={() => deleteRoom(id, name || "Unnamed Room")}
                        className="text-red-400 hover:text-red-300 text-sm opacity-70 hover:opacity-100 transition-opacity"
                        aria-label="Delete room"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="space-y-2 mb-6 text-sm text-gray-300">
                      <p>
                        <span className="font-semibold">Code:</span>{" "}
                        <span className="font-mono text-neonPink">{code || "----"}</span>
                      </p>
                      <p>
                        <span className="font-semibold">Questions:</span> {questionCount || 0}
                      </p>
                      <p>
                        <span className="font-semibold">Time per Q:</span> {timePerQuestion || 30}s
                      </p>
                      <p>
                        <span className="font-semibold">Created:</span> {formattedDate}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <NeonButton
                        onClick={() => router.push(`/dashboard/${id}`)}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 text-sm"
                      >
                        Manage
                      </NeonButton>
                      <NeonButton
                        onClick={() => {
                          if (code) {
                            navigator.clipboard.writeText(code).catch(() => {
                              // Fallback
                              const textArea = document.createElement("textarea");
                              textArea.value = code;
                              document.body.appendChild(textArea);
                              textArea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textArea);
                            });
                          }
                        }}
                        className="bg-gray-700 hover:bg-gray-600 px-3 py-2 text-sm"
                        disabled={!code}
                      >
                        Copy Code
                      </NeonButton>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-16 text-gray-500"
        >
          <p>Ready to create engaging quizzes? Start by creating a new room!</p>
        </motion.footer>
      </div>
    </div>
  );
}