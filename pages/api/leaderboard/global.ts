import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getTodayDateString } from "@/lib/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { period = "daily" } = req.query;

  try {
    const today = getTodayDateString();
    
    if (period === "daily") {
      // Daily global leaderboard
      const dailyLeaderboard = await prisma.roomLeaderboard.groupBy({
        by: ['userId'],
        where: { date: today },
        _sum: { dailyScore: true },
        orderBy: { _sum: { dailyScore: "desc" } },
        take: 50,
      });

      // Get user details
      const userIds = dailyLeaderboard.map(entry => entry.userId);
      const users = await prisma.user.findMany({
        where: { clerkId: { in: userIds } },
        select: { clerkId: true, name: true, email: true }
      });

      const leaderboard = dailyLeaderboard.map(entry => {
        const user = users.find(u => u.clerkId === entry.userId);
        return {
          userId: entry.userId,
          name: user?.name || user?.email || "Anonymous",
          score: entry._sum.dailyScore || 0,
          period: "daily"
        };
      });

      return res.status(200).json(leaderboard);
    } else {
      // All-time global leaderboard
      const allTimeLeaderboard = await prisma.roomLeaderboard.groupBy({
        by: ['userId'],
        _sum: { allTimeScore: true },
        orderBy: { _sum: { allTimeScore: "desc" } },
        take: 50,
      });

      // Get user details
      const userIds = allTimeLeaderboard.map(entry => entry.userId);
      const users = await prisma.user.findMany({
        where: { clerkId: { in: userIds } },
        select: { clerkId: true, name: true, email: true }
      });

      const leaderboard = allTimeLeaderboard.map(entry => {
        const user = users.find(u => u.clerkId === entry.userId);
        return {
          userId: entry.userId,
          name: user?.name || user?.email || "Anonymous",
          score: entry._sum.allTimeScore || 0,
          period: "all-time"
        };
      });

      return res.status(200).json(leaderboard);
    }
  } catch (error) {
    console.error("Error fetching global leaderboard:", error);
    return res.status(500).json({ error: "Failed to fetch global leaderboard" });
  }
}
