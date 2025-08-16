import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface UseSocketEvents {
  onParticipantsUpdate?: (participants: any[]) => void;
  onQuizStart?: (data: any) => void;
  onQuizState?: (data: any) => void;
  onQuestionUpdate?: (data: any) => void;
  onQuestionChange?: (data: any) => void;
  onAnswerSubmitted?: (data: any) => void;
  onQuizEnd?: (data: any) => void;
  onLeaderboardUpdate?: (data: any) => void;
  onTimeUp?: () => void;
  onRoomJoined?: (data: any) => void;
  onError?: (error: string) => void;
}

interface SocketMethods {
  joinRoom: (roomId: string, userId?: string, userName?: string) => void;
  leaveRoom: (roomId: string) => void;
  submitAnswer: (data: any) => void;
  startQuiz: (data: any) => void;
  endQuiz: (data: any) => void;
  nextQuestion: (data: any) => void;
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
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const roomIdRef = useRef(roomId);
  const userIdRef = useRef(userId);
  const userNameRef = useRef(userName);
  const maxRetries = 3;

  // Update refs when props change
  useEffect(() => {
    roomIdRef.current = roomId;
    userIdRef.current = userId;
    userNameRef.current = userName;
  }, [roomId, userId, userName]);

  useEffect(() => {
    if (!roomId) return;

    // FIXED: Better server URL resolution with fallbacks
    const getServerUrl = () => {
      // Try environment variable first
      if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
        return process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
      }
      
      // Development fallback
      if (process.env.NODE_ENV === "development") {
        return "http://localhost:3000";
      }
      
      // Production: Use the same domain as the web app
      if (typeof window !== "undefined") {
        return window.location.origin;
      }
      
      // Final fallback
      return "http://localhost:3000";
    };

    const serverUrl = getServerUrl();
    console.log("🔌 Connecting to socket server:", serverUrl);

    const connectSocket = () => {
      try {
        const socket = io(serverUrl, {
          path: "/api/socket",
          transports: ["websocket", "polling"], // Try websocket first, fallback to polling
          timeout: 20000,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: maxRetries,
          forceNew: false,
          // FIXED: Better connection options
          upgrade: true,
          rememberUpgrade: true,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("🟢 Connected to socket server:", socket.id);
          setIsConnected(true);
          setConnectionAttempts(0); // Reset attempts on successful connection
          
          // Auto-join room when connected
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
          
          // Don't retry if disconnected intentionally
          if (reason === "io client disconnect") {
            return;
          }
        });

        socket.on("connect_error", (error) => {
          console.error("❌ Connection error:", error);
          setIsConnected(false);
          setConnectionAttempts(prev => prev + 1);
          
          // Stop trying after max retries
          if (connectionAttempts >= maxRetries) {
            console.error("❌ Max connection attempts reached");
            events.onError?.(`Connection failed after ${maxRetries} attempts. Please check your internet connection.`);
            return;
          }
          
          events.onError?.(`Connection failed: ${error.message}`);
        });

        // Room events with safe array handling
        socket.on("roomJoined", (data) => {
          console.log("✅ Room joined:", data);
          events.onRoomJoined?.(data);
        });

        socket.on("updateParticipants", (data) => {
          console.log("👥 Participants updated:", data);
          // FIXED: Always ensure participants is a safe array
          const participants = Array.isArray(data) 
            ? data.filter(p => p && typeof p === 'object')
            : [];
          events.onParticipantsUpdate?.(participants);
        });

        // Quiz events
        socket.on("quizStarted", (data) => {
          console.log("🚀 Quiz started:", data);
          events.onQuizStart?.(data || {});
        });

        socket.on("quizState", (data) => {
          console.log("📊 Quiz state:", data);
          events.onQuizState?.(data || {});
        });

        socket.on("questionUpdate", (data) => {
          console.log("❓ Question update:", data);
          events.onQuestionUpdate?.(data || {});
        });

        socket.on("questionChanged", (data) => {
          console.log("🔄 Question changed:", data);
          events.onQuestionChange?.(data || {});
        });

        socket.on("answerSubmitted", (data) => {
          console.log("✍️ Answer submitted:", data);
          events.onAnswerSubmitted?.(data || {});
        });

        socket.on("quizEnded", (data) => {
          console.log("🏁 Quiz ended:", data);
          events.onQuizEnd?.(data || {});
        });

        socket.on("leaderboardUpdate", (data) => {
          console.log("🏆 Leaderboard updated:", data);
          // FIXED: Safe leaderboard handling
          const leaderboard = Array.isArray(data) 
            ? data.filter(entry => entry && typeof entry === 'object')
            : [];
          events.onLeaderboardUpdate?.(leaderboard);
        });

        socket.on("timeUp", () => {
          console.log("⏲️ Time up");
          events.onTimeUp?.();
        });

        socket.on("error", (error) => {
          console.error("⚠️ Socket error:", error);
          events.onError?.(error?.message || "Unknown socket error");
        });

        return () => {
          console.log("🧹 Cleaning up socket connection");
          socket.removeAllListeners();
          socket.disconnect();
          socketRef.current = null;
          setIsConnected(false);
        };
        
      } catch (error) {
        console.error("❌ Failed to initialize socket:", error);
        setConnectionAttempts(prev => prev + 1);
        events.onError?.("Failed to initialize socket connection");
        return;
      }
    };

    const cleanup = connectSocket();
    return cleanup;
  }, [roomId, events, connectionAttempts, maxRetries]);

  // Socket methods with better error handling
  const joinRoom = useCallback((roomId: string, userId?: string, userName?: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot join room");
      events.onError?.("Not connected to server");
      return;
    }

    try {
      console.log("🏠 Joining room:", { roomId, userId, userName });
      socket.emit("joinRoom", { roomId, userId, userName });
    } catch (error) {
      console.error("❌ Failed to join room:", error);
      events.onError?.("Failed to join room");
    }
  }, [events.onError]);

  const leaveRoom = useCallback((roomId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    
    try {
      console.log("🚪 Leaving room:", roomId);
      socket.emit("leaveRoom", { roomId });
    } catch (error) {
      console.error("❌ Failed to leave room:", error);
    }
  }, []);

  const submitAnswer = useCallback((data: any) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot submit answer");
      events.onError?.("Not connected to server");
      return;
    }
    
    try {
      console.log("📝 Submitting answer:", data);
      socket.emit("submitAnswer", data);
    } catch (error) {
      console.error("❌ Failed to submit answer:", error);
      events.onError?.("Failed to submit answer");
    }
  }, [events.onError]);

  const startQuiz = useCallback((data: any) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot start quiz");
      events.onError?.("Not connected to server");
      return;
    }
    
    try {
      console.log("🎯 Starting quiz:", data);
      socket.emit("startQuiz", data);
    } catch (error) {
      console.error("❌ Failed to start quiz:", error);
      events.onError?.("Failed to start quiz");
    }
  }, [events.onError]);

  const endQuiz = useCallback((data: any) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot end quiz");
      return;
    }
    
    try {
      console.log("🛑 Ending quiz:", data);
      socket.emit("endQuiz", data);
    } catch (error) {
      console.error("❌ Failed to end quiz:", error);
      events.onError?.("Failed to end quiz");
    }
  }, [events.onError]);

  const nextQuestion = useCallback((data: any) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot advance question");
      return;
    }
    
    try {
      console.log("➡️ Next question:", data);
      socket.emit("nextQuestion", data);
    } catch (error) {
      console.error("❌ Failed to advance question:", error);
      events.onError?.("Failed to advance question");
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

  if (!roomId) {
    return null;
  }

  return {
    joinRoom,
    leaveRoom,
    submitAnswer,
    startQuiz,
    endQuiz,
    nextQuestion,
    isConnected: checkIsConnected,
    disconnect,
  };
};

export default useSocket;