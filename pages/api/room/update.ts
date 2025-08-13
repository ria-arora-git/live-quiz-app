import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateRoomSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  questionCount: z.number().min(1).max(50).optional(),
  timePerQuestion: z.number().min(5).max(300).optional(),
  maxParticipants: z.number().min(1).max(100).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { roomId, name, questionCount, timePerQuestion, maxParticipants } = 
      updateRoomSchema.parse(req.body);

    // Verify room exists and user is the owner
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.createdBy !== userId) {
      return res.status(403).json({ error: "Not authorized to update this room" });
    }

    // Update room
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(name && { name }),
        ...(questionCount && { questionCount }),
        ...(timePerQuestion && { timePerQuestion }),
        ...(maxParticipants && { maxParticipants }),
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({ room: updatedRoom });
  } catch (error) {
    console.error("Error updating room:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: "Failed to update room" });
  }
}
