import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { questionId } = req.query;

    if (!questionId || typeof questionId !== "string") {
      return res.status(400).json({ error: "Question ID is required" });
    }

    // Get question with room info
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { room: true }
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Verify user owns the room
    if (question.room.createdBy !== userId) {
      return res.status(403).json({ error: "Not authorized to delete this question" });
    }

    // Delete question
    await prisma.question.delete({
      where: { id: questionId }
    });

    return res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    return res.status(500).json({ error: "Failed to delete question" });
  }
}
