// pages/api/quiz/end.ts
import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ error: "Missing roomId" });

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.createdBy !== userId) return res.status(403).json({ error: "Only host can end quiz" });

    // Mark all sessions inactive
    await prisma.quizSession.updateMany({
      where: { roomId, isActive: true },
      data: { isActive: false },
    });

    // Prepare leaderboard & stats
    const results = await prisma.result.findMany({
      where: { session: { roomId } },
      include: { user: true },
      orderBy: { score: "desc" },
    });

    const leaderboard = results.map(r => ({
      userId: r.userId,
      name: r.user.name || r.user.email,
      score: r.score,
    }));

    const userStats = {}; // You can shape this per user if needed

    // Emit real-time quizEnded event
    if (res.socket.server.io) {
      res.socket.server.io.to(roomId).emit("quizEnded", { leaderboard, userStats });
    }

    return res.status(200).json({ message: "Quiz ended", leaderboard });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
