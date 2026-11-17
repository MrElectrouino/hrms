-- Every leave type now has its own calendar. Types that followed the company leave year keep the month it started in.
UPDATE "leave_types"
SET "calendarStartMonth" = COALESCE((SELECT "leaveYearStartMonth" FROM "leave_settings" WHERE "id" = 1), 1)
WHERE "calendarStartMonth" IS NULL;
