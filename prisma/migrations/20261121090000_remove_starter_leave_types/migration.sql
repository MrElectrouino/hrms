-- The starter leave types (AL, CL, SL, CO, LOP) are not part of a fresh setup: administrators create their own.
-- A starter leave type that has already been used (applications, balances, ledger or a policy rule) is left alone.
DELETE FROM "leave_types" t
WHERE t."code" IN ('AL', 'CL', 'SL', 'CO', 'LOP')
  AND NOT EXISTS (SELECT 1 FROM "leave_applications" a WHERE a."leaveTypeId" = t."id")
  AND NOT EXISTS (SELECT 1 FROM "leave_credits" c WHERE c."leaveTypeId" = t."id")
  AND NOT EXISTS (SELECT 1 FROM "leave_transactions" x WHERE x."leaveTypeId" = t."id")
  AND NOT EXISTS (SELECT 1 FROM "leave_policy_rules" r WHERE r."leaveTypeId" = t."id");
