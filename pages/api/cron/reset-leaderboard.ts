import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await prisma.roomLeaderboard.updateMany({
      data: { dailyScore: 0 },
    });
    res.status(200).json({ message: "Leaderboards reset" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Reset failed" });
  }
}
