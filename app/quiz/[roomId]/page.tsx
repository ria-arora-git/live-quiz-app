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
import type { Question } from "@/types/quiz";

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
  results: any[];
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
}

interface UserStats {
  score: number;
  correct: number;
  total: number;
}

export default function QuizPage({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState<QuizSession | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [quizOver, setQuizOver] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());

  const isHost = session?.room?.createdBy === user?.id;

  useSocket(
    roomId,
    (updated) => setParticipants(updated),
    (payload) => {
      setQuizOver(true);
      setLeaderboard(payload.leaderboard || []);
      setUserStats(payload.userStats || null);
    },
    () => {
      loadQuizData();
    }
  );

  const loadQuizData = useCallback(async () => {
    try {
      let url = `/api/session/active?roomId=${roomId}`;
      if (sessionId) url += `&sessionId=${sessionId}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Quiz session not found. Please wait for the host to start the quiz.");
        } else {
          throw new Error("Failed to load quiz data");
        }
        return;
      }
      
      const data = await res.json();
      setSession(data.session);
      setParticipants(data.session.participants || []);
      setCurrentIndex(data.session.currentIndex || 0);

      // Load questions
      const qRes = await fetch(`/api/question/list?roomId=${roomId}`);
      if (qRes.ok) {
        const questionsData = await qRes.json();
        setQuestions(questionsData);
      }
    } catch (err: any) {
      setError(err.message);
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

  const handleAnswerSubmit = async (selectedOption: string, timeLeft: number) => {
    if (!session || quizOver || isHost || !questions[currentIndex]) return;
    
    const question = questions[currentIndex];
    
    // Prevent multiple submissions for the same question
    if (answeredQuestions.has(question.id)) return;
    
    setCurrentAnswer(selectedOption);
    setAnsweredQuestions(prev => new Set([...prev, question.id]));
    
    try {
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
      
      if (res.ok) {
        const result = await res.json();
        if (result.correct) {
          setUserScore(prev => prev + result.points);
        }
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setCurrentAnswer(null);
    } else {
      setQuizOver(true);
    }
  };

  const handleTimeUp = () => {
    if (!isHost && !answeredQuestions.has(questions[currentIndex]?.id)) {
      handleAnswerSubmit("", 0); // Submit empty answer when time runs out
    }
    
    setTimeout(() => {
      handleNextQuestion();
    }, 2000); // Show results for 2 seconds before moving to next question
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Quiz Not Available</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-neonPink text-black px-6 py-3 rounded-lg font-semibold hover:bg-pink-600 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-6">⏳</div>
          <h2 className="text-2xl font-bold text-neonCyan mb-4">Waiting for Quiz</h2>
          <p className="text-gray-400">Waiting for the host to start the quiz...</p>
        </div>
      </div>
    );
  }

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
                {session.room.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <span>Room: {session.room.code}</span>
                {!quizOver && !isHost && (
                  <span>
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                )}
                {quizOver && <span className="text-yellow-400">Quiz Completed</span>}
              </div>
            </div>
            {!isHost && !quizOver && (
              <div className="bg-black bg-opacity-30 rounded-lg px-4 py-2">
                <span className="text-neonCyan font-bold text-xl">{userScore}</span>
                <span className="text-gray-400 ml-2">points</span>
              </div>
            )}
          </div>
        </motion.header>

        <div className="max-w-4xl mx-auto">
          {/* Quiz Question for Participants */}
          {!quizOver && !isHost && questions[currentIndex] && (
            <AnimatePresence mode="wait">
              <motion.div
                key={questions[currentIndex].id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Timer */}
                <div className="text-center">
                  <QuizTimer
                    key={`${questions[currentIndex].id}-timer`}
                    seconds={session.room.timePerQuestion}
                    onTimeUp={handleTimeUp}
                  />
                </div>

                {/* Question */}
                <QuizQuestion
                  question={questions[currentIndex]}
                  onAnswer={handleAnswerSubmit}
                  disabled={answeredQuestions.has(questions[currentIndex].id)}
                  selectedAnswer={currentAnswer}
                />
              </motion.div>
            </AnimatePresence>
          )}

          {/* Host View - Live Participants */}
          {isHost && !quizOver && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-neonCyan">Live Participants</h2>
                <div className="text-lg text-gray-300">
                  Question {currentIndex + 1} of {questions.length}
                </div>
              </div>
              
              {participants.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4 opacity-50">👥</div>
                  <p className="text-gray-400">No participants in the quiz</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participants.map((participant) => {
                    const result = session.results.find((r: any) => r.userId === participant.clerkId);
                    const score = result?.score || 0;
                    
                    return (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-900 rounded-lg p-4 border border-gray-600"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-neonPink to-neonCyan rounded-full flex items-center justify-center text-black font-bold">
                              {(participant.name || participant.email || "A").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {participant.name || participant.email || "Anonymous"}
                              </p>
                              <p className="text-xs text-gray-400">{score} points</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Host Controls */}
              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={handleNextQuestion}
                  disabled={currentIndex >= questions.length - 1}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  {currentIndex >= questions.length - 1 ? "Last Question" : "Next Question"}
                </button>
                <button
                  onClick={() => setQuizOver(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  End Quiz
                </button>
              </div>
            </motion.section>
          )}

          {/* Quiz Results / Leaderboard */}
          {quizOver && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Personal Stats for Participants */}
              {!isHost && userStats && (
                <div className="bg-gradient-to-r from-green-900 to-blue-900 rounded-lg p-6 border border-green-500 text-center">
                  <h2 className="text-3xl font-bold text-green-400 mb-4">Quiz Complete!</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="text-3xl font-bold text-neonCyan">{userStats.score}</div>
                      <div className="text-gray-300">Total Points</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-400">{userStats.correct}</div>
                      <div className="text-gray-300">Correct Answers</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-yellow-400">
                        {Math.round((userStats.correct / userStats.total) * 100)}%
                      </div>
                      <div className="text-gray-300">Accuracy</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              <Leaderboard 
                entries={leaderboard} 
                title="Final Results"
                showRanks={true}
              />

              {/* Actions */}
              <div className="text-center space-y-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="bg-neonPink text-black px-8 py-3 rounded-lg font-semibold hover:bg-pink-600 transition"
                >
                  Back to Dashboard
                </button>
                
                {isHost && (
                  <div className="space-x-4">
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Start New Quiz
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
