-- A leave policy rule can use an editable formula; a leave type can say what carry forward means for each employee category.
ALTER TABLE "leave_policy_rules" ADD COLUMN "formula" TEXT;
ALTER TABLE "leave_types" ADD COLUMN "carryForwardRules" JSONB NOT NULL DEFAULT '[]';
