import { Server as IOServer } from "socket.io";
import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";
import prisma from "@/lib/prisma";

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
        origin: process.env.NODE_ENV === "production" 
          ? [process.env.NEXT_PUBLIC_APP_URL || ""] 
          : ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
    });

    // Rate limiting per socket
    const connectionCounts = new Map();
    const MAX_CONNECTIONS_PER_IP = 10;

    // Connection handling
    io.on("connection", (socket) => {
      const clientIP = socket.handshake.address;
      
      // Rate limiting
      const currentConnections = connectionCounts.get(clientIP) || 0;
      if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
        console.warn(`⚠️ Rate limit exceeded for IP: ${clientIP}`);
        socket.emit('error', { message: 'Too many connections from this IP' });
        socket.disconnect(true);
        return;
      }
      
      connectionCounts.set(clientIP, currentConnections + 1);
      console.log(`🟢 Client connected: ${socket.id} from ${clientIP}`);
      
      // Join room with validation
      socket.on("joinRoom", async (roomId: string) => {
        try {
          if (!roomId || typeof roomId !== 'string' || roomId.length > 50) {
            socket.emit('error', { message: 'Invalid room ID' });
            return;
          }
          
          socket.join(roomId);
          console.log(`📥 ${socket.id} joined room ${roomId}`);
          
          // Get and broadcast updated participant list
          await broadcastParticipants(io, roomId);
          
          // Confirm room join to client
          socket.emit("roomJoined", { roomId, socketId: socket.id });
        } catch (error) {
          console.error('❌ Error joining room:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Handle quiz start broadcasting
      socket.on("startQuiz", (data) => {
        try {
          const { roomId, sessionId } = data;
          if (!roomId || !sessionId) {
            console.error("❌ Missing roomId or sessionId in startQuiz event");
            return;
          }
          
          console.log(`🎯 Broadcasting quiz start to room ${roomId} with sessionId ${sessionId}`);
          
          // Emit to ALL clients in the room
          io.to(roomId).emit("quizStarted", {
            sessionId,
            roomId,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('❌ Error broadcasting quiz start:', error);
        }
      });

      // Handle next question
      socket.on("nextQuestion", (payload) => {
        try {
          const { roomId, questionIndex, question, timeLimit } = payload;
          if (!roomId) return;
          
          console.log(`➡️ Next question in room ${roomId}: ${questionIndex}`);
          io.to(roomId).emit("questionChanged", { 
            questionIndex, 
            question,
            timeLimit,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('❌ Error changing question:', error);
        }
      });

      // Handle quiz end
      socket.on("endQuiz", (payload) => {
        try {
          const { roomId, leaderboard, userStats } = payload;
          if (!roomId) return;
          
          console.log(`🏁 Quiz ended in room ${roomId}`);
          io.to(roomId).emit("quizEnded", { 
            leaderboard, 
            userStats,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('❌ Error ending quiz:', error);
        }
      });

      // Disconnect handling
      socket.on("disconnect", (reason) => {
        const clientIP = socket.handshake.address;
        const currentConnections = connectionCounts.get(clientIP) || 0;
        connectionCounts.set(clientIP, Math.max(0, currentConnections - 1));
        
        console.log(`🔴 Client disconnected: ${socket.id}, reason: ${reason}`);
      });

      // Error handling
      socket.on("error", (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });

    res.socket.server.io = io;
  }
  
  res.end();
}

// Helper function to broadcast participant updates
async function broadcastParticipants(io: IOServer, roomId: string) {
  try {
    // Get active session for the room
    const session = await prisma.quizSession.findFirst({
      where: { roomId, isActive: true },
      orderBy: { createdAt: "desc" }
    });

    if (!session) return;

    // Get participant details
    const participants = await prisma.user.findMany({
      where: { clerkId: { in: session.participants } },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
      }
    });

    console.log(`📊 Broadcasting ${participants.length} participants to room ${roomId}`);
    io.to(roomId).emit("updateParticipants", participants);
  } catch (error) {
    console.error("❌ Error broadcasting participants:", error);
  }
}