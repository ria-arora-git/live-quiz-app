-- AlterTable
ALTER TABLE "public"."QuizResult" ALTER COLUMN "score" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."QuizSession" ADD COLUMN     "currentIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "questionCount" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "timePerQuestion" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
