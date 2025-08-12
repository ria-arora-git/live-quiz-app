import { Server as IOServer } from "socket.io";
import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";

export const config = { api: { bodyParser: false } };

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log("🔌 Starting Socket.IO server...");
    const io = new IOServer(res.socket.server, { path: "/api/socket" });

    io.on("connection", (socket) => {
      console.log("🟢 Client connected:", socket.id);

      socket.on("joinRoom", (roomId: string) => {
        if (!roomId) {
          console.warn("⚠ joinRoom called without roomId");
          return;
        }
        socket.join(roomId);
        console.log(`📥 ${socket.id} joined room ${roomId}`);
      });

      socket.on("answerSubmitted", (payload) => {
        io.to(payload.roomId).emit("updateParticipants", payload.participants);
      });

      socket.on("disconnect", () => {
        console.log("🔴 Client disconnected:", socket.id);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}
