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
    fetch("/api/socket");
    const socket = io({ path: "/api/socket" });
    socketRef.current = socket;

    socket.on("connect", () => {
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, onParticipantsUpdate, onQuizEnd, onQuizStart]);

  return socketRef;
}
