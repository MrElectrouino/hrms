-- The starter attendance policies (India, UAE, Standard) are not part of a fresh setup: administrators create their own.
-- A starter policy that has already been applied to attendance is left alone.
DELETE FROM "attendance_policy_assignments"
WHERE "policyId" IN (
  SELECT p."id" FROM "attendance_policies" p
  WHERE p."code" IN ('INDIA_STANDARD', 'UAE_STANDARD', 'STANDARD')
    AND NOT EXISTS (SELECT 1 FROM "attendance" a WHERE a."policyId" = p."id")
);

DELETE FROM "attendance_policies" p
WHERE p."code" IN ('INDIA_STANDARD', 'UAE_STANDARD', 'STANDARD')
  AND NOT EXISTS (SELECT 1 FROM "attendance" a WHERE a."policyId" = p."id")
  AND NOT EXISTS (SELECT 1 FROM "attendance_policy_assignments" x WHERE x."policyId" = p."id");
