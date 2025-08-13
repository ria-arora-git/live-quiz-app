/*
  Warnings:

  - You are about to drop the `Question` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Room` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoomLeaderboard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Question" DROP CONSTRAINT "Question_roomId_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuizResult" DROP CONSTRAINT "QuizResult_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuizResult" DROP CONSTRAINT "QuizResult_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuizSession" DROP CONSTRAINT "QuizSession_roomId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Room" DROP CONSTRAINT "Room_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoomLeaderboard" DROP CONSTRAINT "RoomLeaderboard_roomId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RoomLeaderboard" DROP CONSTRAINT "RoomLeaderboard_userId_fkey";

-- DropTable
DROP TABLE "public"."Question";

-- DropTable
DROP TABLE "public"."QuizResult";

-- DropTable
DROP TABLE "public"."QuizSession";

-- DropTable
DROP TABLE "public"."Room";

-- DropTable
DROP TABLE "public"."RoomLeaderboard";

-- DropTable
DROP TABLE "public"."User";

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rooms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 5,
    "timePerQuestion" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxParticipants" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_sessions" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."room_leaderboards" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "dailyScore" INTEGER NOT NULL DEFAULT 0,
    "allTimeScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "public"."users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "public"."rooms"("code");

-- CreateIndex
CREATE INDEX "rooms_createdBy_idx" ON "public"."rooms"("createdBy");

-- CreateIndex
CREATE INDEX "rooms_code_idx" ON "public"."rooms"("code");

-- CreateIndex
CREATE INDEX "questions_roomId_idx" ON "public"."questions"("roomId");

-- CreateIndex
CREATE INDEX "quiz_sessions_roomId_idx" ON "public"."quiz_sessions"("roomId");

-- CreateIndex
CREATE INDEX "quiz_sessions_isActive_idx" ON "public"."quiz_sessions"("isActive");

-- CreateIndex
CREATE INDEX "quiz_results_sessionId_idx" ON "public"."quiz_results"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_results_userId_sessionId_key" ON "public"."quiz_results"("userId", "sessionId");

-- CreateIndex
CREATE INDEX "room_leaderboards_roomId_date_idx" ON "public"."room_leaderboards"("roomId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "room_leaderboards_roomId_userId_date_key" ON "public"."room_leaderboards"("roomId", "userId", "date");

-- AddForeignKey
ALTER TABLE "public"."rooms" ADD CONSTRAINT "rooms_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("clerkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_sessions" ADD CONSTRAINT "quiz_sessions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_results" ADD CONSTRAINT "quiz_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("clerkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_results" ADD CONSTRAINT "quiz_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_leaderboards" ADD CONSTRAINT "room_leaderboards_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_leaderboards" ADD CONSTRAINT "room_leaderboards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("clerkId") ON DELETE CASCADE ON UPDATE CASCADE;
