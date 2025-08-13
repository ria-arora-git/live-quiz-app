import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const addQuestionSchema = z.object({
  roomId: z.string().min(1),
  text: z.string().min(1).max(500),
  options: z.array(z.string().min(1)).min(2).max(4),
  answer: z.string().min(1),
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

    const { roomId, text, options, answer } = addQuestionSchema.parse(req.body);

    // Verify room exists and user is the owner
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.createdBy !== userId) {
      return res.status(403).json({ error: "Not authorized to add questions to this room" });
    }

    // Validate that the answer is one of the options
    if (!options.includes(answer)) {
      return res.status(400).json({ error: "Answer must be one of the provided options" });
    }

    // Get current question count for ordering
    const questionCount = await prisma.question.count({ where: { roomId } });

    // Create question
    const question = await prisma.question.create({
      data: { 
        roomId, 
        text: text.trim(), 
        options: options.map(opt => opt.trim()), 
        answer: answer.trim(),
        order: questionCount + 1,
      }
    });

    return res.status(200).json({ question });
  } catch (error) {
    console.error("Error adding question:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: "Failed to add question" });
  }
}
