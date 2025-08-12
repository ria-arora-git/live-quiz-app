import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { roomId } = req.body;
  if (!roomId || typeof roomId !== "string") {
    return res.status(400).json({ error: "Invalid roomId" });
  }

  try {
    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        },
      });
    }

    const active = await prisma.quizSession.findFirst({ where: { roomId, isActive: true } });
    if (!active) {
      return res.status(404).json({ error: "No active quiz session" });
    }

    if (!active.participants.includes(userId)) {
      await prisma.quizSession.update({
        where: { id: active.id },
        data: { participants: [...active.participants, userId] },
      });
    }

    return res.status(200).json({ sessionId: active.id });
  } catch (error) {
    console.error("Join error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
