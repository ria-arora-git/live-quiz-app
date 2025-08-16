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
  const roomIdRef = useRef(roomId);
  const userIdRef = useRef(userId);
  const userNameRef = useRef(userName);

  useEffect(() => {
    roomIdRef.current = roomId;
    userIdRef.current = userId;
    userNameRef.current = userName;
  }, [roomId, userId, userName]);

  useEffect(() => {
    if (!roomId) return;

    const serverUrl =
      process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://quiz-app-production-fa91.up.railway.app"
        : "http://localhost:3000");

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

      socket.on("connect", () => {
        console.log("🟢 Connected to socket server:", socket.id);
        setIsConnected(true);
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
        events.onError?.(`Connection failed: ${error.message}`);
      });

      if (events.onRoomJoined)
        socket.on("roomJoined", data => {
          console.log("✅ Room joined:", data);
          events.onRoomJoined!(data);
        });

      if (events.onParticipantsUpdate)
        socket.on("participantsUpdate", data => {
          console.log("👥 Participants updated:", data);
          events.onParticipantsUpdate!(Array.isArray(data) ? data : []);
        });

      if (events.onQuizStart)
        socket.on("quizStarted", data => {
          console.log("🚀 Quiz started:", data);
          events.onQuizStart!(data || {});
        });

      if (events.onQuizState)
        socket.on("quizState", data => {
          console.log("📊 Quiz state:", data);
          events.onQuizState!(data || {});
        });

      if (events.onQuestionUpdate)
        socket.on("questionUpdate", data => {
          console.log("❓ Question update:", data);
          events.onQuestionUpdate!(data || {});
        });

      if (events.onQuestionChange)
        socket.on("questionChange", data => {
          console.log("🔄 Question changed:", data);
          events.onQuestionChange!(data || {});
        });

      if (events.onAnswerSubmitted)
        socket.on("answerSubmitted", data => {
          console.log("✍️ Answer submitted:", data);
          events.onAnswerSubmitted!(data || {});
        });

      if (events.onQuizEnd)
        socket.on("quizEnded", data => {
          console.log("🏁 Quiz ended:", data);
          events.onQuizEnd!(data || {});
        });

      if (events.onLeaderboardUpdate)
        socket.on("leaderboardUpdate", data => {
          console.log("🏆 Leaderboard updated:", data);
          events.onLeaderboardUpdate!(data || {});
        });

      if (events.onTimeUp)
        socket.on("timeUp", () => {
          console.log("⏲️ Time up");
          events.onTimeUp!();
        });

      socket.on("error", error => {
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
      events.onError?.("Failed to initialize socket connection");
      return;
    }
  }, [roomId, events]);

  // Socket methods
  const joinRoom = useCallback((roomId: string, userId?: string, userName?: string) => {
    const socket = socketRef.current;
    if (!socket) { console.warn("⚠️ Socket not connected"); return; }

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
    if (!socket) { console.warn("⚠️ Socket not connected"); return; }
    try {
      console.log("🚪 Leaving room:", roomId);
      socket.emit("leaveRoom", { roomId });
    } catch (error) {
      console.error("❌ Failed to leave room:", error);
      events.onError?.("Failed to leave room");
    }
  }, [events.onError]);

  const submitAnswer = useCallback((data: any) => {
    const socket = socketRef.current;
    if (!socket) { console.warn("⚠️ Socket not connected"); return; }
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
    if (!socket) { console.warn("⚠️ Socket not connected"); return; }
    try {
      console.log("🎯 Starting quiz:", data);
      socket.emit("startQuiz", data);
    } catch (error) {
      console.error("❌ Failed to start quiz:", error);
      events.onError?.("Failed to start quiz");
    }
  }, [events.onError]);

  // END QUIZ SUPPORT
  const endQuiz = useCallback((data: any) => {
    const socket = socketRef.current;
    if (!socket) { console.warn("⚠️ Socket not connected"); return; }
    try {
      console.log("🛑 Ending quiz:", data);
      socket.emit("endQuiz", data);
    } catch (error) {
      console.error("❌ Failed to end quiz:", error);
      events.onError?.("Failed to end quiz");
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
    isConnected: checkIsConnected,
    disconnect,
  };
};

export default useSocket;
