-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_branches" (
    "userId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,

    CONSTRAINT "user_branches_pkey" PRIMARY KEY ("userId","branchId")
);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "branchId" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "allBranches" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");
CREATE INDEX "user_branches_branchId_idx" ON "user_branches"("branchId");
CREATE INDEX "employees_branchId_idx" ON "employees"("branchId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Start from the branch names the profile form used to hard-code, so existing choices keep working.
INSERT INTO "branches" ("code", "name", "countryCode", "updatedAt") VALUES
  ('PUNE', 'Pune HQ', 'IN', CURRENT_TIMESTAMP),
  ('BLR', 'Bengaluru', 'IN', CURRENT_TIMESTAMP),
  ('CHE', 'Chennai', 'IN', CURRENT_TIMESTAMP),
  ('DXB', 'Dubai Office', 'AE', CURRENT_TIMESTAMP),
  ('AUH', 'Abu Dhabi', 'AE', CURRENT_TIMESTAMP),
  ('LON', 'London', 'GB', CURRENT_TIMESTAMP),
  ('MAN', 'Manchester', 'GB', CURRENT_TIMESTAMP),
  ('AUS', 'Austin HQ', 'US', CURRENT_TIMESTAMP),
  ('NYC', 'New York', 'US', CURRENT_TIMESTAMP);

-- Link employees to the branch stored in their Organization section, and store the branch id there from now on.
UPDATE "employees" e
SET "branchId" = b."id"
FROM "employee_profile_sections" s
JOIN "branches" b ON b."name" = s."data"->>'branch'
WHERE s."employeeId" = e."id" AND s."sectionKey" = 'organization';

UPDATE "employee_profile_sections" s
SET "data" = jsonb_set(s."data", '{branch}', to_jsonb(b."id"::text))
FROM "branches" b
WHERE s."sectionKey" = 'organization' AND b."name" = s."data"->>'branch';
