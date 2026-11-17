-- CreateTable
CREATE TABLE "weekly_off_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "days" INTEGER[],
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "weekly_off_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_weekly_offs" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_weekly_offs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_off_templates_name_key" ON "weekly_off_templates"("name");

-- CreateIndex
CREATE INDEX "employee_weekly_offs_employeeId_effectiveFrom_idx" ON "employee_weekly_offs"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "employee_weekly_offs_templateId_idx" ON "employee_weekly_offs"("templateId");

-- AddForeignKey
ALTER TABLE "employee_weekly_offs" ADD CONSTRAINT "employee_weekly_offs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_weekly_offs" ADD CONSTRAINT "employee_weekly_offs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "weekly_off_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- The old "Weekly Off" dropdown values become templates (same names, so profiles that mention them still match).
INSERT INTO "weekly_off_templates" ("name", "days", "updatedAt")
SELECT p."text",
       CASE p."text"
         WHEN 'Saturday, Sunday' THEN ARRAY[6, 0]
         WHEN 'Friday, Saturday' THEN ARRAY[5, 6]
         WHEN 'Sunday only' THEN ARRAY[0]
       END,
       CURRENT_TIMESTAMP
FROM "parameters" p
JOIN "parameter_types" t ON t."id" = p."parameterTypeId" AND t."name" = 'Weekly Off'
WHERE p."text" IN ('Saturday, Sunday', 'Friday, Saturday', 'Sunday only');

-- Weekly off is no longer a dropdown parameter.
DELETE FROM "parameters" WHERE "parameterTypeId" IN (SELECT "id" FROM "parameter_types" WHERE "name" = 'Weekly Off');
DELETE FROM "parameter_types" WHERE "name" = 'Weekly Off';
