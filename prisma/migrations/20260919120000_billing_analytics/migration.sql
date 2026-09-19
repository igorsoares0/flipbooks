-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- AlterEnum
-- The Lifetime Deal becomes Pro; renaming keeps existing grants.
ALTER TYPE "Plan" RENAME VALUE 'LIFETIME' TO 'PRO';

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIALING';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAST_DUE';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "analytics_events" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "visitorId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "interval" "BillingInterval",
ADD COLUMN     "lastEventAt" TIMESTAMP(3),
ADD COLUMN     "paddlePriceId" TEXT,
ADD COLUMN     "paddleSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "paddle_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paddle_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_flipbookId_type_createdAt_idx" ON "analytics_events"("flipbookId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paddleSubscriptionId_key" ON "subscriptions"("paddleSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_paddleCustomerId_idx" ON "subscriptions"("paddleCustomerId");

