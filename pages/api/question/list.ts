import prisma from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { roomId } = req.query;

  if (!roomId || typeof roomId !== "string") {
    return res.status(400).json({ error: "Room ID is required" });
  }

  try {
    const questions = await prisma.question.findMany({
      where: { roomId },
      orderBy: [
        { order: "asc" },
        { createdAt: "asc" }
      ],
    });

    return res.status(200).json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({ error: "Failed to fetch questions" });
  }
}
