"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface StartQuizFormProps {
  roomId: string;
}

export default function StartQuizForm({ roomId }: StartQuizFormProps) {
  const router = useRouter();
  const [timePerQuestion, setTimePerQuestion] = useState(10);
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!roomId) {
      alert("Missing Room ID");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/room/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, timePerQuestion, questionCount }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start quiz");
      }

      const data = await res.json();
      const sessionId = data.session.id;

      // ✅ Directly navigate host into quiz page using new sessionId
      router.push(`/quiz/${roomId}?sessionId=${sessionId}`);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div>
          <label className="block mb-1">Time per question (seconds)</label>
          <input
            type="number"
            value={timePerQuestion}
            min={5}
            onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
            className="bg-gray-900 text-white rounded px-3 py-2 w-32"
          />
        </div>
        <div>
          <label className="block mb-1">Question Count</label>
          <input
            type="number"
            value={questionCount}
            min={1}
            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            className="bg-gray-900 text-white rounded px-3 py-2 w-32"
          />
        </div>
      </div>
      <button
        onClick={handleStart}
        disabled={loading}
        className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded px-5 py-2"
      >
        {loading ? "Starting..." : "Start Quiz"}
      </button>
    </div>
  );
}
