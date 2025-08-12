import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Optional: accept ?roomCode=ROOMCODE as a query param to filter, but for simplicity, fetch all for now
  try {
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];

    const leaderboard = await prisma.roomLeaderboard.findMany({
      where: {
        date: todayISO,
      },
      orderBy: [{ dailyScore: "desc" }, { allTimeScore: "desc" }],
      include: { user: true },
      take: 20,
    });

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error("Leaderboard fetch error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
