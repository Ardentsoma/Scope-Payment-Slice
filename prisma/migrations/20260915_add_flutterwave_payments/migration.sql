-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "cardholderName" TEXT,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "transactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentReference_key" ON "Invoice"("paymentReference");

