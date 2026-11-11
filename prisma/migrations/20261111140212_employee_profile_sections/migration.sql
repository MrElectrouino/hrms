-- CreateTable
CREATE TABLE "employee_profile_sections" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedByProfileId" INTEGER,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employee_profile_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tabKey" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "countryCode" TEXT NOT NULL DEFAULT 'ALL',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "helpText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByProfileId" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "definitionId" INTEGER NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_profile_sections_employeeId_sectionKey_key" ON "employee_profile_sections"("employeeId", "sectionKey");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_code_key" ON "custom_field_definitions"("code");

-- CreateIndex
CREATE INDEX "custom_field_definitions_tabKey_idx" ON "custom_field_definitions"("tabKey");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_employeeId_definitionId_key" ON "custom_field_values"("employeeId", "definitionId");

-- AddForeignKey
ALTER TABLE "employee_profile_sections" ADD CONSTRAINT "employee_profile_sections_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "custom_field_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
