import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { roomId, text, options, answer } = req.body;

  const question = await prisma.question.create({
    data: { roomId, text, options, answer }
  });

  res.status(200).json({ question });
}
