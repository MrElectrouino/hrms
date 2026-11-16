-- A holiday can now last several days: endDate is the last day (inclusive). Empty = a single day.
ALTER TABLE "holidays" ADD COLUMN "endDate" DATE;
