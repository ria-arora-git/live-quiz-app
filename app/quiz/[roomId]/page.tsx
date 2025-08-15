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
  results: any[];
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
}

export default function QuizPage({ params }: { params: { roomId: string } }) {
  const { roomId } = params;
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams ? searchParams.get("sessionId") : null;

  // State management
  const [session, setSession] = useState<QuizSession | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userScore, setUserScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizEnded, setQuizEnded] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  const isHost = session?.room?.createdBy === user?.id;

  // Socket connection with comprehensive event handling
  const socket = useSocket(roomId, {
    onParticipantsUpdate: (updated) => {
      console.log("👥 Participants updated:", updated);
      setParticipants(updated);
    },
    
    onQuizStart: (data) => {
      console.log("🎯 Quiz started:", data);
      setQuizStarted(true);
      setQuizEnded(false);
      setCurrentQuestion(data.question);
      setTimeLeft(data.timePerQuestion);
      setQuestionStartTime(Date.now());
      setShowResults(false);
    },
    
    onQuestionChange: (data) => {
      console.log("❓ Question changed:", data);
      setCurrentQuestion(data.question);
      setTimeLeft(data.timePerQuestion);
      setQuestionStartTime(Date.now());
      setShowResults(false);
    },
    
    onTimeUp: (data) => {
      console.log("⏰ Time up:", data);
      setTimeLeft(0);
      setShowResults(true);
      
      // Auto-hide results after 3 seconds to prepare for next question
      setTimeout(() => {
        setShowResults(false);
      }, 3000);
    },
    
    onQuizEnd: (payload) => {
      console.log("🏁 Quiz ended:", payload);
      setQuizEnded(true);
      setQuizStarted(false);
      setLeaderboard(payload.leaderboard || []);
      setUserStats(user?.id ? payload.userStats?.[user.id] || null : null);
    },
    
    onUserAnswered: (data) => {
      console.log("📝 User answered:", data);
      // Could show visual feedback that someone answered
    },
    
    onAnswerSubmitted: (data) => {
      console.log("✅ Answer submitted:", data);
      // Mark question as answered
      if (data.questionId) {
        setAnsweredQuestions(prev => new Set([...prev, data.questionId]));
      }
    }
  });

  // Load initial quiz data
  const loadQuizData = useCallback(async () => {
    try {
      let url = `/api/session/active?roomId=${roomId}`;
      if (sessionId) url += `&sessionId=${sessionId}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Quiz session not found");
      }
      
      const data = await res.json();
      setSession(data.session);
      setParticipants(data.session.participants || []);
      
      // Check if quiz is already active
      if (data.session.isActive) {
        setQuizStarted(true);
        // Could load current question here if needed
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

  // Handle answer submission
  const handleAnswerSubmit = async (selectedOption: string, currentTimeLeft: number) => {
    if (!session || !currentQuestion || quizEnded || isHost) return;
    
    const questionId = currentQuestion.id;
    if (answeredQuestions.has(questionId)) return;
    
    try {
      // Submit to API
      const res = await fetch("/api/question/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          questionId,
          selectedOption,
          timeLeft: currentTimeLeft,
        }),
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.correct) {
          setUserScore(prev => prev + result.points);
        }
        
        // Emit via socket for real-time feedback
        socket?.submitAnswer({
          roomId,
          questionId,
          selectedOption,
          timeLeft: currentTimeLeft,
        });
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
    }
  };

  // Host controls
  const handleStartQuiz = () => {
    if (!socket || !session) return;
    
    socket.startQuiz({
      roomId,
      sessionId: session.id,
      timePerQuestion: session.room.timePerQuestion,
    });
  };

  const handleNextQuestion = () => {
    if (!socket) return;
    
    socket.nextQuestion({ roomId });
  };

  const handleEndQuiz = () => {
    if (!socket) return;
    
    socket.endQuiz({ roomId });
  };

  // Timer countdown effect
  useEffect(() => {
    if (!quizStarted || quizEnded || timeLeft <= 0 || !questionStartTime) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const remaining = Math.max(0, (session?.room.timePerQuestion || 30) - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
      }
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
        <div className="text-center">
          <div className="animate-spin text-6xl mb-6">⏳</div>
          <h2 className="text-2xl font-bold text-neonCyan mb-4">Loading Quiz...</h2>
          <p className="text-gray-400">Please wait while we set up your quiz session</p>
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
                <span>Participants: {participants.length}</span>
                {quizStarted && currentQuestion && (
                  <span>Question {currentQuestion.index + 1} of {currentQuestion.total}</span>
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
                    {participants.length} participant(s) joined. Click start when ready.
                  </p>
                  <div className="space-y-4">
                    <NeonButton
                      onClick={handleStartQuiz}
                      className="px-8 py-3 bg-green-500 text-black"
                    >
                      Start Quiz
                    </NeonButton>
                    {participants.length === 0 && (
                      <p className="text-yellow-400 text-sm">
                        💡 Share room code {session.room.code} to invite participants
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

          {/* Active Quiz - Question Display */}
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
                    onTimeUp={() => {}}
                  />
                </div>

                {/* Question for Participants */}
                {!isHost && (
                  <QuizQuestion
                    question={currentQuestion}
                    onAnswer={handleAnswerSubmit}
                    disabled={answeredQuestions.has(currentQuestion.id)}
                    timeLeft={timeLeft}
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
                          {currentQuestion.options.map((option, index) => (
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

                {/* Show intermediate results */}
                {showResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-900 bg-opacity-50 rounded-lg p-6 border border-blue-600 text-center"
                  >
                    <h3 className="text-xl font-bold text-blue-400 mb-2">Time's Up!</h3>
                    <p className="text-gray-300">Preparing next question...</p>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Quiz Results */}
          {quizEnded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
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
                      <div className="text-3xl font-bold text-yellow-400">{userStats.accuracy}%</div>
                      <div className="text-gray-300">Accuracy</div>
                    </div>
                  </div>
                </div>
              )}

              <Leaderboard 
                entries={leaderboard} 
                title="Final Results"
                showRanks={true}
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