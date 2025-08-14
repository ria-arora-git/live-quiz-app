import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { roomId } = req.query;

    if (!roomId || typeof roomId !== "string") {
      return res.status(400).json({ error: "Room ID is required" });
    }

    // Get the most recent session for this room
    const session = await prisma.quizSession.findFirst({
      where: { roomId },
      orderBy: { createdAt: "desc" }
    });

    if (!session) {
      return res.status(200).json({ participants: [] });
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

    // Broadcast to all clients in room if Socket.IO is available
    if (res.socket.server.io) {
      console.log(`📊 Broadcasting ${participants.length} participants to room ${roomId}`);
      res.socket.server.io.to(roomId).emit("updateParticipants", participants);
    }

    return res.status(200).json({ 
      participants,
      sessionId: session.id,
      count: participants.length
    });
  } catch (error) {
    console.error("❌ Error fetching participants:", error);
    return res.status(500).json({ error: "Failed to fetch participants" });
  }
}