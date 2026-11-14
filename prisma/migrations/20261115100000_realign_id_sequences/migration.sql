-- Seed data was inserted with explicit ids, which leaves the id sequences behind the data and makes the
-- next INSERT collide with an existing row. Move each sequence up to the highest id in use.
DO $$
DECLARE
  t text;
  seq text;
BEGIN
  FOREACH t IN ARRAY ARRAY['system_configurations', 'document_types', 'shifts', 'sites', 'languages', 'menu_items', 'parameter_types', 'parameters', 'user_types', 'roles', 'messages']
  LOOP
    IF to_regclass(t) IS NOT NULL THEN
      seq := pg_get_serial_sequence(t, 'id');
      IF seq IS NOT NULL THEN
        EXECUTE format('SELECT setval(%L, GREATEST((SELECT COALESCE(MAX(id), 1) FROM %I), 1))', seq, t);
      END IF;
    END IF;
  END LOOP;
END $$;
