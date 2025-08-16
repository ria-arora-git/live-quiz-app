"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import useSocket from "@/lib/useSocket";
import QuizQuestion from "@/components/QuizQuestion";
import QuizTimer from "@/components/QuizTimer";
import Leaderboard from "@/components/Leaderboard";
import LoadingSpinner from "@/components/LoadingSpinner";
import NeonButton from "@/components/NeonButton";

interface Question {
  id: string;
  text: string;
  options: string[];
  answer?: string;
  index: number;
  total: number;
}

interface QuizSession {
  id: string;
  roomId: string;
  participants: any[];
  currentIndex: number;
  isActive: boolean;
  room: {
    name: string;
    code: string;
    createdBy: string;
    timePerQuestion: number;
  };
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
}

interface QuizStartData {
  sessionId?: string;
  question: Question;
  timePerQuestion: number;
}

interface UseSocketEvents {
  onParticipantsUpdate?: (participants: any[]) => void;
  onQuizStart?: (data: any) => void;
  onQuizState?: (data: any) => void;
  onQuestionChange?: (data: any) => void;
  onAnswerSubmitted?: (data: any) => void;
  onQuizEnd?: (data: any) => void;
  onLeaderboardUpdate?: (data: any) => void;
  onTimeUp?: () => void;
  onError?: (msg: string) => void;
}

export default function QuizPage({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("sessionId") ?? null;

  const [session, setSession] = useState<QuizSession | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userScore, setUserScore] = useState<number>(0);
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [quizEnded, setQuizEnded] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState<boolean>(false);

  const isHost = session?.room?.createdBy === user?.id;

  const socket = useSocket(
    roomId,
    user?.id,
    user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? undefined,
    {
      onParticipantsUpdate: (updated: any[]) => {
        setParticipants(Array.isArray(updated) ? updated : []);
      },

      onQuizStart: (data: { sessionId?: string }) => {
        const quizData = data as QuizStartData;
        setQuizStarted(true);
        setQuizEnded(false);
        setCurrentQuestion(quizData.question);
        setTimeLeft(quizData.timePerQuestion);
        setQuestionStartTime(Date.now());
        setHasAnswered(false);
        setShowCorrectAnswer(false);
      },

      onQuizState: (data: { isActive?: boolean; question?: Question; timePerQuestion?: number }) => {
        if (data?.isActive && data.question) {
          setQuizStarted(true);
          setCurrentQuestion(data.question);
          setTimeLeft(data.timePerQuestion ?? 0);
          setQuestionStartTime(Date.now());
          setHasAnswered(false);
          setShowCorrectAnswer(false);
        }
      },

      onQuestionChange: (data: { question?: Question; timePerQuestion?: number }) => {
        if (data?.question) {
          setCurrentQuestion(data.question);
          setTimeLeft(data.timePerQuestion ?? 0);
          setQuestionStartTime(Date.now());
          setHasAnswered(false);
          setShowCorrectAnswer(false);
        }
      },

      onTimeUp: () => {
        setTimeLeft(0);
        setShowCorrectAnswer(true);
      },

      onQuizEnd: (payload: { leaderboard?: LeaderboardEntry[] }) => {
        setQuizEnded(true);
        setQuizStarted(false);
        setLeaderboard(Array.isArray(payload.leaderboard) ? payload.leaderboard : []);
      },

      onAnswerSubmitted: (data: { totalScore?: number }) => {
        setUserScore(data?.totalScore ?? 0);
        setHasAnswered(true);
      },

      onLeaderboardUpdate: (leaderboardData: LeaderboardEntry[]) => {
        setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
      },
    } as UseSocketEvents
  );

  const loadQuizData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let url = `/api/session/active?roomId=${roomId}`;
      if (sessionId) url += `&sessionId=${sessionId}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Quiz session not found");
      const data = await res.json();

      setSession(data.session ?? null);
      setParticipants(Array.isArray(data.session?.participants) ? data.session.participants : []);
      if (data.session?.isActive) setQuizStarted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error loading quiz");
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

  const handleAnswerSubmit = useCallback(
    (selectedOption: string, currentTimeLeft: number) => {
      if (!session || !currentQuestion || quizEnded || isHost || hasAnswered || !socket) return;
      socket.submitAnswer({
        roomId,
        questionId: currentQuestion.id,
        selectedOption,
        userId: user?.id,
        timeLeft: currentTimeLeft,
      });
    },
    [session, currentQuestion, quizEnded, isHost, hasAnswered, socket, roomId, user?.id]
  );

  const handleStartQuiz = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/room/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          timePerQuestion: session.room.timePerQuestion,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to start quiz" }));
        throw new Error(errorData.error || "Failed to start quiz");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to start quiz");
    }
  }, [session, roomId]);

  const handleNextQuestion = useCallback(() => {
    if (!socket) return;
    socket.startQuiz({ roomId });
  }, [socket, roomId]);

  const handleEndQuiz = useCallback(() => {
    if (!socket) return;
    socket.endQuiz({ roomId });
  }, [socket, roomId]);

  useEffect(() => {
    if (!quizStarted || quizEnded || timeLeft <= 0 || !questionStartTime) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (questionStartTime ?? 0)) / 1000);
      const remaining = Math.max(0, (session?.room.timePerQuestion ?? 30) - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, quizEnded, questionStartTime, session?.room.timePerQuestion]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Quiz Not Available</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <NeonButton onClick={() => router.push("/dashboard")}>Back to Dashboard</NeonButton>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
        <LoadingSpinner text="Loading Quiz..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto px-6 py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-lg p-6 mb-8 border border-purple-500"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold neon-text mb-2">{session.room.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <span>Room: {session.room.code}</span>
                <span>Participants: {participants.length}</span>
                {quizStarted && currentQuestion && (
                  <span>
                    Question {currentQuestion.index + 1} of {currentQuestion.total}
                  </span>
                )}
                {quizEnded && <span className="text-yellow-400">Quiz Completed</span>}
              </div>
            </div>
            {!isHost && !quizEnded && (
              <div className="bg-black bg-opacity-30 rounded-lg px-4 py-2">
                <span className="text-neonCyan font-bold text-xl">{userScore}</span>
                <span className="text-gray-400 ml-2">points</span>
              </div>
            )}
          </div>
        </motion.header>
        <div className="max-w-4xl mx-auto">
          {!quizStarted && !quizEnded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center bg-gray-800 rounded-lg p-8 border border-gray-600"
            >
              {isHost ? (
                <div>
                  <h2 className="text-3xl font-bold text-neonPink mb-4">Ready to Start?</h2>
                  <p className="text-gray-400 mb-6">
                    {participants.length} participant(s) joined. Click start when ready.
                  </p>
                  <div className="space-y-4">
                    <NeonButton onClick={handleStartQuiz} className="px-8 py-3 bg-green-500 text-black">
                      Start Quiz
                    </NeonButton>
                    {participants.length === 0 && (
                      <p className="text-yellow-400 text-sm">💡 Share room code {session.room.code} to invite participants</p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="animate-pulse text-6xl mb-6">⏳</div>
                  <h2 className="text-3xl font-bold text-neonCyan mb-4">Get Ready!</h2>
                  <p className="text-gray-400">Waiting for the host to start the quiz...</p>
                </div>
              )}
            </motion.div>
          )}
          {quizStarted && !quizEnded && currentQuestion && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <QuizTimer key={`${currentQuestion.id}-timer`} seconds={timeLeft} onTimeUp={() => {}} />
                </div>
                {!isHost && (
                  <QuizQuestion
                    question={currentQuestion}
                    onAnswer={handleAnswerSubmit}
                    disabled={hasAnswered || timeLeft <= 0}
                    timeLeft={timeLeft}
                    // showCorrectAnswer={showCorrectAnswer}
                  />
                )}
                {isHost && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-neonPink mb-4">Current Question</h3>
                      <div className="bg-gray-900 rounded-lg p-4 mb-4">
                        <p className="text-lg font-medium mb-4">{currentQuestion.text}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {currentQuestion.options.map((option, index) => (
                            <div key={index} className="bg-gray-700 rounded px-3 py-2 text-sm">
                              {String.fromCharCode(65 + index)}) {option}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={handleNextQuestion}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                      >
                        Next Question
                      </button>
                      <button
                        onClick={handleEndQuiz}
                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
                      >
                        End Quiz
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
          {quizStarted && !quizEnded && leaderboard.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
              <Leaderboard entries={leaderboard} title="Live Leaderboard" showRanks maxEntries={5} />
            </motion.div>
          )}
          {quizEnded && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {!isHost && (
                <div className="bg-gradient-to-r from-green-900 to-blue-900 rounded-lg p-6 border border-green-500 text-center">
                  <h2 className="text-3xl font-bold text-green-400 mb-4">Quiz Complete!</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-3xl font-bold text-neonCyan">{userScore}</div>
                      <div className="text-gray-300">Total Points</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-yellow-400">
                        {currentQuestion ? Math.round((userScore / currentQuestion.total) * 100) : 0}%
                      </div>
                      <div className="text-gray-300">Accuracy</div>
                    </div>
                  </div>
                </div>
              )}
              <Leaderboard entries={leaderboard} title="Final Results" showRanks />
              <div className="text-center space-y-4">
                <NeonButton onClick={() => router.push("/dashboard")} className="px-8 py-3">
                  Back to Dashboard
                </NeonButton>
                {isHost && (
                  <button
                    onClick={() => window.location.reload()}
                    className="ml-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Start New Quiz
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
