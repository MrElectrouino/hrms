-- CreateTable
CREATE TABLE "work_schedules" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scheduleType" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "earliestStartTime" TEXT,
    "latestStartTime" TEXT,
    "requiredDailyMinutes" INTEGER NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_work_schedules" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "workScheduleId" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,

    CONSTRAINT "employee_work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday_calendars" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "countryCode" TEXT,
    "branchId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "holiday_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" SERIAL NOT NULL,
    "calendarId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "holidayType" TEXT NOT NULL DEFAULT 'PUBLIC',

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_holiday_calendars" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "calendarId" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,

    CONSTRAINT "employee_holiday_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_patterns" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cycleDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roster_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_pattern_days" (
    "id" SERIAL NOT NULL,
    "patternId" INTEGER NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "shiftId" INTEGER,
    "isWeeklyOff" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roster_pattern_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_roster_patterns" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "patternId" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "anchorDate" DATE NOT NULL,

    CONSTRAINT "employee_roster_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_entries" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "shiftId" INTEGER,
    "isWeeklyOff" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdById" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roster_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_import_logs" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "importedRows" INTEGER NOT NULL,
    "failedRows" INTEGER NOT NULL,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "createdById" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_schedules_code_key" ON "work_schedules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "work_schedules_name_key" ON "work_schedules"("name");

-- CreateIndex
CREATE INDEX "employee_work_schedules_employeeId_effectiveFrom_idx" ON "employee_work_schedules"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "holiday_calendars_name_key" ON "holiday_calendars"("name");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_calendarId_date_key" ON "holidays"("calendarId", "date");

-- CreateIndex
CREATE INDEX "employee_holiday_calendars_employeeId_effectiveFrom_idx" ON "employee_holiday_calendars"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "roster_patterns_name_key" ON "roster_patterns"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roster_pattern_days_patternId_dayIndex_key" ON "roster_pattern_days"("patternId", "dayIndex");

-- CreateIndex
CREATE INDEX "employee_roster_patterns_employeeId_effectiveFrom_idx" ON "employee_roster_patterns"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "roster_entries_employeeId_date_key" ON "roster_entries"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "employee_work_schedules" ADD CONSTRAINT "employee_work_schedules_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_work_schedules" ADD CONSTRAINT "employee_work_schedules_workScheduleId_fkey" FOREIGN KEY ("workScheduleId") REFERENCES "work_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "parameters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "holiday_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_holiday_calendars" ADD CONSTRAINT "employee_holiday_calendars_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_holiday_calendars" ADD CONSTRAINT "employee_holiday_calendars_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "holiday_calendars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_pattern_days" ADD CONSTRAINT "roster_pattern_days_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "roster_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_pattern_days" ADD CONSTRAINT "roster_pattern_days_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_roster_patterns" ADD CONSTRAINT "employee_roster_patterns_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_roster_patterns" ADD CONSTRAINT "employee_roster_patterns_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "roster_patterns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

