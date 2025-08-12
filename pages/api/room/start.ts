// pages/api/room/start.ts
import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { roomId, questionCount, timePerQuestion } = req.body;
  if (!roomId) return res.status(400).json({ error: "Invalid roomId" });

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.createdBy !== userId) return res.status(403).json({ error: "Not your room" });

    await prisma.room.update({
      where: { id: roomId },
      data: { questionCount, timePerQuestion },
    });

    // End any old session
    await prisma.quizSession.updateMany({
      where: { roomId, isActive: true },
      data: { isActive: false },
    });

    // Create a new active session
    const session = await prisma.quizSession.create({
      data: { roomId, isActive: true, participants: [], currentIndex: 0 },
    });

    // 🔹 Emit quizStarted for real-time waiting rooms
    if (res.socket.server.io) {
      res.socket.server.io.to(roomId).emit("quizStarted", { sessionId: session.id });
    }

    return res.status(200).json({ session });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
