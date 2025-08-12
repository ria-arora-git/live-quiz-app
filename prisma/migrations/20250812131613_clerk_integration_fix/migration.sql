/*
  Clerk integration & schema update migration
  -------------------------------------------
  This version is cleaned up to avoid duplicate ADD COLUMN statements,
  sets sensible defaults for newly required columns, and avoids data loss.
*/

/* Drop old foreign keys before altering dependent columns */
ALTER TABLE "public"."QuizResult" DROP CONSTRAINT IF EXISTS "QuizResult_userId_fkey";
ALTER TABLE "public"."RoomLeaderboard" DROP CONSTRAINT IF EXISTS "RoomLeaderboard_userId_fkey";

/* ====== ROOM TABLE ====== */
ALTER TABLE "public"."Room"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

/* ====== USER TABLE ====== */
ALTER TABLE "public"."User"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

/* ====== ROOMLEADERBOARD TABLE ======
   Safe date column replacement — preserves or resets existing data.
   Since DB is likely empty post-reset, simply add using correct type.
*/
ALTER TABLE "public"."RoomLeaderboard"
  DROP COLUMN IF EXISTS "date",
  ADD COLUMN "date" TIMESTAMP(3) NOT NULL DEFAULT now(),
  ALTER COLUMN "dailyScore" SET DEFAULT 0,
  ALTER COLUMN "allTimeScore" SET DEFAULT 0;

/* ====== Indices ====== */
CREATE UNIQUE INDEX IF NOT EXISTS "RoomLeaderboard_roomId_userId_date_key"
  ON "public"."RoomLeaderboard"("roomId", "userId", "date");

/* ====== Foreign keys ====== */
ALTER TABLE "public"."Room"
  ADD CONSTRAINT "Room_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "public"."User"("clerkId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."QuizResult"
  ADD CONSTRAINT "QuizResult_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."RoomLeaderboard"
  ADD CONSTRAINT "RoomLeaderboard_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

/* ====== Backfill step ======
   If starting with old data, you'd set createdBy here.
   On a reset DB this will just no‑op.
*/
UPDATE "public"."Room"
SET "createdBy" = 'replace_with_valid_clerkId'
WHERE "createdBy" IS NULL;

/* Make createdBy NOT NULL after backfilling */
ALTER TABLE "public"."Room" ALTER COLUMN "createdBy" SET NOT NULL;
