-- CreateTable
CREATE TABLE "employee_code_sequences" (
    "parameterId" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "employee_code_sequences_pkey" PRIMARY KEY ("parameterId")
);

-- AddForeignKey
ALTER TABLE "employee_code_sequences" ADD CONSTRAINT "employee_code_sequences_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Starter prefixes for the existing employee types (editable in Masters).
UPDATE "parameters" p SET "code" = v.code
FROM (VALUES ('Permanent', 'EMP'), ('On Contract', 'CON'), ('Temporary', 'TMP'), ('Intern', 'INT')) AS v(text, code)
WHERE p."parameterTypeId" = (SELECT id FROM parameter_types WHERE name = 'Employee Type')
  AND p."text" = v.text AND p."code" IS NULL;
