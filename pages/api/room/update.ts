// pages/api/room/update.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { roomId, questionCount, timePerQuestion } = req.body;

  if (!roomId || !questionCount || !timePerQuestion) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.createdBy !== userId) {
      return res.status(403).json({ error: "You are not the owner of this room" });
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        questionCount,
        timePerQuestion,
      },
    });

    return res.status(200).json({ room: updatedRoom });
  } catch (error) {
    console.error("Error updating room:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
