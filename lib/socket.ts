import { Server as IOServer } from "socket.io";
import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";
import prisma from "@/lib/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket.server.io) {
    console.log("🔌 Initializing Socket.IO server...");

    const io = new IOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? [process.env.NEXT_PUBLIC_APP_URL || ""]
            : ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"],
        credentials: true,
      },

      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
    });

    // Track active rooms and their state
    const roomStates = new Map();
    const questionTimers = new Map();

    io.on("connection", (socket) => {
      console.log(`🟢 Client connected: ${socket.id}`);

      // Join room
      socket.on("joinRoom", async (roomId: string) => {
        try {
          if (!roomId || typeof roomId !== "string") {
            socket.emit("error", { message: "Invalid room ID" });
            return;
          }

          socket.join(roomId);
          console.log(`📥 ${socket.id} joined room ${roomId}`);

          // Initialize room state if not exists
          if (!roomStates.has(roomId)) {
            roomStates.set(roomId, {
              currentQuestionIndex: 0,
              isQuizActive: false,
              participants: new Set(),
              questionStartTime: null,
              timePerQuestion: 30,
            });
          }

          const roomState = roomStates.get(roomId);
          roomState.participants.add(socket.id);

          // Send current room state to joined user
          socket.emit("roomJoined", {
            roomId,
            socketId: socket.id,
            currentState: {
              isQuizActive: roomState.isQuizActive,
              currentQuestionIndex: roomState.currentQuestionIndex,
              questionStartTime: roomState.questionStartTime,
            },
          });

          // Broadcast updated participant count
          await broadcastParticipants(io, roomId);
        } catch (error) {
          console.error("❌ Error joining room:", error);
        }
      });

      // Start quiz (host only)
      socket.on("startQuiz", async (data) => {
        try {
          const { roomId, sessionId, timePerQuestion } = data;
          console.log(`🎯 Starting quiz for room ${roomId}`);

          const roomState = roomStates.get(roomId);
          if (roomState) {
            roomState.isQuizActive = true;
            roomState.currentQuestionIndex = 0;
            roomState.timePerQuestion = timePerQuestion || 30;
            roomState.questionStartTime = Date.now();
          }

          // Get first question
          const questions = await prisma.question.findMany({
            where: { roomId },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          });

          if (questions.length > 0) {
            const firstQuestion = questions[0];

            // Broadcast quiz start with first question
            io.to(roomId).emit("quizStarted", {
              sessionId,
              roomId,
              question: {
                id: firstQuestion.id,
                text: firstQuestion.text,
                options: firstQuestion.options,
                index: 0,
                total: questions.length,
              },
              timePerQuestion: roomState?.timePerQuestion || 30,
              timestamp: new Date().toISOString(),
            });

            // Start question timer
            startQuestionTimer(io, roomId, questions, 0);
          }
        } catch (error) {
          console.error("❌ Error starting quiz:", error);
        }
      });

      // Submit answer
      socket.on("submitAnswer", async (data) => {
        try {
          const { roomId, questionId, selectedOption, timeLeft } = data;

          // Broadcast that user submitted answer (for UI feedback)
          socket.to(roomId).emit("userAnswered", {
            socketId: socket.id,
            questionId,
            timeLeft,
          });

          // Acknowledge submission to sender
          socket.emit("answerSubmitted", {
            questionId,
            selectedOption,
            timeLeft,
          });
        } catch (error) {
          console.error("❌ Error submitting answer:", error);
        }
      });

      // Next question (host only)
      socket.on("nextQuestion", async (data) => {
        try {
          const { roomId } = data;
          const roomState = roomStates.get(roomId);

          if (roomState && roomState.isQuizActive) {
            roomState.currentQuestionIndex++;
            roomState.questionStartTime = Date.now();

            const questions = await prisma.question.findMany({
              where: { roomId },
              orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            });

            if (roomState.currentQuestionIndex < questions.length) {
              const nextQuestion = questions[roomState.currentQuestionIndex];

              io.to(roomId).emit("questionChanged", {
                question: {
                  id: nextQuestion.id,
                  text: nextQuestion.text,
                  options: nextQuestion.options,
                  index: roomState.currentQuestionIndex,
                  total: questions.length,
                },
                timePerQuestion: roomState.timePerQuestion,
                timestamp: new Date().toISOString(),
              });

              // Start timer for new question
              startQuestionTimer(
                io,
                roomId,
                questions,
                roomState.currentQuestionIndex
              );
            } else {
              // Quiz finished
              await endQuiz(io, roomId);
            }
          }
        } catch (error) {
          console.error("❌ Error changing question:", error);
        }
      });

      // End quiz (host only)
      socket.on("endQuiz", async (data) => {
        try {
          const { roomId } = data;
          await endQuiz(io, roomId);
        } catch (error) {
          console.error("❌ Error ending quiz:", error);
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`🔴 Client disconnected: ${socket.id}`);

        // Remove from all room states
        for (const [roomId, roomState] of roomStates.entries()) {
          if (roomState.participants.has(socket.id)) {
            roomState.participants.delete(socket.id);
            broadcastParticipants(io, roomId);
          }
        }
      });
    });

    // Helper function to start question timer
    function startQuestionTimer(
      io: IOServer,
      roomId: string,
      questions: any[],
      questionIndex: number
    ) {
      const roomState = roomStates.get(roomId);
      if (!roomState) return;

      // Clear existing timer
      if (questionTimers.has(roomId)) {
        clearTimeout(questionTimers.get(roomId));
      }

      const timeLimit = roomState.timePerQuestion * 1000;

      const timer = setTimeout(async () => {
        // Time's up for current question
        io.to(roomId).emit("timeUp", {
          questionIndex,
          timestamp: new Date().toISOString(),
        });

        // Auto-advance to next question after 3 seconds
        setTimeout(async () => {
          roomState.currentQuestionIndex++;

          if (roomState.currentQuestionIndex < questions.length) {
            const nextQuestion = questions[roomState.currentQuestionIndex];
            roomState.questionStartTime = Date.now();

            io.to(roomId).emit("questionChanged", {
              question: {
                id: nextQuestion.id,
                text: nextQuestion.text,
                options: nextQuestion.options,
                index: roomState.currentQuestionIndex,
                total: questions.length,
              },
              timePerQuestion: roomState.timePerQuestion,
              timestamp: new Date().toISOString(),
            });

            // Start timer for next question
            startQuestionTimer(
              io,
              roomId,
              questions,
              roomState.currentQuestionIndex
            );
          } else {
            // Quiz finished
            await endQuiz(io, roomId);
          }
        }, 3000);
      }, timeLimit);

      questionTimers.set(roomId, timer);
    }

    // Helper function to end quiz
    async function endQuiz(io: IOServer, roomId: string) {
      try {
        const roomState = roomStates.get(roomId);
        if (roomState) {
          roomState.isQuizActive = false;
        }

        // Clear timer
        if (questionTimers.has(roomId)) {
          clearTimeout(questionTimers.get(roomId));
          questionTimers.delete(roomId);
        }

        // Get final results
        const session = await prisma.quizSession.findFirst({
          where: { roomId, isActive: true },
          include: {
            results: {
              include: {
                user: { select: { name: true, email: true, clerkId: true } },
              },
              orderBy: { score: "desc" },
            },
          },
        });

        let leaderboard: {
          userId: string;
          name: string;
          score: number;
          rank: number;
        }[] = [];
        let userStats: Record<
          string,
          {
            score: number;
            correct: number;
            total: number;
            accuracy: number;
          }
        > = {};

        if (session?.results) {
          leaderboard = session.results.map((result: any, index: number) => ({
            userId: result.userId,
            name: result.user.name || result.user.email || "Anonymous",
            score: result.score,
            rank: index + 1,
          }));

          userStats = session.results.reduce((acc: any, result: any) => {
            const answers = result.answers as any;
            const correctCount = Object.values(answers || {}).filter(
              (a: any) => a?.isCorrect
            ).length;
            const totalQuestions = Object.keys(answers || {}).length;

            acc[result.userId] = {
              score: result.score,
              correct: correctCount,
              total: totalQuestions,
              accuracy:
                totalQuestions > 0
                  ? Math.round((correctCount / totalQuestions) * 100)
                  : 0,
            };
            return acc;
          }, {});
        }

        // Mark session as ended
        if (session) {
          await prisma.quizSession.update({
            where: { id: session.id },
            data: { isActive: false, endedAt: new Date() },
          });
        }

        // Broadcast quiz end
        io.to(roomId).emit("quizEnded", {
          leaderboard,
          userStats,
          timestamp: new Date().toISOString(),
        });

        console.log(`🏁 Quiz ended for room ${roomId}`);
      } catch (error) {
        console.error("❌ Error ending quiz:", error);
      }
    }

    // Helper function to broadcast participants
    async function broadcastParticipants(io: IOServer, roomId: string) {
      try {
        const session = await prisma.quizSession.findFirst({
          where: { roomId },
          orderBy: { createdAt: "desc" },
        });

        if (!session) return;

        const participants = await prisma.user.findMany({
          where: { clerkId: { in: session.participants } },
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
          },
        });

        io.to(roomId).emit("updateParticipants", participants);
      } catch (error) {
        console.error("❌ Error broadcasting participants:", error);
      }
    }

    res.socket.server.io = io;
  }

  res.end();
}
