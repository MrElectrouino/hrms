-- AlterTable
ALTER TABLE "document_types" DROP COLUMN "countryCode",
ADD COLUMN     "countryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
