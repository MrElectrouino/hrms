-- Conditions on a leave type: gender, times in a whole employment, an event window (parental leave), and the share of pay.
ALTER TABLE "leave_types" ADD COLUMN "genderRestriction" TEXT, ADD COLUMN "maxTimesInService" INTEGER, ADD COLUMN "eventWindowMonths" INTEGER, ADD COLUMN "eventLabel" TEXT, ADD COLUMN "payPercent" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "leave_applications" ADD COLUMN "eventDate" DATE;
