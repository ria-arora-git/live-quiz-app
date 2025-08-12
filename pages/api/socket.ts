// pages/api/socket.ts
import { Server as IOServer } from "socket.io";
import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";

export const config = {
  api: {
    bodyParser: false, // Socket.IO requires raw upgrade
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log("🔌 Initializing Socket.IO server...");
    const io = new IOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {
      console.log("🟢 Client connected:", socket.id);

      socket.on("joinRoom", (roomId: string) => {
        socket.join(roomId);
        console.log(`📥 ${socket.id} joined room ${roomId}`);
      });

      socket.on("answerSubmitted", (payload) => {
        console.log("📨 Answer submitted:", payload);
        // Broadcast new participant data to room
        io.to(payload.roomId).emit("updateParticipants", payload.participants);
      });

      socket.on("quizStarted", (roomId: string) => {
        io.to(roomId).emit("quizStarted");
      });

      socket.on("disconnect", () => {
        console.log("🔴 Client disconnected:", socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
