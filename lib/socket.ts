import { Server as IOServer } from "socket.io";
import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log("🔌 Initializing Socket.IO server...");
    
    const io = new IOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    io.on("connection", (socket) => {
      console.log(`🟢 Client connected: ${socket.id}`);
      
      socket.on("joinRoom", async (roomId: string) => {
        try {
          socket.join(roomId);
          console.log(`📥 ${socket.id} joined room ${roomId}`);
          
          // Send confirmation back to client
          socket.emit("roomJoined", { roomId, socketId: socket.id });
          
          // Notify others in room
          socket.to(roomId).emit("userJoined", { 
            socketId: socket.id,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error joining room:', error);
        }
      });

      socket.on("startQuiz", (data) => {
        const { roomId, sessionId } = data;
        console.log(`🎯 Broadcasting quiz start to room ${roomId} with sessionId ${sessionId}`);
        
        // Emit to ALL clients in the room (including sender)
        io.to(roomId).emit("quizStarted", {
          sessionId,
          roomId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on("disconnect", (reason) => {
        console.log(`🔴 Client disconnected: ${socket.id}, reason: ${reason}`);
      });

      socket.on("error", (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });

    res.socket.server.io = io;
  }
  
  res.end();
}
