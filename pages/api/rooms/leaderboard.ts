import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const leaderboard = await prisma.roomLeaderboard.findMany({
      where: { date: today },
      include: { user: true },
      orderBy: [{ dailyScore: "desc" }, { allTimeScore: "desc" }],
      take: 20
    });
    res.status(200).json(leaderboard);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error fetching leaderboard" });
  }
}
