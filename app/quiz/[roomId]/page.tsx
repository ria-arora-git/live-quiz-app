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
        console.log("👥 Participants updated:", updated);
        // FIXED: Always ensure it's a safe array
        const safeParticipants = Array.isArray(updated) ? updated.filter(p => p && typeof p === 'object') : [];
        setParticipants(safeParticipants);
      },

      onQuizStart: (data: any) => {
        console.log("🚀 Quiz started:", data);
        const quizData = data as QuizStartData;
        if (quizData?.question) {
          setQuizStarted(true);
          setQuizEnded(false);
          setCurrentQuestion(quizData.question);
          setTimeLeft(quizData.timePerQuestion || 30);
          setQuestionStartTime(Date.now());
          setHasAnswered(false);
          setShowCorrectAnswer(false);
        }
      },

      onQuizState: (data: any) => {
        console.log("📊 Quiz state:", data);
        if (data?.isActive && data.question) {
          setQuizStarted(true);
          setCurrentQuestion(data.question);
          setTimeLeft(data.timePerQuestion ?? 30);
          setQuestionStartTime(Date.now());
          setHasAnswered(false);
          setShowCorrectAnswer(false);
        }
      },

      onQuestionChange: (data: any) => {
        console.log("🔄 Question changed:", data);
        if (data?.question) {
          setCurrentQuestion(data.question);
          setTimeLeft(data.timePerQuestion ?? 30);
          setQuestionStartTime(Date.now());
          setHasAnswered(false);
          setShowCorrectAnswer(false);
        }
      },

      onTimeUp: () => {
        console.log("⏰ Time up!");
        setTimeLeft(0);
        setShowCorrectAnswer(true);
      },

      onQuizEnd: (payload: any) => {
        console.log("🏁 Quiz ended:", payload);
        setQuizEnded(true);
        setQuizStarted(false);

        // FIXED: Safe handling of leaderboard and userStats
        let finalLeaderboard: LeaderboardEntry[] = [];
        if (payload?.leaderboard && Array.isArray(payload.leaderboard)) {
          finalLeaderboard = payload.leaderboard.filter((entry: LeaderboardEntry) => entry && typeof entry === 'object');

        }
        setLeaderboard(finalLeaderboard);

        // FIXED: Safe handling of userStats with proper checks
        if (user?.id && payload?.userStats && typeof payload.userStats === 'object') {
          const userStat = payload.userStats[user.id];
          if (userStat && typeof userStat === 'object' && typeof userStat.score === 'number') {
            setUserScore(userStat.score);
          }
        }
      },

      onAnswerSubmitted: (data: any) => {
        console.log("✅ Answer submitted:", data);
        setUserScore(data?.totalScore ?? data?.score ?? 0);
        setHasAnswered(true);
      },

      onLeaderboardUpdate: (leaderboardData: any) => {
        console.log("🏆 Leaderboard updated:", leaderboardData);
        // FIXED: Safe leaderboard handling
        const safeLeaderboard = Array.isArray(leaderboardData) 
          ? leaderboardData.filter(entry => entry && typeof entry === 'object')
          : [];
        setLeaderboard(safeLeaderboard);
      },

      onError: (error: string) => {
        console.error("❌ Socket error:", error);
        setError(error);
      },
    }
  );

  const loadQuizData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let url = `/api/session/active?roomId=${roomId}`;
      if (sessionId) url += `&sessionId=${sessionId}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Quiz session not found");
      }

      const data = await res.json();

      if (data?.session) {
        setSession(data.session);

        // FIXED: Safely set participants with proper array checks
        let sessionParticipants: any[] = [];
        if (data.session.participants) {
          if (Array.isArray(data.session.participants)) {
            sessionParticipants = data.session.participants.filter((p: any) => p && typeof p === 'object');
          }
        }
        setParticipants(sessionParticipants);

        if (data.session.isActive) {
          setQuizStarted(true);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error loading quiz";
      setError(errorMessage);
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
    async (selectedOption: string, currentTimeLeft: number) => {
      if (!session || !currentQuestion || quizEnded || isHost || hasAnswered || !socket) {
        return;
      }

      try {
        // Submit via API first
        const res = await fetch("/api/question/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            questionId: currentQuestion.id,
            selectedOption,
            timeLeft: currentTimeLeft,
          }),
        });

        if (res.ok) {
          const result = await res.json();
          setUserScore((prev) => prev + (result.points || 0));
          setHasAnswered(true);

          // Also notify via socket for real-time updates
          socket.submitAnswer({
            roomId,
            questionId: currentQuestion.id,
            selectedOption,
            userId: user?.id,
            timeLeft: currentTimeLeft,
          });
        }
      } catch (error) {
        console.error("Error submitting answer:", error);
      }
    },
    [session, currentQuestion, quizEnded, isHost, hasAnswered, socket, roomId, user?.id]
  );

  const handleStartQuiz = useCallback(async () => {
    if (!session || !isHost) return;

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

      const data = await res.json();

      // Notify all clients via socket
      if (socket && data?.session?.id) {
        socket.startQuiz({
          roomId,
          sessionId: data.session.id,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start quiz";
      setError(errorMessage);
    }
  }, [session, roomId, socket, isHost]);

  const handleNextQuestion = useCallback(() => {
    if (!socket || !isHost) return;
    socket.nextQuestion({ roomId });
  }, [socket, roomId, isHost]);

  const handleEndQuiz = useCallback(async () => {
    if (!socket || !isHost) return;

    try {
      // End quiz via API
      const res = await fetch("/api/quiz/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });

      if (res.ok) {
        // Socket will handle broadcasting the end event
        socket.endQuiz({ roomId });
      }
    } catch (error) {
      console.error("Error ending quiz:", error);
      // Still try to end via socket
      socket.endQuiz({ roomId });
    }
  }, [socket, roomId, isHost]);

  // Timer effect
  useEffect(() => {
    if (!quizStarted || quizEnded || timeLeft <= 0 || !questionStartTime) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (questionStartTime ?? 0)) / 1000);
      const remaining = Math.max(0, (session?.room.timePerQuestion ?? 30) - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        setShowCorrectAnswer(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, quizEnded, questionStartTime, session?.room.timePerQuestion]);

  if (loading) return <LoadingSpinner />;

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Quiz Not Available</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <NeonButton onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </NeonButton>
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

  // FIXED: Always ensure arrays are safe with proper filtering
  const safeParticipants = Array.isArray(participants) 
    ? participants.filter(p => p && typeof p === 'object')
    : [];
  const safeLeaderboard = Array.isArray(leaderboard)
    ? leaderboard.filter(entry => entry && typeof entry === 'object')
    : [];
    
  const participantsLength = safeParticipants.length;
  const leaderboardLength = safeLeaderboard.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-lg p-6 mb-8 border border-purple-500"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold neon-text mb-2">
                {session.room?.name || "Quiz Room"}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <span>Room: {session.room?.code || "N/A"}</span>
                <span>Participants: {participantsLength}</span>
                {quizStarted && currentQuestion && (
                  <span>
                    Question {(currentQuestion.index ?? 0) + 1} of{" "}
                    {currentQuestion.total ?? 0}
                  </span>
                )}
                {quizEnded && <span className="text-yellow-400">Quiz Completed</span>}
                {socket && (
                  <span
                    className={`text-xs ${
                      socket.isConnected() ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {socket.isConnected() ? "🟢 Live" : "🔴 Offline"}
                  </span>
                )}
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
          {/* Waiting for Quiz to Start */}
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
                    {participantsLength} participant(s) joined. Click start when ready.
                  </p>
                  <div className="space-y-4">
                    <NeonButton
                      onClick={handleStartQuiz}
                      className="px-8 py-3 bg-green-500 text-black"
                    >
                      Start Quiz
                    </NeonButton>
                    {participantsLength === 0 && (
                      <p className="text-yellow-400 text-sm">
                        💡 Share room code {session.room?.code} to invite participants
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="animate-pulse text-6xl mb-6">⏳</div>
                  <h2 className="text-3xl font-bold text-neonCyan mb-4">Get Ready!</h2>
                  <p className="text-gray-400">
                    Waiting for the host to start the quiz...
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Active Quiz */}
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
                {/* Timer */}
                <div className="text-center">
                  <QuizTimer
                    key={`${currentQuestion.id}-timer`}
                    seconds={timeLeft}
                    onTimeUp={() => setShowCorrectAnswer(true)}
                  />
                </div>

                {/* Question for Participants */}
                {!isHost && (
                  <QuizQuestion
                    question={currentQuestion}
                    onAnswer={handleAnswerSubmit}
                    disabled={hasAnswered || timeLeft <= 0}
                    timeLeft={timeLeft}
                    showCorrectAnswer={showCorrectAnswer}
                  />
                )}

                {/* Host Controls */}
                {isHost && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-neonPink mb-4">Current Question</h3>
                      <div className="bg-gray-900 rounded-lg p-4 mb-4">
                        <p className="text-lg font-medium mb-4">{currentQuestion.text}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.isArray(currentQuestion.options) &&
                            currentQuestion.options.map((option, index) => (
                              <div
                                key={index}
                                className="bg-gray-700 rounded px-3 py-2 text-sm"
                              >
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

          {/* Live Leaderboard */}
          {quizStarted && !quizEnded && leaderboardLength > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <Leaderboard
                entries={safeLeaderboard}
                title="Live Leaderboard"
                showRanks
                maxEntries={5}
              />
            </motion.div>
          )}

          {/* Quiz Results */}
          {quizEnded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
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
                        {currentQuestion?.total
                          ? Math.round((userScore / (currentQuestion.total * 100)) * 100)
                          : 0}
                        %
                      </div>
                      <div className="text-gray-300">Accuracy</div>
                    </div>
                  </div>
                </div>
              )}

              <Leaderboard
                entries={safeLeaderboard}
                title="Final Results"
                showRanks
              />

              <div className="text-center space-y-4">
                <NeonButton
                  onClick={() => router.push("/dashboard")}
                  className="px-8 py-3"
                >
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