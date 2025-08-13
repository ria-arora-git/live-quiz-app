import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { roomId } = req.query;

  if (!roomId || typeof roomId !== "string") {
    return res.status(400).json({ error: "Invalid roomId" });
  }

  try {
    switch (req.method) {
      case "GET":
        return await handleGet(res, roomId);
      case "PUT":
        return await handleUpdate(req, res, roomId);
      case "DELETE":
        return await handleDelete(req, res, roomId);
      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Room API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET a single room with creator and question count
 */
async function handleGet(res: NextApiResponse, roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
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

  return res.status(200).json({ room });
}

/**
 * UPDATE room settings (only room owner can update)
 */
async function handleUpdate(req: NextApiRequest, res: NextApiResponse, roomId: string) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (room.createdBy !== userId) {
    return res.status(403).json({ error: "Not authorized to update this room" });
  }

  const { name, questionCount, timePerQuestion, maxParticipants } = req.body;

  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: {
      ...(name ? { name } : {}),
      ...(typeof questionCount === "number" ? { questionCount } : {}),
      ...(typeof timePerQuestion === "number" ? { timePerQuestion } : {}),
      ...(typeof maxParticipants === "number" ? { maxParticipants } : {}),
      updatedAt: new Date(),
    },
  });

  return res.status(200).json({ room: updatedRoom });
}

/**
 * SOFT DELETE room (deactivate instead of removing)
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse, roomId: string) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (room.createdBy !== userId) {
    return res.status(403).json({ error: "Not authorized to delete this room" });
  }

  await prisma.room.update({
    where: { id: roomId },
    data: { isActive: false, updatedAt: new Date() }
  });

  return res.status(200).json({ message: "Room deactivated successfully" });
}
