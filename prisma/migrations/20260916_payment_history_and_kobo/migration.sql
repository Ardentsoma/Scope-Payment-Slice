-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('CHECKOUT_STARTED', 'PAYMENT_CONFIRMED', 'SUBSCRIPTION_ACTIVATED', 'PAYMENT_FAILED', 'SUBSCRIPTION_CANCELLED', 'PLAN_CHANGE_SCHEDULED', 'PLAN_CHANGE_APPLIED');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('TOO_EXPENSIVE', 'MISSING_FEATURES', 'SWITCHING_TOOL', 'NOT_USING_ENOUGH', 'OTHER');

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "PaymentEventType" NOT NULL,
    "txRef" TEXT,
    "planId" TEXT,
    "amountKobo" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationSurvey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" "CancellationReason" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancellationSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentEvent_userId_createdAt_idx" ON "PaymentEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_txRef_idx" ON "PaymentEvent"("txRef");

-- CreateIndex
CREATE INDEX "CancellationSurvey_userId_idx" ON "CancellationSurvey"("userId");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationSurvey" ADD CONSTRAINT "CancellationSurvey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: amounts were previously stored as naira. Convert every
-- existing stored amount to whole kobo (1 naira = 100 kobo).
UPDATE "Subscription" SET "amount" = "amount" * 100;
UPDATE "Invoice" SET "amount" = "amount" * 100;

