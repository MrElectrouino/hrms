-- Gender, Marital Status and BloodGroup already exist as parameter types; add what the profile used to hard-code.
SELECT setval(pg_get_serial_sequence('parameter_types', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameter_types), 1));
SELECT setval(pg_get_serial_sequence('parameters', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameters), 1));

INSERT INTO parameters ("parameterTypeId", text, "displayOrder", "isVisible")
SELECT pt.id, v.text, v.ord, true
FROM parameter_types pt
CROSS JOIN (VALUES ('Divorced', 3), ('Widowed', 4)) AS v(text, ord)
WHERE pt.name = 'Marital Status'
ON CONFLICT ("parameterTypeId", text) DO NOTHING;

INSERT INTO parameter_types (name) VALUES ('Roster') ON CONFLICT (name) DO NOTHING;

INSERT INTO parameters ("parameterTypeId", text, "displayOrder", "isVisible")
SELECT pt.id, v.text, v.ord, true
FROM parameter_types pt
CROSS JOIN (VALUES ('Fixed', 1), ('Rotational', 2)) AS v(text, ord)
WHERE pt.name = 'Roster'
ON CONFLICT ("parameterTypeId", text) DO NOTHING;
