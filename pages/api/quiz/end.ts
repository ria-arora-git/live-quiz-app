import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required" });
    }

    // Verify room ownership
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.createdBy !== userId) {
      return res.status(403).json({ error: "Only the host can end the quiz" });
    }

    // End all active sessions for this room
    await prisma.quizSession.updateMany({
      where: { roomId, isActive: true },
      data: { 
        isActive: false,
        endedAt: new Date(),
      },
    });

    // Get final results for leaderboard
    const results = await prisma.quizResult.findMany({
      where: { 
        session: { roomId } 
      },
      include: { 
        user: {
          select: { name: true, email: true, clerkId: true }
        }
      },
      orderBy: { score: "desc" },
    });

    // Create leaderboard
    const leaderboard = results.map((result, index) => ({
      userId: result.userId,
      name: result.user.name || result.user.email || "Anonymous",
      score: result.score,
      rank: index + 1,
    }));

    // Get user stats (for individual participants)
    const userStats = results.reduce((acc, result) => {
      const answers = result.answers as any;
      const correctCount = Object.values(answers).filter((a: any) => a.isCorrect).length;
      const totalQuestions = Object.keys(answers).length;
      
      acc[result.userId] = {
        score: result.score,
        correct: correctCount,
        total: totalQuestions,
        accuracy: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
      };
      return acc;
    }, {} as Record<string, any>);

    // Emit quiz end event
    if (res.socket.server.io) {
      res.socket.server.io.to(roomId).emit("quizEnded", { 
        leaderboard, 
        userStats,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({ 
      message: "Quiz ended successfully", 
      leaderboard,
      userStats,
    });
  } catch (error) {
    console.error("Error ending quiz:", error);
    return res.status(500).json({ error: "Failed to end quiz" });
  }
}
