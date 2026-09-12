-- AlterEnum
ALTER TYPE "FlipbookStatus" ADD VALUE 'UPLOADING';

-- DropIndex
DROP INDEX "processing_jobs_status_createdAt_idx";

-- AlterTable
ALTER TABLE "processing_jobs" ADD COLUMN     "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "processing_jobs_status_runAfter_idx" ON "processing_jobs"("status", "runAfter");
