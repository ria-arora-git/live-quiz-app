// pages/api/room/create.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { userId } = getAuth(req);
  if (!userId)
    return res.status(401).json({ error: "Unauthorized" });

  try {
    // Ensure host exists in DB
    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "Host",
        },
      });
    }

    // Check if host already has a room
    let room = await prisma.room.findFirst({
      where: { createdBy: user.clerkId },
      orderBy: { createdAt: "desc" },
    });

    if (!room) {
      const code = randomBytes(3).toString("hex").toUpperCase();
      room = await prisma.room.create({
        data: {
          code,
          name: `Room ${code}`,
          createdBy: user.clerkId,
          questionCount: 5,
          timePerQuestion: 10,
        },
      });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error("Error creating/getting room:", error);
    return res.status(500).json({ error: "Failed to create/get room" });
  }
}
