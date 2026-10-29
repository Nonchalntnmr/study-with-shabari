-- AlterTable
ALTER TABLE "LessonAttempt" ADD COLUMN     "previewLessonId" TEXT,
ALTER COLUMN "lessonVersionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "LessonAttempt" ADD CONSTRAINT "LessonAttempt_previewLessonId_fkey" FOREIGN KEY ("previewLessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
