-- CreateEnum
CREATE TYPE "Authorship" AS ENUM ('HUMAN', 'AI');

-- CreateEnum
CREATE TYPE "LessonStepKind" AS ENUM ('TEACH', 'TEST', 'REMEDIATE', 'RETEST');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('SURE', 'UNSURE', 'GUESSING');

-- AlterTable
ALTER TABLE "Choice" ADD COLUMN     "misconceptionId" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "authoredBy" "Authorship" NOT NULL DEFAULT 'HUMAN',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateTable
CREATE TABLE "Misconception" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "remediation" TEXT NOT NULL,
    "topicId" TEXT,
    "authoredBy" "Authorship" NOT NULL DEFAULT 'HUMAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Misconception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "section" "Section",
    "summary" TEXT NOT NULL,
    "objectives" TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "authoredBy" "Authorship" NOT NULL DEFAULT 'HUMAN',
    "publishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonStep" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "LessonStepKind" NOT NULL,
    "concept" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "figure" TEXT,
    "questionId" TEXT,
    "misconceptionId" TEXT,

    CONSTRAINT "LessonStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonVersion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonAttempt" (
    "id" TEXT NOT NULL,
    "lessonVersionId" TEXT NOT NULL,
    "userId" TEXT,
    "guestKeyHash" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LessonAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "stepPosition" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,
    "choiceLabel" TEXT NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "misconceptionId" TEXT,
    "timeMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelDaily" (
    "day" DATE NOT NULL,
    "event" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FunnelDaily_pkey" PRIMARY KEY ("day","event")
);

-- CreateIndex
CREATE UNIQUE INDEX "Misconception_slug_key" ON "Misconception"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_publishedVersionId_key" ON "Lesson"("publishedVersionId");

-- CreateIndex
CREATE INDEX "LessonStep_questionId_idx" ON "LessonStep"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonStep_lessonId_position_key" ON "LessonStep"("lessonId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LessonVersion_lessonId_version_key" ON "LessonVersion"("lessonId", "version");

-- CreateIndex
CREATE INDEX "LessonAttempt_userId_idx" ON "LessonAttempt"("userId");

-- CreateIndex
CREATE INDEX "LessonAttempt_guestKeyHash_idx" ON "LessonAttempt"("guestKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "LessonAnswer_attemptId_stepPosition_key" ON "LessonAnswer"("attemptId", "stepPosition");

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_misconceptionId_fkey" FOREIGN KEY ("misconceptionId") REFERENCES "Misconception"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Misconception" ADD CONSTRAINT "Misconception_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "LessonVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStep" ADD CONSTRAINT "LessonStep_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStep" ADD CONSTRAINT "LessonStep_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStep" ADD CONSTRAINT "LessonStep_misconceptionId_fkey" FOREIGN KEY ("misconceptionId") REFERENCES "Misconception"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVersion" ADD CONSTRAINT "LessonVersion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAttempt" ADD CONSTRAINT "LessonAttempt_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAttempt" ADD CONSTRAINT "LessonAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAnswer" ADD CONSTRAINT "LessonAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "LessonAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deny-by-default for Supabase's Data API on the new tables (see 20261029085749_enable_rls).
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
  END IF;
END
$$;
