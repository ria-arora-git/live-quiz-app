import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { calculateScore } from "@/lib/utils";

const answerSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  selectedOption: z.string(),
  timeLeft: z.number().min(0).default(0),
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

    const { sessionId, questionId, selectedOption, timeLeft } = answerSchema.parse(req.body);

    // Get question and session details
    const [question, session] = await Promise.all([
      prisma.question.findUnique({ where: { id: questionId } }),
      prisma.quizSession.findUnique({ 
        where: { id: sessionId },
        include: { room: true }
      }),
    ]);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    if (!session) {
      return res.status(404).json({ error: "Quiz session not found" });
    }

    if (!session.isActive) {
      return res.status(400).json({ error: "Quiz session is not active" });
    }

    // Check if user is part of this session
    if (!session.participants.includes(userId)) {
      return res.status(403).json({ error: "Not authorized to answer in this session" });
    }

    // Check if answer is correct
    const isCorrect = question.answer === selectedOption && selectedOption !== "";
    
    // Calculate points based on correctness and time
    const points = calculateScore(isCorrect, timeLeft, session.room.timePerQuestion);

    // Check if user has already answered this question
    const existingResult = await prisma.quizResult.findFirst({
      where: { 
        sessionId, 
        userId,
      }
    });

    if (existingResult) {
      // Update existing result
      await prisma.quizResult.update({
        where: { id: existingResult.id },
        data: { 
          score: existingResult.score + points,
          answers: {
            ...((existingResult.answers as any) || {}),
            [questionId]: {
              selectedOption,
              timeLeft,
              isCorrect,
              points,
              timestamp: new Date().toISOString(),
            }
          }
        }
      });
    } else {
      // Create new result
      await prisma.quizResult.create({
        data: {
          sessionId,
          userId,
          score: points,
          answers: {
            [questionId]: {
              selectedOption,
              timeLeft,
              isCorrect,
              points,
              timestamp: new Date().toISOString(),
            }
          }
        }
      });
    }

    // Update leaderboard
    await updateLeaderboard(session.roomId, userId, points);

    return res.status(200).json({ 
      correct: isCorrect, 
      points,
      correctAnswer: question.answer,
    });
  } catch (error) {
    console.error("Error processing answer:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: "Failed to process answer" });
  }
}

async function updateLeaderboard(roomId: string, userId: string, points: number) {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    await prisma.roomLeaderboard.upsert({
      where: {
        roomId_userId_date: {
          roomId,
          userId,
          date: today,
        }
      },
      update: {
        dailyScore: { increment: points },
        allTimeScore: { increment: points },
      },
      create: {
        roomId,
        userId,
        date: today,
        dailyScore: points,
        allTimeScore: points,
      },
    });
  } catch (error) {
    console.error("Error updating leaderboard:", error);
  }
}
