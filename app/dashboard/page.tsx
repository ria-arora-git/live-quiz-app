"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSocket from "@/lib/useSocket";

export default function DashboardPage() {
  const [roomCode, setRoomCode] = useState("");
  const [participants, setParticipants] = useState<any[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);

  const router = useRouter();

  // Host Create Room
  const handleCreateRoom = async () => {
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json();
      router.push(`/dashboard/${data.room.id}`); // Go to host room dashboard
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Participant Join Room
  const joinRoom = async () => {
    if (!roomCode.trim()) {
      alert("Enter a room code");
      return;
    }
    try {
      // 1. Find room by code
      const roomRes = await fetch(`/api/room/by-code?code=${roomCode}`);
      if (!roomRes.ok) throw new Error("Room not found");
      const { room } = await roomRes.json();

      // 2. Try to join active session
      const joinRes = await fetch("/api/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id }),
      });

      if (joinRes.ok) {
        const { sessionId } = await joinRes.json();
        setSessionId(sessionId);
      } else {
        setSessionId(null); // quiz hasn't started yet
      }

      // 3. Show waiting view
      setJoinedRoomId(room.id);
      setWaiting(true);

      // 4. Connect to socket updates
      useSocket(
        room.id,
        (updated) => setParticipants(updated),
        undefined, // quizEnded not needed here
        (data) => {
          // When quiz starts, redirect
          const sid = data.sessionId || sessionId;
          router.push(`/quiz/${room.id}?sessionId=${sid}`);
        }
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* CREATE ROOM */}
        {!waiting && (
          <section className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Host a Quiz</h2>
            <p className="text-gray-400 mb-4">
              Create a new room and invite participants using a join code.
            </p>
            <button
              onClick={handleCreateRoom}
              className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-semibold"
            >
              Create Room
            </button>
          </section>
        )}

        {/* JOIN ROOM */}
        {!waiting && (
          <section className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Join a Room</h2>
            <p className="text-gray-400 mb-4">Enter the room code to join the quiz.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Room Code"
                maxLength={6}
                className="flex-1 px-3 py-2 rounded bg-gray-900 text-white border border-gray-700"
              />
              <button
                onClick={joinRoom}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded font-semibold"
              >
                Join Room
              </button>
            </div>
          </section>
        )}

        {/* WAITING ROOM */}
        {waiting && (
          <section className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Waiting Room</h2>
            {participants.length === 0 ? (
              <p className="text-gray-400">No participants yet...</p>
            ) : (
              <ul className="divide-y divide-gray-700 max-h-64 overflow-y-auto">
                {participants.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between py-2 hover:bg-gray-900 px-2 rounded"
                  >
                    <span>{p.name || p.email || "Anonymous"}</span>
                    <span className="text-xs text-gray-400">Joined</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-gray-400 text-sm">
              Waiting for host to start the quiz… you’ll be redirected automatically.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
