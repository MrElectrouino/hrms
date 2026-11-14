-- The remaining fixed profile dropdowns move to the parameter tables (Masters > Parameters).
SELECT setval(pg_get_serial_sequence('parameter_types', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameter_types), 1));
SELECT setval(pg_get_serial_sequence('parameters', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM parameters), 1));

CREATE TEMP TABLE seed_options (type_name text, text text, ord int);
INSERT INTO seed_options VALUES
  ('Employee Category', 'Staff', 1), ('Employee Category', 'Management', 2), ('Employee Category', 'Worker', 3),
  ('Employment Status', 'Active', 1), ('Employment Status', 'On Notice', 2), ('Employment Status', 'Inactive', 3),
  ('Probation Period', '3 months', 1), ('Probation Period', '6 months', 2), ('Probation Period', '1 year', 3),
  ('Notice Period', '1 month', 1), ('Notice Period', '2 months', 2), ('Notice Period', '3 months', 3),
  ('Grade', 'G3', 1), ('Grade', 'G4', 2), ('Grade', 'G5', 3), ('Grade', 'G6', 4), ('Grade', 'G7', 5),
  ('Attendance Processing', 'Automatic', 1), ('Attendance Processing', 'Manual', 2),
  ('Weekly Off', 'Saturday, Sunday', 1), ('Weekly Off', 'Friday, Saturday', 2), ('Weekly Off', 'Sunday only', 3),
  ('OT Configuration', 'None', 1), ('OT Configuration', '1.25x', 2), ('OT Configuration', '1.5x', 3), ('OT Configuration', '2x', 4),
  ('Skill Proficiency', 'Beginner', 1), ('Skill Proficiency', 'Intermediate', 2), ('Skill Proficiency', 'Advanced', 3), ('Skill Proficiency', 'Expert', 4),
  ('Access Role', 'Employee', 1), ('Access Role', 'Manager', 2), ('Access Role', 'HR Admin', 3), ('Access Role', 'Payroll Admin', 4), ('Access Role', 'System Admin', 5),
  ('Login Status', 'Active', 1), ('Login Status', 'Locked', 2), ('Login Status', 'Disabled', 3),
  ('Two-Factor Authentication', 'Enabled', 1), ('Two-Factor Authentication', 'Disabled', 2),
  ('Bank Account Type', 'Checking', 1), ('Bank Account Type', 'Savings', 2),
  ('Professional Tax State', 'Maharashtra', 1), ('Professional Tax State', 'Karnataka', 2), ('Professional Tax State', 'Tamil Nadu', 3), ('Professional Tax State', 'Delhi', 4),
  ('Tax Regime', 'Old Regime', 1), ('Tax Regime', 'New Regime', 2),
  ('Student Loan Plan', 'None', 1), ('Student Loan Plan', 'Plan 1', 2), ('Student Loan Plan', 'Plan 2', 3), ('Student Loan Plan', 'Plan 4', 4),
  ('Pension Auto-Enrolment', 'Opted in', 1), ('Pension Auto-Enrolment', 'Opted out', 2),
  ('W-4 Filing Status', 'Single', 1), ('W-4 Filing Status', 'Married', 2), ('W-4 Filing Status', 'Head of Household', 3),
  ('State Withholding', 'None (TX)', 1), ('State Withholding', 'CA', 2), ('State Withholding', 'NY', 3),
  ('FLSA Classification', 'Exempt', 1), ('FLSA Classification', 'Non-exempt', 2);

INSERT INTO parameter_types (name) SELECT DISTINCT type_name FROM seed_options ON CONFLICT (name) DO NOTHING;

INSERT INTO parameters ("parameterTypeId", text, "displayOrder", "isVisible")
SELECT pt.id, s.text, s.ord, true
FROM seed_options s
JOIN parameter_types pt ON pt.name = s.type_name
ON CONFLICT ("parameterTypeId", text) DO NOTHING;
