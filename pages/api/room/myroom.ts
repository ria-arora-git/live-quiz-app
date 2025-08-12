import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const room = await prisma.room.findFirst({
      where: { createdBy: userId },
    });

    return res.status(200).json({ room });
  } catch (error) {
    console.error("Error fetching my room:", error);
    return res.status(500).json({ error: "Failed to fetch room" });
  }
}
