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
        origin: process.env.SOCKET_IO_CORS_ORIGIN || "http://localhost:3000",
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
    const MAX_CONNECTIONS_PER_IP = 5;

    // Connection handling
    io.on("connection", (socket) => {
      const clientIP = socket.handshake.address;
      
      // Rate limiting
      const currentConnections = connectionCounts.get(clientIP) || 0;
      if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
        console.warn(`Rate limit exceeded for IP: ${clientIP}`);
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
          
          // Notify room about new participant
          socket.to(roomId).emit("userJoined", { 
            socketId: socket.id,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error joining room:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Handle answer submissions
      socket.on("answerSubmitted", async (payload) => {
        try {
          const { roomId, userId, questionId, answer, timeLeft } = payload;
          
          // Validate payload
          if (!roomId || !userId || !questionId) {
            socket.emit('error', { message: 'Invalid answer data' });
            return;
          }

          console.log(`📨 Answer submitted by ${userId} for question ${questionId}`);
          
          // Broadcast to room
          io.to(roomId).emit("updateParticipants", {
            userId,
            questionId,
            answer,
            timeLeft,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error handling answer submission:', error);
          socket.emit('error', { message: 'Failed to submit answer' });
        }
      });

      // Quiz control events
      socket.on("startQuiz", (data) => {
        try {
          const { roomId, sessionId } = data;
          if (!roomId) return;
          
          console.log(`🎯 Quiz started in room ${roomId}`);
          io.to(roomId).emit("quizStarted", { 
            sessionId,
            timestamp: new Date().toISOString() 
          });
        } catch (error) {
          console.error('Error starting quiz:', error);
        }
      });

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
          console.error('Error changing question:', error);
        }
      });

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
          console.error('Error ending quiz:', error);
        }
      });

      // Handle participant updates
      socket.on("participantUpdate", (payload) => {
        try {
          const { roomId, participants } = payload;
          if (!roomId || !Array.isArray(participants)) return;
          
          io.to(roomId).emit("updateParticipants", participants);
        } catch (error) {
          console.error('Error updating participants:', error);
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
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });

    res.socket.server.io = io;
  }
  
  res.end();
}
