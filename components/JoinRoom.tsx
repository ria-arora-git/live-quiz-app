"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      alert("Please enter a room code");
      return;
    }

    setLoading(true);
    try {
      const roomRes = await fetch(`/api/room/by-code?code=${roomCode}`);
      if (!roomRes.ok) throw new Error("Room not found");
      const { room } = await roomRes.json();

      const joinRes = await fetch("/api/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id }),
      });

      if (!joinRes.ok) throw new Error("Could not join active session yet");

      const { sessionId } = await joinRes.json();
      router.push(`/quiz/${room.id}?sessionId=${sessionId}`);
    } catch (err: any) {
      alert(err.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col gap-4">
      <input
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        maxLength={6}
        placeholder="Enter Room Code"
        className="px-3 py-2 rounded bg-gray-900 text-white border border-gray-700"
      />
      <button
        disabled={loading}
        onClick={handleJoin}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 px-4 py-2 rounded text-white font-semibold"
      >
        {loading ? "Joining..." : "Join Room"}
      </button>
    </div>
  );
}
