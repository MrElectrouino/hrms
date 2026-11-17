-- Weekdays that are off only some weeks (2nd and 4th Saturday, every other Saturday).
ALTER TABLE "weekly_off_templates" ADD COLUMN "rules" JSONB NOT NULL DEFAULT '[]';
