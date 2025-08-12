-- AlterTable
ALTER TABLE "public"."QuizSession" ADD COLUMN     "participants" TEXT[] DEFAULT ARRAY[]::TEXT[];
