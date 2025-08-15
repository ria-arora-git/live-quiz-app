"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface QuizEvents {
  onParticipantsUpdate?: (participants: any[]) => void;
  onQuizStart?: (data: any) => void;
  onQuestionChange?: (data: any) => void;
  onTimeUp?: (data: any) => void;
  onQuizEnd?: (payload: any) => void;
  onAnswerSubmitted?: (data: any) => void;
  onLeaderboardUpdate?: (data: any) => void;
  onQuizState?: (data: any) => void;
}

export default function useSocket(roomId: string, userId?: string, userName?: string, events: QuizEvents = {}) {
  const socketRef = useRef<Socket | null>(null);

  const {
    onParticipantsUpdate,
    onQuizStart,
    onQuestionChange,
    onTimeUp,
    onQuizEnd,
    onAnswerSubmitted,
    onLeaderboardUpdate,
    onQuizState,
  } = events;

  const initializeSocket = useCallback(() => {
    if (!roomId) return;

    // Disconnect existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Connect to Railway backend
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

    console.log(`🔌 Connecting to socket server: ${SOCKET_URL}`);

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`🟢 Connected to socket server: ${socket.id}`);
      
      // Auto-join room on connect
      if (roomId && userId) {
        socket.emit("join-room", { roomId, userId, userName });
      }
    });

    socket.on("room-joined", (data) => {
      console.log("✅ Room joined:", data);
    });

    socket.on("participants-update", (data) => {
      console.log("👥 Participants updated:", data.participants);
      onParticipantsUpdate?.(data.participants);
    });

    socket.on("quiz-started", (data) => {
      console.log("🎯 Quiz started:", data);
      onQuizStart?.(data);
    });

    socket.on("quiz-state", (data) => {
      console.log("📊 Quiz state:", data);
      onQuizState?.(data);
    });

    socket.on("question-changed", (data) => {
      console.log("❓ Question changed:", data);
      onQuestionChange?.(data);
    });

    socket.on("time-up", (data) => {
      console.log("⏰ Time up:", data);
      onTimeUp?.(data);
    });

    socket.on("answer-submitted", (data) => {
      console.log("✅ Answer submitted:", data);
      onAnswerSubmitted?.(data);
    });

    socket.on("leaderboard-update", (data) => {
      console.log("🏆 Leaderboard update:", data);
      onLeaderboardUpdate?.(data.leaderboard);
    });

    socket.on("quiz-ended", (data) => {
      console.log("🏁 Quiz ended:", data);
      onQuizEnd?.(data);
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔴 Disconnected: ${reason}`);
    });

    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, userId, userName, onParticipantsUpdate, onQuizStart, onQuestionChange, onTimeUp, onQuizEnd, onAnswerSubmitted, onLeaderboardUpdate, onQuizState]);

  useEffect(() => {
    initializeSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [initializeSocket]);

  // Socket methods
  const socketMethods = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn("⚠️ Socket not connected");
      return null;
    }

    return {
      submitAnswer: (data: any) => socketRef.current?.emit("submit-answer", data),
      nextQuestion: (data: any) => socketRef.current?.emit("next-question", data),
      endQuiz: (data: any) => socketRef.current?.emit("end-quiz", data),
      isConnected: () => socketRef.current?.connected || false,
    };
  }, []);

  return socketMethods();
}
