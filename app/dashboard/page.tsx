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
  isActive: boolean;
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

  // Load user's rooms with proper error handling
  const loadRooms = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      setError("");
      const res = await fetch("/api/room/list");

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to load rooms" }));
        throw new Error(errorData.error || "Failed to load rooms");
      }

      const data = await res.json();

      // FIXED: Ensure rooms is always an array with proper null/undefined checks
      let validRooms: Room[] = [];
      if (data && typeof data === "object") {
        if (Array.isArray(data.rooms)) {
          validRooms = data.rooms.filter(
            (room: Room) => room && typeof room === "object"
          );
        } else if (Array.isArray(data)) {
          validRooms = data.filter(
            (room: Room) => room && typeof room === "object"
          );
        }
      }
      setRooms(validRooms);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load rooms";
      console.error("Load rooms error:", err);
      setError(errorMessage);
      setRooms([]); // Always ensure it's an empty array on error
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

  // Create new room with proper validation
  const createRoom = useCallback(async () => {
    const roomName = prompt("Enter room name:")?.trim();
    if (!roomName || roomName.length === 0) {
      alert("Please enter a valid room name");
      return;
    }

    if (roomName.length > 100) {
      alert("Room name must be 100 characters or less");
      return;
    }

    setCreateLoading(true);
    setError("");

    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName }),
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to create room" }));
        throw new Error(errorData.error || "Failed to create room");
      }

      const data = await res.json();
      if (data?.room?.id) {
        router.push(`/dashboard/${data.room.id}`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create room";
      setError(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  }, [router]);

  // Join existing room with proper validation
  const joinRoom = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const code = joinCode?.trim().toUpperCase();
      if (!code || code.length === 0) {
        setError("Please enter a room code");
        return;
      }

      if (code.length !== 6) {
        setError("Room code must be exactly 6 characters");
        return;
      }

      setJoinLoading(true);
      setError("");

      try {
        // First, find room by code
        const roomRes = await fetch(`/api/room/by-code?code=${code}`);

        if (!roomRes.ok) {
          const errorData = await roomRes
            .json()
            .catch(() => ({ error: "Room not found" }));
          throw new Error(errorData.error || "Room not found");
        }

        const roomData = await roomRes.json();

        if (!roomData?.room?.id) {
          throw new Error("Invalid room data");
        }

        // Then join the session
        const joinRes = await fetch("/api/session/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: roomData.room.id }),
        });

        if (!joinRes.ok) {
          const errorData = await joinRes
            .json()
            .catch(() => ({ error: "Failed to join room" }));
          throw new Error(errorData.error || "Failed to join room");
        }

        // Navigate to quiz page
        router.push(`/quiz/${roomData.room.id}`);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to join room";
        setError(errorMessage);
      } finally {
        setJoinLoading(false);
      }
    },
    [joinCode, router]
  );

  // Delete room with confirmation
  const deleteRoom = useCallback(async (roomId: string, roomName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${roomName}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setError("");
      const res = await fetch(`/api/room/${roomId}`, { method: "DELETE" });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to delete room" }));
        throw new Error(errorData.error || "Failed to delete room");
      }

      // Remove from local state safely
      setRooms((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.filter((room) => room?.id !== roomId);
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete room";
      setError(errorMessage);
    }
  }, []);

  // Copy room code to clipboard
  const copyRoomCode = useCallback(async (code: string) => {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);

      // Show feedback
      const button = document.querySelector(
        `[data-copy-code="${code}"]`
      ) as HTMLButtonElement;
      if (button) {
        const original = button.textContent;
        button.textContent = "Copied!";
        button.classList.add("bg-green-600");

        setTimeout(() => {
          if (button) {
            button.textContent = original;
            button.classList.remove("bg-green-600");
          }
        }, 2000);
      }
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }, []);

  if (!isLoaded || loading) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    router.replace("/sign-in");
    return null;
  }

  // FIXED: Always ensure rooms is a safe array with proper checks
  const safeRooms = Array.isArray(rooms)
    ? rooms.filter((room) => room && typeof room === "object")
    : [];
  const roomsLength = safeRooms.length;
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
          <h1 className="text-5xl font-bold neon-text mb-4">
            QuizMaster Dashboard
          </h1>
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
            <button
              onClick={() => setError("")}
              className="mt-2 text-red-200 hover:text-white text-sm underline"
            >
              Dismiss
            </button>
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
            {createLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              "🎯 Create New Quiz"
            )}
          </NeonButton>

          <form onSubmit={joinRoom} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Enter room code..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-4 border border-gray-600 focus:border-neonCyan focus:outline-none text-center font-mono tracking-wider"
              disabled={joinLoading}
              maxLength={6}
              pattern="[A-Z0-9]{6}"
              title="Room code should be 6 characters (letters and numbers)"
            />
            <NeonButton
              type="submit"
              disabled={joinLoading || !joinCode.trim()}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-4"
            >
              {joinLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                "Join"
              )}
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
          <h2 className="text-3xl font-bold text-center mb-8">
            Your Quiz Rooms ({roomsLength})
          </h2>

          {roomsLength === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-xl text-gray-400 mb-4">No quiz rooms yet</p>
              <p className="text-gray-500">
                Create your first room to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {safeRooms.map((room) => {
                // FIXED: Safely handle room data with proper null checks
                if (!room || typeof room !== "object") return null;

                const {
                  id = "",
                  name = "Unnamed Room",
                  code = "----",
                  questionCount = 0,
                  timePerQuestion = 30,
                  createdAt = "",
                  isActive = true,
                } = room;

                if (!id) return null; // Skip rooms without valid IDs

                const formattedDate = createdAt
                  ? new Date(createdAt).toLocaleDateString()
                  : "Unknown";

                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    className={`
                      bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border p-6 hover:border-neonPink transition-all duration-300
                      ${
                        isActive
                          ? "border-gray-600"
                          : "border-red-600 opacity-75"
                      }
                    `}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-neonCyan truncate pr-2">
                        {name}
                      </h3>
                      <div className="flex gap-2">
                        {!isActive && (
                          <span className="text-red-400 text-xs bg-red-900 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                        <button
                          onClick={() => deleteRoom(id, name)}
                          className="text-red-400 hover:text-red-300 text-sm opacity-70 hover:opacity-100 transition-opacity"
                          aria-label="Delete room"
                          title="Delete room"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6 text-sm text-gray-300">
                      <p className="flex justify-between">
                        <span className="font-semibold">Code:</span>
                        <span className="font-mono text-neonPink">{code}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="font-semibold">Questions:</span>
                        <span>{questionCount}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="font-semibold">Time per Q:</span>
                        <span>{timePerQuestion}s</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="font-semibold">Created:</span>
                        <span>{formattedDate}</span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <NeonButton
                        onClick={() => router.push(`/dashboard/${id}`)}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 text-sm"
                        disabled={!isActive}
                      >
                        {isActive ? "Manage" : "View"}
                      </NeonButton>

                      <button
                        onClick={() => copyRoomCode(code)}
                        data-copy-code={code}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 text-sm rounded-lg transition-colors"
                        disabled={!code || code === "----"}
                        title="Copy room code"
                      >
                        Copy Code
                      </button>
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
          <div className="mt-4 text-xs">
            <span className="text-green-400">🟢</span> Active rooms can host
            quizzes •<span className="text-red-400 ml-2">🔴</span> Inactive
            rooms are archived
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
