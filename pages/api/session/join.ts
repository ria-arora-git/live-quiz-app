import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const joinSessionSchema = z.object({
  roomId: z.string().min(1),
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

    const { roomId } = joinSessionSchema.parse(req.body);

    // Ensure user exists in database
    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? `user-${userId}@quiz.app`,
        },
      });
    }

    // Check if room exists and is active
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (!room.isActive) {
      return res.status(400).json({ error: "Room is not active" });
    }

    // Find active session for this room
    let session = await prisma.quizSession.findFirst({
      where: { roomId, isActive: true },
      include: {
        _count: {
          select: { results: true }
        }
      }
    });

    if (!session) {
      // Create a waiting session if none exists
      session = await prisma.quizSession.create({
        data: {
          roomId,
          isActive: false, // Will be activated when host starts quiz
          participants: [userId],
          currentIndex: 0,
        },
        include: {
          _count: {
            select: { results: true }
          }
        }
      });
    } else {
      // Check participant limit
      if (session.participants.length >= room.maxParticipants) {
        return res.status(400).json({ error: "Room is full" });
      }

      // Add user to session if not already present
      if (!session.participants.includes(userId)) {
        session = await prisma.quizSession.update({
          where: { id: session.id },
          data: {
            participants: [...session.participants, userId],
          },
          include: {
            _count: {
              select: { results: true }
            }
          }
        });
      }
    }

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error("Error joining session:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: "Failed to join session" });
  }
}
