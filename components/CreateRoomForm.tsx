"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function CreateRoomForm() {
  const { user } = useUser();
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setMessage("");
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/quiz/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, createdBy: user.id }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Error creating room");
      } else {
        setMessage(`Room created! Code: ${data.code}`);
        setName("");
        // Auto-join the created room
        setTimeout(() => {
          router.push(`/quiz/${data.code}`);
        }, 1500);
      }
    } catch {
      setMessage("Error creating room. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={createRoom} className="space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Room Name"
        className="w-full p-3 rounded bg-transparent border border-neonPink text-white outline-none focus:border-neonCyan transition"
        required
        disabled={isLoading}
      />
      <button 
        type="submit" 
        className="w-full bg-neonPink py-3 font-bold text-black rounded hover:bg-pink-600 transition disabled:opacity-50"
        disabled={isLoading || !user}
      >
        {isLoading ? "Creating..." : "Create Room"}
      </button>
      {message && (
        <p className={`mt-2 text-sm ${message.includes("Error") ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
