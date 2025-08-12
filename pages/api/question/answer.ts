import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { sessionId, questionId, selectedOption, timeLeft } = req.body;

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  const isCorrect = question.answer === selectedOption;

  const points = isCorrect ? 10 + timeLeft : 0;

  const existing = await prisma.quizResult.findFirst({
    where: { sessionId, userId }
  });

  if (existing) {
    await prisma.quizResult.update({
      where: { id: existing.id },
      data: { score: existing.score + points }
    });
  } else {
    await prisma.quizResult.create({
      data: {
        sessionId,
        userId,
        score: points
      }
    });
  }

  res.status(200).json({ correct: isCorrect, points });
}
