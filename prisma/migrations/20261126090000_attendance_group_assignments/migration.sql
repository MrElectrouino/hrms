-- A work schedule, weekly off template or roster pattern given to a whole company, country or branch.
-- Employees inherit it; an assignment made to the employee personally still wins.
CREATE TABLE "attendance_group_assignments" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "countryCode" TEXT,
    "branchId" INTEGER,
    "refId" INTEGER NOT NULL,
    "anchorDate" DATE,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_group_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_group_assignments_kind_scope_idx" ON "attendance_group_assignments"("kind", "scope");
CREATE INDEX "attendance_group_assignments_branchId_idx" ON "attendance_group_assignments"("branchId");

ALTER TABLE "attendance_group_assignments" ADD CONSTRAINT "attendance_group_assignments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
