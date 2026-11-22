-- Employee codes can be branch wise: a branch with a prefix (for example "EA-") numbers its employees EA-001, EA-002 and so on.
ALTER TABLE "branches" ADD COLUMN "employeeCodePrefix" TEXT;
