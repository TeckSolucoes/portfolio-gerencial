-- AlterTable
ALTER TABLE "companies" ADD COLUMN "share_token" TEXT;
ALTER TABLE "companies" ADD COLUMN "share_expires_at" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "companies_share_token_key" ON "companies"("share_token");
