import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const startQuizSchema = z.object({
  roomId: z.string().min(1),
  questionCount: z.number().min(1).max(50).optional(),
  timePerQuestion: z.number().min(5).max(300).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { roomId, questionCount, timePerQuestion } = startQuizSchema.parse(req.body);
    console.log(`🚀 Starting quiz for room ${roomId} by user ${userId}`);

    // Get room and verify ownership
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { _count: { select: { questions: true } } }
    });
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.createdBy !== userId) {
      return res.status(403).json({ error: "Not authorized to start this quiz" });
    }

    if (room._count.questions === 0) {
      return res.status(400).json({ error: "Please add at least one question before starting the quiz" });
    }

    // Update room settings if provided
    if (questionCount || timePerQuestion) {
      await prisma.room.update({
        where: { id: roomId },
        data: {
          ...(questionCount && { questionCount }),
          ...(timePerQuestion && { timePerQuestion }),
          updatedAt: new Date(),
        },
      });
      console.log(`⚙️ Updated room settings for ${roomId}`);
    }

    // Find existing session or create new one
    let session = await prisma.quizSession.findFirst({
      where: { roomId },
      orderBy: { createdAt: "desc" }
    });

    if (session) {
      // Activate existing session
      session = await prisma.quizSession.update({
        where: { id: session.id },
        data: { 
          isActive: true,
          startedAt: new Date(),
          currentIndex: 0,
        },
      });
      console.log(`✅ Activated existing session ${session.id} for room ${roomId}`);
    } else {
      // Create new session if none exists
      session = await prisma.quizSession.create({
        data: {
          roomId,
          isActive: true,
          participants: [],
          currentIndex: 0,
          startedAt: new Date(),
        },
      });
      console.log(`✅ Created new active session ${session.id} for room ${roomId}`);
    }

    // Emit quiz start event via Socket.IO
    if (res.socket.server.io) {
      console.log(`📡 Emitting quizStarted to room ${roomId} with sessionId ${session.id}`);
      
      // Emit using the startQuiz event which is handled by socket server
      res.socket.server.io.emit("startQuiz", {
        roomId,
        sessionId: session.id,
      });

      // Also emit directly to the room
      res.socket.server.io.to(roomId).emit("quizStarted", {
        sessionId: session.id,
        roomId,
        timestamp: session.startedAt?.toISOString(),
      });

      console.log(`🎯 Quiz start events emitted for room ${roomId}`);
    } else {
      console.error("❌ Socket.IO server not initialized!");
      return res.status(500).json({ error: "Real-time server not available" });
    }

    return res.status(200).json({ 
      session: {
        id: session.id,
        roomId: session.roomId,
        isActive: session.isActive,
        startedAt: session.startedAt,
        participantCount: session.participants.length
      },
      message: "Quiz started successfully"
    });
  } catch (error) {
    console.error("❌ Start Quiz API Error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: "Failed to start quiz" });
  }
}