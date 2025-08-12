import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { roomId } = req.query;

  if (!roomId || typeof roomId !== "string") {
    return res.status(400).json({ error: "Invalid roomId" });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error("Error fetching room:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
