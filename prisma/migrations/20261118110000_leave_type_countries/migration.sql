-- AlterTable
ALTER TABLE "leave_types" ADD COLUMN     "countryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
