"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function RoomJoinForm() {
  const { user } = useUser();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setError("");
    if (code.length !== 6) {
      setError("Room code must be 6 characters.");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/quiz/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: code.toUpperCase() }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to join room.");
        return;
      }
      
      router.push(`/quiz/${code.toUpperCase()}`);
    } catch {
      setError("Error joining room. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={joinRoom} className="space-y-4">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        className="w-full p-3 rounded bg-transparent border border-neonPink text-white text-center text-xl font-orbitron tracking-widest outline-none focus:border-neonCyan transition"
        placeholder="ABC123"
        disabled={isLoading}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button 
        type="submit" 
        className="w-full bg-neonPink py-3 font-bold text-black rounded hover:bg-pink-600 transition disabled:opacity-50"
        disabled={isLoading || !user}
      >
        {isLoading ? "Joining..." : "Join Room"}
      </button>
    </form>
  );
}
