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

    // Verify room exists and user is the owner
    const room = await prisma.room.findUnique({ 
      where: { id: roomId },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.createdBy !== userId) {
      return res.status(403).json({ error: "Not authorized to start this quiz" });
    }

    if (!room.isActive) {
      return res.status(400).json({ error: "Room is not active" });
    }

    // Check if room has questions
    if (room._count.questions === 0) {
      return res.status(400).json({ 
        error: "Cannot start quiz without questions. Please add questions first." 
      });
    }

    // Update room settings if provided
    if (questionCount || timePerQuestion) {
      await prisma.room.update({
        where: { id: roomId },
        data: {
          ...(questionCount && { questionCount }),
          ...(timePerQuestion && { timePerQuestion }),
        },
      });
    }

    // End any existing active sessions
    await prisma.quizSession.updateMany({
      where: { 
        roomId, 
        isActive: true 
      },
      data: { 
        isActive: false, 
        endedAt: new Date() 
      },
    });

    // Create new quiz session
    const session = await prisma.quizSession.create({
      data: { 
        roomId, 
        isActive: true, 
        participants: [], 
        currentIndex: 0,
        startedAt: new Date(),
      },
      include: {
        room: true,
      }
    });

    // Emit quiz start event to all participants
    if (res.socket.server.io) {
      res.socket.server.io.to(roomId).emit("quizStarted", { 
        sessionId: session.id,
        roomId,
        timestamp: session.startedAt?.toISOString(),
      });
    }

    return res.status(200).json({ session });
  } catch (error) {
    console.error("Error starting quiz:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: "Failed to start quiz" });
  }
}
