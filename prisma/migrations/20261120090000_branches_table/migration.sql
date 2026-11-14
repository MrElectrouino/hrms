-- Branches become a table of their own (with country and timezone) instead of parameters of type "Branch".
-- Existing branch ids are kept, so every employee, account, calendar and policy link keeps pointing at the same branch.

-- DropForeignKey
ALTER TABLE "attendance_policy_assignments" DROP CONSTRAINT "attendance_policy_assignments_branchId_fkey";
ALTER TABLE "branch_timezones" DROP CONSTRAINT "branch_timezones_branchId_fkey";
ALTER TABLE "employees" DROP CONSTRAINT "employees_branchId_fkey";
ALTER TABLE "holiday_calendars" DROP CONSTRAINT "holiday_calendars_branchId_fkey";
ALTER TABLE "user_branches" DROP CONSTRAINT "user_branches_branchId_fkey";

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT,
    "timezone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");
CREATE INDEX "branches_countryCode_idx" ON "branches"("countryCode");

-- Copy the existing branches (same ids) together with their timezone override.
INSERT INTO "branches" ("id", "code", "name", "timezone", "isActive", "sortOrder", "updatedAt")
SELECT p."id",
       COALESCE(NULLIF(p."code", ''), 'BR' || p."id"),
       p."text",
       bt."timezone",
       p."isVisible",
       p."displayOrder",
       CURRENT_TIMESTAMP
FROM "parameters" p
JOIN "parameter_types" t ON t."id" = p."parameterTypeId" AND t."name" = 'Branch'
LEFT JOIN "branch_timezones" bt ON bt."branchId" = p."id";

SELECT setval(pg_get_serial_sequence('branches', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 1) FROM "branches"), 1));

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_policy_assignments" ADD CONSTRAINT "attendance_policy_assignments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The per-branch timezone table is replaced by branches.timezone.
DROP TABLE "branch_timezones";

-- Branches are no longer parameters.
DELETE FROM "parameters" WHERE "parameterTypeId" IN (SELECT "id" FROM "parameter_types" WHERE "name" = 'Branch');
DELETE FROM "parameter_types" WHERE "name" = 'Branch';
