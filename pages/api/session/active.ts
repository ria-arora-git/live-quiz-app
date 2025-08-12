import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { roomId, sessionId } = req.query;

  if (!roomId || typeof roomId !== "string") {
    return res.status(400).json({ error: "Invalid roomId" });
  }

  try {
    let session = null;

    // If sessionId is provided -> fetch exact session
    if (sessionId && typeof sessionId === "string") {
      session = await prisma.quizSession.findUnique({
        where: { id: sessionId },
        include: {
          room: true,
          results: { include: { user: true } },
        },
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
    } else {
      // Default: fetch latest active session for the room
      session = await prisma.quizSession.findFirst({
        where: { roomId, isActive: true },
        include: {
          room: true,
          results: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Auto-create a session if none exists
      if (!session) {
        const roomExists = await prisma.room.findUnique({ where: { id: roomId } });
        if (!roomExists) {
          return res.status(404).json({ error: "Room not found" });
        }

        session = await prisma.quizSession.create({
          data: {
            roomId,
            isActive: true,
            currentIndex: 0,
            participants: [],
          },
          include: {
            room: true,
            results: { include: { user: true } },
          },
        });
      }
    }

    // Fetch participant user details
    const participants = await prisma.user.findMany({
      where: { clerkId: { in: session.participants } },
    });

    return res.status(200).json({
      session: { ...session, participants },
    });
  } catch (error) {
    console.error("Error in /api/session/active:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
