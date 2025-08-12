import prisma from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { roomId } = req.query;
  if (!roomId) return res.status(400).json({ error: "roomId required" });

  const questions = await prisma.question.findMany({
    where: { roomId: String(roomId) },
  });

  res.status(200).json(questions);
}
