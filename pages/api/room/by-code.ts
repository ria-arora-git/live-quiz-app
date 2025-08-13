import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Invalid code" });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { 
        code: code.toUpperCase(),
      },
      include: {
        creator: {
          select: { name: true, email: true }
        },
        _count: {
          select: { questions: true }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (!room.isActive) {
      return res.status(410).json({ error: "Room is no longer active" });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error("Error finding room by code:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
