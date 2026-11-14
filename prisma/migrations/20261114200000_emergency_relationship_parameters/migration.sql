-- Options for the profile's emergency contact "Relationship" live in the parameter tables.
SELECT setval(pg_get_serial_sequence('parameter_types', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameter_types), 1));
SELECT setval(pg_get_serial_sequence('parameters', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameters), 1));

INSERT INTO parameter_types (name) VALUES ('Emergency Relationship') ON CONFLICT (name) DO NOTHING;

INSERT INTO parameters ("parameterTypeId", text, "displayOrder", "isVisible")
SELECT pt.id, v.text, v.ord, true
FROM parameter_types pt
CROSS JOIN (VALUES
  ('Parent', 1),
  ('Spouse', 2),
  ('Sibling', 3),
  ('Child', 4),
  ('Friend', 5),
  ('Other', 6)
) AS v(text, ord)
WHERE pt.name = 'Emergency Relationship'
ON CONFLICT ("parameterTypeId", text) DO NOTHING;
