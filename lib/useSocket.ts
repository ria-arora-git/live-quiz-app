"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export default function useSocket(
  roomId: string,
  onParticipantsUpdate?: (participants: any[]) => void,
  onQuizEnd?: (payload: any) => void,
  onQuizStart?: (data: any) => void
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;
    
    console.log(`🔌 Initializing socket for room: ${roomId}`);

    const initSocket = async () => {
      // Initialize socket server
      await fetch("/api/socket");
      
      const socket = io({ 
        path: "/api/socket", 
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log(`🟢 Connected to socket server with ID: ${socket.id}`);
        socket.emit("joinRoom", roomId);
      });

      socket.on("roomJoined", (data) => {
        console.log(`✅ Successfully joined room ${data.roomId}`);
      });

      socket.on("updateParticipants", (list) => {
        console.log("👥 Participants updated:", list);
        onParticipantsUpdate?.(list);
      });

      socket.on("quizStarted", (data) => {
        console.log("🎯 QUIZ STARTED EVENT RECEIVED:", data);
        console.log("🔄 Calling onQuizStart with data:", data);
        onQuizStart?.(data);
      });

      socket.on("quizEnded", (payload) => {
        console.log("🏁 Quiz ended:", payload);
        onQuizEnd?.(payload);
      });

      socket.on("disconnect", (reason) => {
        console.log(`🔴 Disconnected from socket server: ${reason}`);
      });

      socket.on("error", (error) => {
        console.error("❌ Socket error:", error);
      });

      // Listen for any event (debugging)
      socket.onAny((event, ...args) => {
        console.log(`📨 Socket event received: ${event}`, args);
      });
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        console.log("🔌 Disconnecting socket");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, onParticipantsUpdate, onQuizEnd, onQuizStart]);

  return socketRef;
}
