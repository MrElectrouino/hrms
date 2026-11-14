-- Departments: the dropdown options live in parameters (type "Department"); the old master goes away.
DROP TABLE "profile_departments";
DROP TABLE "departments";

-- Branches become parameters of type "Branch" (code -> code, name -> text, active -> visible).
SELECT setval(pg_get_serial_sequence('parameter_types', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameter_types), 1));
SELECT setval(pg_get_serial_sequence('parameters', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameters), 1));

INSERT INTO parameter_types (name) VALUES ('Branch') ON CONFLICT (name) DO NOTHING;

INSERT INTO parameters ("parameterTypeId", text, code, "displayOrder", "isVisible")
SELECT (SELECT id FROM parameter_types WHERE name = 'Branch'), b."name", b."code", b."id", b."isActive"
FROM "branches" b
ON CONFLICT ("parameterTypeId", text) DO NOTHING;

-- old branch id -> new parameter id
CREATE TEMP TABLE branch_map AS
SELECT b."id" AS old_id, p."id" AS new_id
FROM "branches" b
JOIN parameters p ON p."parameterTypeId" = (SELECT id FROM parameter_types WHERE name = 'Branch') AND p."text" = b."name";

-- Point the foreign keys at parameters instead of branches.
ALTER TABLE "employees" DROP CONSTRAINT "employees_branchId_fkey";
ALTER TABLE "user_branches" DROP CONSTRAINT "user_branches_branchId_fkey";

UPDATE "employees" e SET "branchId" = m.new_id FROM branch_map m WHERE e."branchId" = m.old_id;
UPDATE "user_branches" u SET "branchId" = m.new_id FROM branch_map m WHERE u."branchId" = m.old_id;
UPDATE "employee_profile_sections" s
SET "data" = jsonb_set(s."data", '{branch}', to_jsonb(m.new_id::text))
FROM branch_map m
WHERE s."sectionKey" = 'organization' AND s."data"->>'branch' = m.old_id::text;

ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "parameters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "branches";
