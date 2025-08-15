"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface QuizEvents {
  onParticipantsUpdate?: (participants: any[]) => void;
  onQuizStart?: (data: any) => void;
  onQuestionChange?: (data: any) => void;
  onTimeUp?: (data: any) => void;
  onQuizEnd?: (payload: any) => void;
  onUserAnswered?: (data: any) => void;
  onAnswerSubmitted?: (data: any) => void;
}

export default function useSocket(roomId: string, events: QuizEvents = {}) {
  const socketRef = useRef<Socket | null>(null);
  
  const {
    onParticipantsUpdate,
    onQuizStart,
    onQuestionChange,
    onTimeUp,
    onQuizEnd,
    onUserAnswered,
    onAnswerSubmitted,
  } = events;

  const initializeSocket = useCallback(() => {
    if (!roomId) return;

    // Disconnect existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Connect to external Railway Socket.IO backend
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`🟢 Connected to socket server: ${socket.id}`);
      socket.emit("joinRoom", roomId);
    });

    socket.on("roomJoined", (data) => {
      console.log("✅ Room joined:", data);
    });

    socket.on("updateParticipants", (participants) => {
      console.log("👥 Participants updated:", participants);
      onParticipantsUpdate?.(participants);
    });

    socket.on("quizStarted", (data) => {
      console.log("🎯 Quiz started:", data);
      onQuizStart?.(data);
    });

    socket.on("questionChanged", (data) => {
      console.log("❓ Question changed:", data);
      onQuestionChange?.(data);
    });

    socket.on("timeUp", (data) => {
      console.log("⏰ Time up:", data);
      onTimeUp?.(data);
    });

    socket.on("quizEnded", (data) => {
      console.log("🏁 Quiz ended:", data);
      onQuizEnd?.(data);
    });

    socket.on("userAnswered", (data) => {
      onUserAnswered?.(data);
    });

    socket.on("answerSubmitted", (data) => {
      onAnswerSubmitted?.(data);
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
  }, [roomId, onParticipantsUpdate, onQuizStart, onQuestionChange, onTimeUp, onQuizEnd, onUserAnswered, onAnswerSubmitted]);

  useEffect(() => {
    initializeSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [initializeSocket]);

  // Socket methods to emit events to server
  const socketMethods = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn("⚠️ Socket not connected");
      return null;
    }

    return {
      startQuiz: (data: any) => socketRef.current?.emit("startQuiz", data),
      nextQuestion: (data: any) => socketRef.current?.emit("nextQuestion", data),
      submitAnswer: (data: any) => socketRef.current?.emit("submitAnswer", data),
      endQuiz: (data: any) => socketRef.current?.emit("endQuiz", data),
      isConnected: () => socketRef.current?.connected || false,
    };
  }, []);

  return socketMethods();
}
