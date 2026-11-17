-- Per leave type: needs approval, can be encashed, and whether weekly offs and holidays inside a request are left out of the days counted.
ALTER TABLE "leave_types" ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "leave_types" ADD COLUMN "isEncashable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leave_types" ADD COLUMN "excludeWeeklyOffs" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "leave_types" ADD COLUMN "excludeHolidays" BOOLEAN NOT NULL DEFAULT true;
