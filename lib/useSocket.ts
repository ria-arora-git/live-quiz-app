import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketEvents {
  onParticipantsUpdate?: (participants: any[]) => void;
  onQuizStart?: (data: { sessionId?: string }) => void;
  onQuestionUpdate?: (data: any) => void;
  onAnswerSubmitted?: (data: any) => void;
  onQuizEnd?: (data: any) => void;
  onRoomJoined?: (data: any) => void;
  onError?: (error: string) => void;
}

interface SocketMethods {
  joinRoom: (roomId: string, userId?: string, userName?: string) => void;
  leaveRoom: (roomId: string) => void;
  submitAnswer: (data: any) => void;
  startQuiz: (data: any) => void;
  isConnected: () => boolean;
  disconnect: () => void;
}

const useSocket = (
  roomId?: string,
  userId?: string,
  userName?: string,
  events: UseSocketEvents = {}
): SocketMethods | null => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const roomIdRef = useRef<string | undefined>(roomId);
  const userIdRef = useRef<string | undefined>(userId);
  const userNameRef = useRef<string | undefined>(userName);

  // Update refs when props change
  useEffect(() => {
    roomIdRef.current = roomId;
    userIdRef.current = userId;
    userNameRef.current = userName;
  }, [roomId, userId, userName]);

  // Initialize socket connection
  useEffect(() => {
    if (!roomId) return;

    const serverUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 
                     process.env.NODE_ENV === "production" 
                       ? "https://quiz-app-production-fa91.up.railway.app"
                       : "http://localhost:3000";

    console.log("🔌 Connecting to socket server:", serverUrl);

    try {
      const socket = io(serverUrl, {
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        forceNew: false,
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on("connect", () => {
        console.log("🟢 Connected to socket server:", socket.id);
        setIsConnected(true);
        
        // Auto-join room if we have the required data
        if (roomIdRef.current && userIdRef.current) {
          socket.emit("joinRoom", {
            roomId: roomIdRef.current,
            userId: userIdRef.current,
            userName: userNameRef.current,
          });
        }
      });

      socket.on("disconnect", (reason) => {
        console.log("🔴 Disconnected:", reason);
        setIsConnected(false);
      });

      socket.on("connect_error", (error) => {
        console.error("❌ Connection error:", error);
        setIsConnected(false);
        if (events.onError) {
          events.onError(`Connection failed: ${error.message}`);
        }
      });

      // Room event handlers
      socket.on("roomJoined", (data) => {
        console.log("✅ Room joined:", data);
        if (events.onRoomJoined) {
          events.onRoomJoined(data);
        }
      });

      socket.on("participantsUpdate", (data) => {
        console.log("👥 Participants updated:", data);
        if (events.onParticipantsUpdate) {
          const participants = Array.isArray(data) ? data : [];
          events.onParticipantsUpdate(participants);
        }
      });

      socket.on("quizStarted", (data) => {
        console.log("🚀 Quiz started:", data);
        if (events.onQuizStart) {
          events.onQuizStart(data || {});
        }
      });

      socket.on("questionUpdate", (data) => {
        console.log("❓ Question update:", data);
        if (events.onQuestionUpdate) {
          events.onQuestionUpdate(data || {});
        }
      });

      socket.on("answerSubmitted", (data) => {
        console.log("✍️ Answer submitted:", data);
        if (events.onAnswerSubmitted) {
          events.onAnswerSubmitted(data || {});
        }
      });

      socket.on("quizEnded", (data) => {
        console.log("🏁 Quiz ended:", data);
        if (events.onQuizEnd) {
          events.onQuizEnd(data || {});
        }
      });

      socket.on("error", (error) => {
        console.error("⚠️ Socket error:", error);
        if (events.onError) {
          events.onError(error?.message || "Unknown socket error");
        }
      });

      // Cleanup function
      return () => {
        console.log("🧹 Cleaning up socket connection");
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      };
    } catch (error) {
      console.error("❌ Failed to initialize socket:", error);
      if (events.onError) {
        events.onError("Failed to initialize socket connection");
      }
      return;
    }
  }, [roomId]); // Only depend on roomId for socket initialization

  // Socket methods
  const joinRoom = useCallback((roomId: string, userId?: string, userName?: string) => {
    const socket = socketRef.current;
    if (!socket) {
      console.warn("⚠️ Socket not connected");
      return;
    }

    try {
      console.log("🏠 Joining room:", { roomId, userId, userName });
      socket.emit("joinRoom", { roomId, userId, userName });
    } catch (error) {
      console.error("❌ Failed to join room:", error);
      if (events.onError) {
        events.onError("Failed to join room");
      }
    }
  }, [events.onError]);

  const leaveRoom = useCallback((roomId: string) => {
    const socket = socketRef.current;
    if (!socket) {
      console.warn("⚠️ Socket not connected");
      return;
    }

    try {
      console.log("🚪 Leaving room:", roomId);
      socket.emit("leaveRoom", { roomId });
    } catch (error) {
      console.error("❌ Failed to leave room:", error);
      if (events.onError) {
        events.onError("Failed to leave room");
      }
    }
  }, [events.onError]);

  const submitAnswer = useCallback((data: any) => {
    const socket = socketRef.current;
    if (!socket) {
      console.warn("⚠️ Socket not connected");
      return;
    }

    try {
      console.log("📝 Submitting answer:", data);
      socket.emit("submitAnswer", data);
    } catch (error) {
      console.error("❌ Failed to submit answer:", error);
      if (events.onError) {
        events.onError("Failed to submit answer");
      }
    }
  }, [events.onError]);

  const startQuiz = useCallback((data: any) => {
    const socket = socketRef.current;
    if (!socket) {
      console.warn("⚠️ Socket not connected");
      return;
    }

    try {
      console.log("🎯 Starting quiz:", data);
      socket.emit("startQuiz", data);
    } catch (error) {
      console.error("❌ Failed to start quiz:", error);
      if (events.onError) {
        events.onError("Failed to start quiz");
      }
    }
  }, [events.onError]);

  const checkIsConnected = useCallback(() => {
    return socketRef.current?.connected || false;
  }, []);

  const disconnect = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      console.log("🔌 Manually disconnecting socket");
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Return null if no roomId is provided
  if (!roomId) {
    return null;
  }

  return {
    joinRoom,
    leaveRoom,
    submitAnswer,
    startQuiz,
    isConnected: checkIsConnected,
    disconnect,
  };
};

export default useSocket;