import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { roomId, sessionId } = req.query;

  if (!roomId || typeof roomId !== "string") {
    return res.status(400).json({ error: "Room ID is required" });
  }

  try {
    let session = null;

    // If specific sessionId provided, fetch that session
    if (sessionId && typeof sessionId === "string") {
      session = await prisma.quizSession.findUnique({
        where: { id: sessionId },
        include: {
          room: true,
          results: { 
            include: { 
              user: {
                select: { name: true, email: true, clerkId: true }
              }
            } 
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
    } else {
      // Find most recent active session for the room
      session = await prisma.quizSession.findFirst({
        where: { roomId, isActive: true },
        include: {
          room: true,
          results: { 
            include: { 
              user: {
                select: { name: true, email: true, clerkId: true }
              }
            } 
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!session) {
        return res.status(404).json({ error: "No active session found" });
      }
    }

    // Get participant details
    const participants = await prisma.user.findMany({
      where: { clerkId: { in: session.participants } },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
      }
    });

    // Add participants to session data
    const sessionWithParticipants = {
      ...session,
      participants: participants,
    };

    return res.status(200).json({ session: sessionWithParticipants });
  } catch (error) {
    console.error("Error in /api/session/active:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
