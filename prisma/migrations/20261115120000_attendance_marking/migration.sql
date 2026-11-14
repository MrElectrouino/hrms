-- CreateTable
CREATE TABLE "attendance_statuses" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL,
    "skipsLateRule" BOOLEAN NOT NULL DEFAULT false,
    "clearsPunches" BOOLEAN NOT NULL DEFAULT false,
    "managerEditable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "attendance_statuses_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "attendance_status_mappings" (
    "id" SERIAL NOT NULL,
    "countryCode" TEXT NOT NULL,
    "statusCode" TEXT NOT NULL,
    "legacyId" INTEGER NOT NULL,
    "legacyName" TEXT NOT NULL,

    CONSTRAINT "attendance_status_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_policies" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "halfDayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allowPastDateSelfMarking" BOOLEAN NOT NULL DEFAULT false,
    "applyLateRulesToPastDates" BOOLEAN NOT NULL DEFAULT false,
    "selfMarkCutoffTime" TEXT,
    "cutoffExemptHr" BOOLEAN NOT NULL DEFAULT true,
    "managerEditsOnlyUnapproved" BOOLEAN NOT NULL DEFAULT true,
    "useRamadanShiftStart" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_policy_assignments" (
    "id" SERIAL NOT NULL,
    "policyId" INTEGER NOT NULL,
    "scope" TEXT NOT NULL,
    "countryCode" TEXT,
    "branchId" INTEGER,
    "employeeId" INTEGER,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,

    CONSTRAINT "attendance_policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ramadan_periods" (
    "id" SERIAL NOT NULL,
    "countryCode" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,

    CONSTRAINT "ramadan_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_timezones" (
    "branchId" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,

    CONSTRAINT "branch_timezones_pkey" PRIMARY KEY ("branchId")
);

-- CreateTable
CREATE TABLE "attendance_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "moodEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gpsRequirement" TEXT NOT NULL DEFAULT 'OPTIONAL',
    "addressRequirement" TEXT NOT NULL DEFAULT 'OPTIONAL',
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" BIGSERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "shiftId" INTEGER,
    "policyId" INTEGER,
    "policyVersion" INTEGER,
    "statusCode" TEXT NOT NULL,
    "isPresent" BOOLEAN NOT NULL DEFAULT false,
    "firstInAt" TIMESTAMPTZ(3),
    "lastOutAt" TIMESTAMPTZ(3),
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER,
    "inIp" TEXT,
    "inCoordinates" TEXT,
    "inAddress" TEXT,
    "outIp" TEXT,
    "outCoordinates" TEXT,
    "outAddress" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SELF',
    "markedById" INTEGER,
    "markedAt" TIMESTAMPTZ(3),
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMPTZ(3),
    "modifiedById" INTEGER,
    "modifiedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_punches" (
    "id" BIGSERIAL NOT NULL,
    "attendanceId" BIGINT NOT NULL,
    "punchType" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL,
    "ip" TEXT,
    "coordinates" TEXT,
    "address" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SELF',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_punches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mood_logs" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "mood" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mood_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_status_mappings_countryCode_legacyId_key" ON "attendance_status_mappings"("countryCode", "legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_policies_code_key" ON "attendance_policies"("code");

-- CreateIndex
CREATE INDEX "attendance_policy_assignments_scope_countryCode_idx" ON "attendance_policy_assignments"("scope", "countryCode");

-- CreateIndex
CREATE INDEX "attendance_policy_assignments_branchId_idx" ON "attendance_policy_assignments"("branchId");

-- CreateIndex
CREATE INDEX "attendance_policy_assignments_employeeId_idx" ON "attendance_policy_assignments"("employeeId");

-- CreateIndex
CREATE INDEX "ramadan_periods_countryCode_startDate_idx" ON "ramadan_periods"("countryCode", "startDate");

-- CreateIndex
CREATE INDEX "attendance_date_idx" ON "attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employeeId_date_key" ON "attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "attendance_punches_attendanceId_at_idx" ON "attendance_punches"("attendanceId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "mood_logs_employeeId_date_key" ON "mood_logs"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "attendance_status_mappings" ADD CONSTRAINT "attendance_status_mappings_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "attendance_statuses"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policy_assignments" ADD CONSTRAINT "attendance_policy_assignments_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "attendance_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policy_assignments" ADD CONSTRAINT "attendance_policy_assignments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "parameters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policy_assignments" ADD CONSTRAINT "attendance_policy_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_timezones" ADD CONSTRAINT "branch_timezones_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_statusCode_fkey" FOREIGN KEY ("statusCode") REFERENCES "attendance_statuses"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mood_logs" ADD CONSTRAINT "mood_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Starter data
-- ---------------------------------------------------------------------------
INSERT INTO "attendance_statuses" ("code", "name", "color", "sortOrder", "category", "skipsLateRule", "clearsPunches", "managerEditable") VALUES
  ('PRESENT',              'Present',               '#16a34a', 1,  'WORK',    false, false, false),
  ('LATE',                 'Late',                  '#d97706', 2,  'WORK',    false, false, false),
  ('HALF_DAY',             'Half day',              '#ea580c', 3,  'WORK',    true,  false, false),
  ('SHORT_HOURS',          'Short hours',           '#ca8a04', 4,  'WORK',    false, false, false),
  ('NOT_APPROVED',         'Not approved',          '#6366f1', 5,  'WORK',    false, false, true),
  ('ABSENT',               'Absent',                '#dc2626', 6,  'ABSENCE', true,  false, false),
  ('NOT_FOUND_PRESENT',    'Not found present',     '#b91c1c', 7,  'ABSENCE', true,  false, false),
  ('ON_LEAVE',             'On leave',              '#2563eb', 8,  'LEAVE',   true,  true,  false),
  ('COMP_OFF_AVAILED',     'Comp off availed',      '#0891b2', 9,  'LEAVE',   true,  true,  false),
  ('HOLIDAY',              'Holiday',               '#7c3aed', 10, 'OFF',     true,  false, false),
  ('WEEKLY_OFF',           'Weekly off',            '#6b7280', 11, 'OFF',     true,  false, false),
  ('WORKED_ON_HOLIDAY',    'Worked on holiday',     '#9333ea', 12, 'WORK',    true,  false, false),
  ('WORKED_ON_WEEKLY_OFF', 'Worked on weekly off',  '#8b5cf6', 13, 'WORK',    true,  false, false);

-- Old UAE ids (Muster Status, parameter type 40), for migration and for comparing with the procedure.
INSERT INTO "attendance_status_mappings" ("countryCode", "statusCode", "legacyId", "legacyName") VALUES
  ('AE', 'ABSENT', 177, 'Absent'),
  ('AE', 'NOT_APPROVED', 178, 'Not Approved'),
  ('AE', 'PRESENT', 179, 'Present'),
  ('AE', 'HOLIDAY', 180, 'Holiday'),
  ('AE', 'NOT_FOUND_PRESENT', 181, 'Not Found Present'),
  ('AE', 'WORKED_ON_HOLIDAY', 182, 'Worked on Holiday'),
  ('AE', 'COMP_OFF_AVAILED', 183, 'Comp off Availed'),
  ('AE', 'LATE', 184, 'Late'),
  ('AE', 'HALF_DAY', 185, 'Half Day'),
  ('AE', 'WEEKLY_OFF', 186, 'Weekly Off');

INSERT INTO "attendance_policies" ("code", "name", "lateEnabled", "halfDayEnabled", "allowPastDateSelfMarking", "applyLateRulesToPastDates", "selfMarkCutoffTime", "cutoffExemptHr", "managerEditsOnlyUnapproved", "useRamadanShiftStart", "updatedAt") VALUES
  ('INDIA_STANDARD', 'India standard',          true, true, true,  false, NULL,    true, true, false, CURRENT_TIMESTAMP),
  ('UAE_STANDARD',   'UAE standard',            true, true, false, false, '11:00', true, true, true,  CURRENT_TIMESTAMP),
  ('STANDARD',       'Standard (other countries)', true, true, false, false, NULL,    true, true, false, CURRENT_TIMESTAMP);

INSERT INTO "attendance_policy_assignments" ("policyId", "scope", "countryCode", "effectiveFrom")
SELECT p."id", 'COUNTRY', v.cc, DATE '2000-01-01'
FROM (VALUES ('IN', 'INDIA_STANDARD'), ('AE', 'UAE_STANDARD'), ('GB', 'STANDARD'), ('US', 'STANDARD')) AS v(cc, pcode)
JOIN "attendance_policies" p ON p."code" = v.pcode;

INSERT INTO "attendance_settings" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP);

-- Mood options (parameter type "Mood").
SELECT setval(pg_get_serial_sequence('parameter_types', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameter_types), 1));
SELECT setval(pg_get_serial_sequence('parameters', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameters), 1));
INSERT INTO parameter_types (name) VALUES ('Mood') ON CONFLICT (name) DO NOTHING;
INSERT INTO parameters ("parameterTypeId", text, "displayOrder", "isVisible")
SELECT pt.id, v.text, v.ord, true
FROM parameter_types pt CROSS JOIN (VALUES ('Happy', 1), ('OK', 2), ('Sad', 3), ('None', 4)) AS v(text, ord)
WHERE pt.name = 'Mood'
ON CONFLICT ("parameterTypeId", text) DO NOTHING;
