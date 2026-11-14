-- Department options for the employee profile live in the generic parameter tables.
SELECT setval(pg_get_serial_sequence('parameter_types', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameter_types), 1));
SELECT setval(pg_get_serial_sequence('parameters', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameters), 1));

INSERT INTO parameter_types (name) VALUES ('Department') ON CONFLICT (name) DO NOTHING;

INSERT INTO parameters ("parameterTypeId", text, "parameterValue", "displayOrder", "isVisible")
SELECT pt.id, v.text, v.ord, v.ord, true
FROM parameter_types pt
CROSS JOIN (VALUES
  ('Sales', 1),
  ('Operations', 2),
  ('Stores', 3),
  ('Finance', 4),
  ('Admin', 5),
  ('HR', 6),
  ('IT', 7),
  ('Safety & Procurement', 8)
) AS v(text, ord)
WHERE pt.name = 'Department'
ON CONFLICT ("parameterTypeId", text) DO NOTHING;
