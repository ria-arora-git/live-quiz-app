/*
  Warnings:

  - A unique constraint covering the columns `[roomId,userId,date]` on the table `RoomLeaderboard` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."RoomLeaderboard" ALTER COLUMN "date" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RoomLeaderboard_roomId_userId_date_key" ON "public"."RoomLeaderboard"("roomId", "userId", "date");
