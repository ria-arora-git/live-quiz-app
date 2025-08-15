import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const startQuizSchema = z.object({
  roomId: z.string().min(1),
  questionCount: z.number().min(1).max(50).optional(),
  timePerQuestion: z.number().min(5).max(300).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { roomId, questionCount, timePerQuestion } = startQuizSchema.parse(req.body);
    console.log(`🚀 Host starting quiz for room ${roomId}`);

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

    // Get questions
    const questions = await prisma.question.findMany({
      where: { roomId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      take: questionCount || room.questionCount
    });

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
    }

    // Create/update quiz session
    let session = await prisma.quizSession.findFirst({
      where: { roomId },
      orderBy: { createdAt: "desc" }
    });

    if (session) {
      session = await prisma.quizSession.update({
        where: { id: session.id },
        data: { 
          isActive: true,
          startedAt: new Date(),
          currentIndex: 0,
        },
      });
    } else {
      session = await prisma.quizSession.create({
        data: {
          roomId,
          isActive: true,
          participants: [],
          currentIndex: 0,
          startedAt: new Date(),
        },
      });
    }

    // Call Railway backend to start quiz with socket events
    const RAILWAY_BACKEND = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    
    try {
      const backendRes = await fetch(`${RAILWAY_BACKEND}/api/quiz/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          questions,
          timePerQuestion: timePerQuestion || room.timePerQuestion,
        }),
      });

      if (!backendRes.ok) {
        throw new Error("Backend failed to start quiz");
      }

      console.log(`✅ Quiz started successfully via backend for room ${roomId}`);
    } catch (backendError) {
      console.error("❌ Backend start quiz error:", backendError);
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
