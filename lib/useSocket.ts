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
    
    const initSocket = async () => {
      // Initialize socket endpoint
      await fetch("/api/socket");
      
      const socket = io({ 
        path: "/api/socket",
        transports: ["websocket", "polling"],
        timeout: 60000,
        forceNew: true,
      });
      
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Connected to socket server");
        socket.emit("joinRoom", roomId);
      });

      socket.on("updateParticipants", (list) => {
        if (onParticipantsUpdate) onParticipantsUpdate(list);
      });

      socket.on("quizEnded", (payload) => {
        if (onQuizEnd) onQuizEnd(payload);
      });

      socket.on("quizStarted", (data) => {
        if (onQuizStart) onQuizStart(data);
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });

      socket.on("disconnect", (reason) => {
        console.log("Disconnected from socket server:", reason);
      });
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, onParticipantsUpdate, onQuizEnd, onQuizStart]);

  return socketRef;
}
