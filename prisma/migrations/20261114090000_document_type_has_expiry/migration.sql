-- AlterTable
ALTER TABLE "document_types" ADD COLUMN "hasExpiry" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: types that already have documents with an expiry date are expiring types.
UPDATE "document_types" dt
SET "hasExpiry" = true
WHERE EXISTS (
  SELECT 1 FROM "documents" d
  WHERE d."documentTypeId" = dt."id" AND d."expiryDate" IS NOT NULL
);
