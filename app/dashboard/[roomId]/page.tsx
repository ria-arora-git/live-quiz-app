"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import useSocket from "@/lib/useSocket";
import AddQuestionForm from "@/components/AddQuestionForm";

export default function RoomDashboard({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  const [room, setRoom] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState(10);

  const isHost = room?.createdBy === user?.id;

  useSocket(
    roomId,
    (updated) => setParticipants(updated)
    // No quizEnd or quizStart callbacks needed here for host dashboard
  );

  useEffect(() => {
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    const loadData = async () => {
      try {
        const res = await fetch(`/api/room/${roomId}`);
        if (!res.ok) throw new Error("Room not found");
        const data = await res.json();
        setRoom(data.room);
        setQuestionCount(data.room.questionCount);
        setTimePerQuestion(data.room.timePerQuestion);

        const qRes = await fetch(`/api/question/list?roomId=${roomId}`);
        setQuestions(await qRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isSignedIn, roomId, router]);

  const updateSettings = async () => {
    try {
      const res = await fetch("/api/room/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, questionCount, timePerQuestion }),
      });
      if (!res.ok) throw new Error("Could not update room");
      alert("Settings saved!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startQuiz = async () => {
    try {
      const res = await fetch("/api/room/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, questionCount, timePerQuestion }),
      });
      if (!res.ok) throw new Error("Could not start quiz");
      alert("Quiz started!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const endQuiz = async () => {
    if (!confirm("End quiz for all participants?")) return;
    await fetch("/api/quiz/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    alert("Quiz ended.");
  };

  if (loading) return <div className="p-6 text-white">Loading...</div>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6 text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:justify-between items-start bg-gray-800 p-5 rounded-lg shadow-lg gap-4 sm:gap-0">
          <div>
            <h1 className="text-3xl font-bold">{room?.name}</h1>
            <p className="text-gray-400">
              Room Code: <span className="font-mono text-neonCyan">{room?.code}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(room.code);
                alert("Room code copied!");
              }}
              className="bg-neonCyan hover:bg-cyan-500 text-black px-4 py-2 rounded-lg"
            >
              Copy Code
            </button>
            <button
              onClick={endQuiz}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg"
            >
              End Quiz
            </button>
          </div>
        </header>

        {/* SETTINGS */}
        {isHost && (
          <section className="bg-gray-800 p-5 rounded-lg shadow space-y-4">
            <h2 className="text-xl font-semibold">Quiz Settings</h2>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block mb-1">Number of Questions</label>
                <input
                  type="number"
                  min={1}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="bg-gray-900 text-white rounded px-3 py-2 w-32"
                />
              </div>
              <div>
                <label className="block mb-1">Time per Question (seconds)</label>
                <input
                  type="number"
                  min={5}
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
                  className="bg-gray-900 text-white rounded px-3 py-2 w-36"
                />
              </div>
            </div>
            <button
              onClick={updateSettings}
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg"
            >
              Save Settings
            </button>
          </section>
        )}

        {/* START QUIZ */}
        {isHost && (
          <section className="bg-gray-800 p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">Control Quiz</h2>
            <button
              onClick={startQuiz}
              className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg"
            >
              Start Quiz
            </button>
          </section>
        )}

        {/* PARTICIPANTS WAITING VIEW */}
        <section className="bg-gray-800 p-5 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Participants ({participants.length})
          </h2>
          {participants.length === 0 ? (
            <p className="text-gray-400">No participants yet...</p>
          ) : (
            <ul className="divide-y divide-gray-700 max-h-64 overflow-y-auto">
              {participants.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <span>{p.name || p.email || "Anonymous"}</span>
                  <span className="text-sm text-gray-400">Joined</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ADD QUESTIONS */}
        {isHost && (
          <section className="bg-gray-800 p-5 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3">Add Questions</h2>
            <AddQuestionForm
              roomId={room.id}
              onAdded={(q) => setQuestions((prev) => [...prev, q])}
            />
            <h3 className="mt-4 font-semibold">Current Questions</h3>
            {questions.length === 0 ? (
              <p className="text-gray-400">No questions yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {questions.map((q, i) => (
                  <li key={q.id} className="bg-gray-900 px-3 py-2 rounded">
                    {i + 1}. {q.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
