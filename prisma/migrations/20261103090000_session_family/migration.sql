-- D-022: session families (rotation reuse) and absolute session lifetime.
-- Existing rows: each becomes its own family, anchored at its issue time.

-- AlterTable
ALTER TABLE "sessions"
    ADD COLUMN "familyId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    ADD COLUMN "familyStartedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill the anchor from the issue time, then drop the one-off UUID default
-- (Prisma generates `familyId` in the application via @default(uuid())).
UPDATE "sessions" SET "familyStartedAt" = "issuedAt";
ALTER TABLE "sessions" ALTER COLUMN "familyId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "sessions_familyId_idx" ON "sessions"("familyId");
