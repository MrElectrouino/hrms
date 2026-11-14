-- Options for the profile's "Reason" (shown when employment status is On Notice) live in the
-- generic parameter tables, like every other dropdown.

-- Legacy rows were inserted with explicit ids; make sure the sequences are ahead of them.
SELECT setval(pg_get_serial_sequence('parameter_types', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameter_types), 1));
SELECT setval(pg_get_serial_sequence('parameters', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameters), 1));

INSERT INTO parameter_types (name) VALUES ('Notice Reason') ON CONFLICT (name) DO NOTHING;

INSERT INTO parameters ("parameterTypeId", text, "displayOrder", "isVisible")
SELECT pt.id, v.text, v.ord, true
FROM parameter_types pt
CROSS JOIN (VALUES
  ('Resignation', 1),
  ('Termination', 2),
  ('Retirement', 3),
  ('End of contract', 4),
  ('Absconding', 5),
  ('Other', 6)
) AS v(text, ord)
WHERE pt.name = 'Notice Reason'
ON CONFLICT ("parameterTypeId", text) DO NOTHING;
