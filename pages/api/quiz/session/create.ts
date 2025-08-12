import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method Not Allowed" });

  const auth = getAuth(req);
  const userId = auth.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { name } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "Room name is required" });
  }

  try {
    // Ensure user exists in database
    await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: auth.sessionClaims?.email as string || `user-${userId}@quiz.app`,
        name: auth.sessionClaims?.name as string || "Player"
      }
    });

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = await prisma.room.create({
      data: {
        name,
        code,
        createdBy: userId,
      },
    });
    
    res.status(200).json(room);
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ message: "Could not create room" });
  }
}
