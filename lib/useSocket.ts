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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    onParticipantsUpdate,
    onQuizStart,
    onQuestionChange,
    onTimeUp,
    onQuizEnd,
    onUserAnswered,
    onAnswerSubmitted,
  } = events;

  const initializeSocket = useCallback(async () => {
    if (!roomId) return;
    
    console.log(`🔌 Initializing socket for room: ${roomId}`);

    try {
      // Ensure socket server is initialized
      await fetch("/api/socket", { method: "GET" });
      
      // Disconnect existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socket = io({ 
        path: "/api/socket", 
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: maxReconnectAttempts,
      });

      socketRef.current = socket;

      // Connection events
      socket.on("connect", () => {
        console.log(`🟢 Connected to socket server: ${socket.id}`);
        reconnectAttempts.current = 0;
        socket.emit("joinRoom", roomId);
      });

      socket.on("roomJoined", (data) => {
        console.log(`✅ Successfully joined room ${data.roomId}`, data.currentState);
        
        // If quiz is already active, sync with current state
        if (data.currentState?.isQuizActive) {
          console.log("🔄 Syncing with active quiz state");
        }
      });

      // Quiz events
      socket.on("quizStarted", (data) => {
        console.log("🎯 Quiz started:", data);
        onQuizStart?.(data);
      });

      socket.on("questionChanged", (data) => {
        console.log("❓ Question changed:", data);
        onQuestionChange?.(data);
      });

      socket.on("timeUp", (data) => {
        console.log("⏰ Time up for question:", data);
        onTimeUp?.(data);
      });

      socket.on("quizEnded", (payload) => {
        console.log("🏁 Quiz ended:", payload);
        onQuizEnd?.(payload);
      });

      // Participant events
      socket.on("updateParticipants", (participants) => {
        console.log("👥 Participants updated:", participants);
        onParticipantsUpdate?.(participants);
      });

      socket.on("userAnswered", (data) => {
        console.log("📝 User answered:", data);
        onUserAnswered?.(data);
      });

      socket.on("answerSubmitted", (data) => {
        console.log("✅ Answer submitted:", data);
        onAnswerSubmitted?.(data);
      });

      // Error handling
      socket.on("disconnect", (reason) => {
        console.log(`🔴 Disconnected: ${reason}`);
        
        if (reason === "io server disconnect" || reason === "transport close") {
          handleReconnect();
        }
      });

      socket.on("connect_error", (error) => {
        console.error("❌ Connection error:", error);
        handleReconnect();
      });

      socket.on("error", (error) => {
        console.error("❌ Socket error:", error);
      });

    } catch (error) {
      console.error("❌ Failed to initialize socket:", error);
      handleReconnect();
    }
  }, [roomId, onParticipantsUpdate, onQuizStart, onQuestionChange, onTimeUp, onQuizEnd, onUserAnswered, onAnswerSubmitted]);

  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
      
      console.log(`🔄 Attempting reconnect ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        initializeSocket();
      }, delay);
    } else {
      console.error("❌ Max reconnection attempts reached");
    }
  }, [initializeSocket]);

  // Expose socket methods
  const socketMethods = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn("⚠️ Socket not connected");
      return null;
    }
    
    return {
      startQuiz: (data: any) => {
        console.log("🎯 Emitting startQuiz:", data);
        socketRef.current?.emit("startQuiz", data);
      },
      
      nextQuestion: (data: any) => {
        console.log("➡️ Emitting nextQuestion:", data);
        socketRef.current?.emit("nextQuestion", data);
      },
      
      submitAnswer: (data: any) => {
        console.log("📝 Emitting submitAnswer:", data);
        socketRef.current?.emit("submitAnswer", data);
      },
      
      endQuiz: (data: any) => {
        console.log("🏁 Emitting endQuiz:", data);
        socketRef.current?.emit("endQuiz", data);
      },
      
      isConnected: () => socketRef.current?.connected || false,
    };
  }, []);

  useEffect(() => {
    initializeSocket();

    return () => {
      console.log("🔌 Cleaning up socket connection");
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [initializeSocket]);

  return socketMethods();
}