-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "questionVersionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "retestOfId" TEXT;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "clientChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "QuestionVersion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "authoredBy" "Authorship" NOT NULL DEFAULT 'HUMAN',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionVersion_questionId_version_key" ON "QuestionVersion"("questionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionVersion_questionId_contentHash_key" ON "QuestionVersion"("questionId", "contentHash");

-- AddForeignKey
ALTER TABLE "QuestionVersion" ADD CONSTRAINT "QuestionVersion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_retestOfId_fkey" FOREIGN KEY ("retestOfId") REFERENCES "Attempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
