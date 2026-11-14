-- CreateTable
CREATE TABLE "leave_policies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "layer" TEXT NOT NULL DEFAULT 'COMPANY',
    "countryCode" TEXT,
    "branchId" INTEGER,
    "employeeTypeId" INTEGER,
    "employeeId" INTEGER,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policy_rules" (
    "id" SERIAL NOT NULL,
    "policyId" INTEGER NOT NULL,
    "leaveTypeId" INTEGER NOT NULL,
    "annualDays" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "creditMethod" TEXT NOT NULL DEFAULT 'MONTHLY',
    "slabs" JSONB NOT NULL DEFAULT '[]',
    "slabTiming" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "serviceBasis" TEXT NOT NULL DEFAULT 'JOINING_DATE',
    "proration" TEXT NOT NULL DEFAULT 'COMPLETED_MONTHS',
    "cutoffDay" INTEGER,
    "rounding" TEXT NOT NULL DEFAULT 'NONE',
    "tieRule" TEXT NOT NULL DEFAULT 'UP',
    "minDays" DECIMAL(6,2),
    "maxDays" DECIMAL(6,2),

    CONSTRAINT "leave_policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_entitlement_runs" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leaveTypeId" INTEGER NOT NULL,
    "policyId" INTEGER NOT NULL,
    "yearStart" DATE NOT NULL,
    "input" JSONB NOT NULL,
    "rawDays" DECIMAL(8,4) NOT NULL,
    "quantity" DECIMAL(6,2) NOT NULL,
    "lines" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_entitlement_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_policies_countryCode_idx" ON "leave_policies"("countryCode");

-- CreateIndex
CREATE INDEX "leave_policies_effectiveFrom_idx" ON "leave_policies"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policy_rules_policyId_leaveTypeId_key" ON "leave_policy_rules"("policyId", "leaveTypeId");

-- CreateIndex
CREATE INDEX "leave_entitlement_runs_employeeId_yearStart_idx" ON "leave_entitlement_runs"("employeeId", "yearStart");

-- CreateIndex
CREATE UNIQUE INDEX "leave_entitlement_runs_employeeId_leaveTypeId_yearStart_pol_key" ON "leave_entitlement_runs"("employeeId", "leaveTypeId", "yearStart", "policyId");

-- AddForeignKey
ALTER TABLE "leave_policy_rules" ADD CONSTRAINT "leave_policy_rules_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "leave_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policy_rules" ADD CONSTRAINT "leave_policy_rules_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_entitlement_runs" ADD CONSTRAINT "leave_entitlement_runs_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

