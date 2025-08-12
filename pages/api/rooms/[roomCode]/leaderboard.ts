import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { roomCode } = req.query;
  if (!roomCode || typeof roomCode !== "string") {
    return res.status(400).json({ message: "Room code required" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const leaderboard = await prisma.roomLeaderboard.findMany({
      where: { roomId: room.id, date: today },
      include: { user: true },
      orderBy: [{ dailyScore: "desc" }, { allTimeScore: "desc" }]
    });

    res.status(200).json(leaderboard);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error fetching leaderboard" });
  }
}
