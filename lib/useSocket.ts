"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export default function useSocket(
  roomId: string,
  onParticipantsUpdate?: (participants: any[]) => void,
  onQuizEnd?: (payload: any) => void,
  onQuizStart?: (data: any) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initializeSocket = useCallback(async () => {
    if (!roomId) return;
    
    console.log(`🔌 Initializing socket for room: ${roomId}`);

    try {
      // First ensure the socket server is initialized
      await fetch("/api/socket", { method: "GET" });
      
      // Disconnect existing socket if any
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
        reconnectionAttempts: 5,
        maxReconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log(`🟢 Connected to socket server with ID: ${socket.id}`);
        
        // Join room after successful connection
        socket.emit("joinRoom", roomId);
      });

      socket.on("roomJoined", (data) => {
        console.log(`✅ Successfully joined room ${data.roomId}`);
      });

      socket.on("updateParticipants", (participants) => {
        console.log("👥 Participants updated:", participants);
        onParticipantsUpdate?.(participants);
      });

      socket.on("quizStarted", (data) => {
        console.log("🎯 QUIZ STARTED EVENT RECEIVED:", data);
        onQuizStart?.(data);
      });

      socket.on("quizEnded", (payload) => {
        console.log("🏁 Quiz ended:", payload);
        onQuizEnd?.(payload);
      });

      socket.on("disconnect", (reason) => {
        console.log(`🔴 Disconnected from socket server: ${reason}`);
        
        // Attempt to reconnect after a delay for certain disconnect reasons
        if (reason === "io server disconnect" || reason === "transport close") {
          console.log("🔄 Attempting to reconnect...");
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!socket.connected) {
              socket.connect();
            }
          }, 2000);
        }
      });

      socket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
      });

      socket.on("error", (error) => {
        console.error("❌ Socket error:", error);
      });

      // Listen for any event (debugging)
      socket.onAny((event, ...args) => {
        console.log(`📨 Socket event received: ${event}`, args);
      });

    } catch (error) {
      console.error("❌ Failed to initialize socket:", error);
    }
  }, [roomId, onParticipantsUpdate, onQuizEnd, onQuizStart]);

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

  // Return socket reference for manual operations
  return socketRef;
}