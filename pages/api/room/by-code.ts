import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { code } = req.query;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Invalid code" });
  }

  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() }
  });

  if (!room) return res.status(404).json({ error: "Room not found" });

  return res.status(200).json({ room });
}
