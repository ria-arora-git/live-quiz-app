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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { roomId, questionCount, timePerQuestion } = startQuizSchema.parse(req.body);
    console.log(`🚀 Starting quiz for room ${roomId} by user ${userId}`);

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { _count: { select: { questions: true } } }
    });
    
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.createdBy !== userId) return res.status(403).json({ error: "Not authorized" });
    if (room._count.questions === 0) return res.status(400).json({ error: "Add questions first" });

    // Update settings
    await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(questionCount && { questionCount }),
        ...(timePerQuestion && { timePerQuestion }),
      },
    });

    // End previous sessions
    await prisma.quizSession.updateMany({
      where: { roomId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    // Create new session
    const session = await prisma.quizSession.create({
      data: {
        roomId,
        isActive: true,
        participants: [],
        currentIndex: 0,
        startedAt: new Date(),
      },
    });

    console.log(`✅ Created session ${session.id} for room ${roomId}`);

    // Emit via Socket.IO server directly
    if (res.socket.server.io) {
      console.log(`📡 Emitting quizStarted to room ${roomId} with sessionId ${session.id}`);
      res.socket.server.io.to(roomId).emit("quizStarted", {
        sessionId: session.id,
        roomId,
        timestamp: session.startedAt?.toISOString(),
      });
      
      // Also emit via the startQuiz event for good measure
      res.socket.server.io.emit("startQuiz", {
        roomId,
        sessionId: session.id,
      });
    } else {
      console.error("❌ Socket.IO server not initialized!");
    }

    return res.status(200).json({ session });
  } catch (err) {
    console.error("❌ Start Quiz API Error:", err);
    return res.status(500).json({ error: "Failed to start quiz" });
  }
}
