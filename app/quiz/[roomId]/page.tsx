"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import useSocket from "@/lib/useSocket";
import QuizQuestion from "@/components/QuizQuestion";
import type { Question } from "@prisma/client";

export default function QuizPage({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizOver, setQuizOver] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isHost = session?.room?.createdBy === user?.id;

  useSocket(
    roomId,
    (updated) => setParticipants(updated),
    (payload) => { // quizEnded event
      setQuizOver(true);
      setLeaderboard(payload.leaderboard);
      setUserStats(payload.userStats);
    },
    (data) => { // quizStarted event
      loadQuizData();
    }
  );

  const loadQuizData = useCallback(async () => {
    try {
      let url = `/api/session/active?roomId=${roomId}`;
      if (sessionId) url += `&sessionId=${sessionId}`;
      const res = await fetch(url);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setParticipants(data.session.participants);
      setCurrentIndex(data.session.currentIndex);

      const qRes = await fetch(`/api/question/list?roomId=${roomId}`);
      setQuestions(await qRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [roomId, sessionId]);

  useEffect(() => {
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    loadQuizData();
  }, [isSignedIn, loadQuizData, router]);

  if (loading) return <div className="p-6 text-white">Loading quiz...</div>;
  if (!session) {
    return (
      <div className="p-6 text-white text-center">
        Waiting for host to start the quiz...
      </div>
    );
  }

  const handleAnswerSubmit = async (selectedOption: string, timeLeft: number) => {
    if (!session || quizOver || isHost) return;
    const question = questions[currentIndex];
    const res = await fetch("/api/question/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        questionId: question.id,
        selectedOption,
        timeLeft,
      }),
    });
    const result = await res.json();
    if (result.correct) setScore((prev) => prev + result.points);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setQuizOver(true);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-6 text-white space-y-6">
      <header className="flex justify-between bg-gray-800 p-4 rounded-lg">
        <div>
          <h1 className="text-2xl font-bold">Room {roomId}</h1>
          <p>
            {!quizOver
              ? `Question ${currentIndex + 1} of ${questions.length}`
              : "Quiz Over"}
          </p>
        </div>
        {!isHost && <div>Your Score: {score}</div>}
      </header>

      {!quizOver && !isHost && questions[currentIndex] && (
        <QuizQuestion
          key={questions[currentIndex].id}
          question={questions[currentIndex]}
          timeLimit={session.room.timePerQuestion}
          onAnswer={handleAnswerSubmit}
        />
      )}

      {isHost && !quizOver && (
        <section className="bg-gray-800 p-4 rounded-lg">
          <h2 className="font-bold mb-2">Live Participants</h2>
          {participants.length === 0 ? <p>No participants yet.</p> : (
            <ul>
              {participants.map((p) => {
                const points = session.results.find((r: any) => r.userId === p.clerkId)?.score || 0;
                return (
                  <li key={p.id} className="flex justify-between border-b border-gray-700 py-1">
                    <span>{p.name || p.email || "Anonymous"}</span>
                    <span>{points} pts</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {quizOver && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-bold mb-3">Final Leaderboard</h3>
          <ol className="list-decimal list-inside">
            {leaderboard.map((p, i) => (
              <li key={p.userId}>
                {p.name} - {p.score} pts
              </li>
            ))}
          </ol>
          {userStats && (
            <div className="mt-4">
              <h4 className="font-semibold">Your Stats</h4>
              <p>Score: {userStats.score}</p>
              <p>Correct Answers: {userStats.correct}</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
