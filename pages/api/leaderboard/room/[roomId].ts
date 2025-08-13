import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getTodayDateString } from "@/lib/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { roomId } = req.query;
  const { period = "daily" } = req.query;

  if (!roomId || typeof roomId !== "string") {
    return res.status(400).json({ error: "Room ID is required" });
  }

  try {
    const today = getTodayDateString();
    
    let whereClause: any = { roomId };
    let orderBy: any = { dailyScore: "desc" };

    if (period === "all-time") {
      orderBy = { allTimeScore: "desc" };
    } else {
      whereClause.date = today;
    }

    const leaderboard = await prisma.roomLeaderboard.findMany({
      where: whereClause,
      orderBy: [orderBy, { createdAt: "desc" }],
      include: { 
        user: {
          select: { name: true, email: true }
        }
      },
      take: 100, // Limit to top 100
    });

    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error("Error fetching room leaderboard:", error);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}
