import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { generateRoomCode } from "@/lib/utils";

const createRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  questionCount: z.number().min(1).max(50).default(5),
  timePerQuestion: z.number().min(5).max(300).default(30),
  maxParticipants: z.number().min(1).max(100).default(50),
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

    // Validate and parse input
    const body = createRoomSchema.parse(req.body);
    const { name, questionCount, timePerQuestion, maxParticipants } = body;

    // Ensure user exists in database
    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      const clerkUser = await clerkClient().users.getUser(userId);
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || `user-${userId}@quiz.app`,
          name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "Host",
        },
      });
    }

    // Check for existing active room
    let room = await prisma.room.findFirst({
      where: { 
        createdBy: userId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!room) {
      // Generate unique room code
      let code: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        code = generateRoomCode();
        const existing = await prisma.room.findUnique({ where: { code } });
        if (!existing) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return res.status(500).json({ error: "Failed to generate unique room code" });
      }

      // Create new room
      room = await prisma.room.create({
        data: {
          code: code!,
          name: name || `Quiz Room ${code}`,
          createdBy: userId,
          questionCount,
          timePerQuestion,
          maxParticipants,
        },
      });
    } else {
      // Update existing room settings
      room = await prisma.room.update({
        where: { id: room.id },
        data: {
          questionCount,
          timePerQuestion,
          maxParticipants,
        },
      });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error("Error creating/getting room:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: "Failed to create/get room" });
  }
}
