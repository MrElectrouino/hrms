-- The Reporting manager field moves from the Organization section to the Employment section of the profile.
-- Copy each saved value across (creating the Employment row when the employee has none), then remove it from Organization.
INSERT INTO "employee_profile_sections" ("employeeId", "sectionKey", "data", "updatedAt")
SELECT o."employeeId", 'employment', jsonb_build_object('reportingManager', o."data"->'reportingManager'), CURRENT_TIMESTAMP
FROM "employee_profile_sections" o
WHERE o."sectionKey" = 'organization' AND o."data" ? 'reportingManager'
ON CONFLICT ("employeeId", "sectionKey") DO UPDATE
SET "data" = "employee_profile_sections"."data" || jsonb_build_object('reportingManager', EXCLUDED."data"->'reportingManager'),
    "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "employee_profile_sections"
SET "data" = "data" - 'reportingManager'
WHERE "sectionKey" = 'organization' AND "data" ? 'reportingManager';

-- Profile rules that mentioned the field follow it.
UPDATE "profile_field_rules"
SET "sectionKey" = 'employment', "groupTitle" = 'Reporting'
WHERE "sectionKey" = 'organization' AND "fieldKey" = 'reportingManager';
