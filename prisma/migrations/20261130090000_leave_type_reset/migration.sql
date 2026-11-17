-- Per leave type: whether the balance is reset at the end of its calendar, whether unused days are carried forward, and the month its calendar starts in.
ALTER TABLE "leave_types" ADD COLUMN "resetBalance" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "leave_types" ADD COLUMN "carryForwardType" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "leave_types" ADD COLUMN "calendarStartMonth" INTEGER;
