-- A work schedule, weekly off or roster pattern can also be given to a whole site.
ALTER TABLE "attendance_group_assignments" ADD COLUMN "siteId" INTEGER;
CREATE INDEX "attendance_group_assignments_siteId_idx" ON "attendance_group_assignments"("siteId");
ALTER TABLE "attendance_group_assignments" ADD CONSTRAINT "attendance_group_assignments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
