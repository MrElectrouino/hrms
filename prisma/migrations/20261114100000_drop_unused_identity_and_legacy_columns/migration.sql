-- Identity numbers live in the Documents module (documents.identityNoEnc/Hash), not on profiles.
DROP INDEX IF EXISTS "profiles_passportNoHash_idx";
DROP INDEX IF EXISTS "profiles_emiratesIdHash_idx";
DROP INDEX IF EXISTS "profiles_molNoHash_idx";
DROP INDEX IF EXISTS "profiles_visaNoHash_idx";

ALTER TABLE "profiles"
  DROP COLUMN "passportNoEnc",
  DROP COLUMN "passportNoHash",
  DROP COLUMN "emiratesIdEnc",
  DROP COLUMN "emiratesIdHash",
  DROP COLUMN "molNoEnc",
  DROP COLUMN "molNoHash",
  DROP COLUMN "visaNoEnc",
  DROP COLUMN "visaNoHash";

-- No legacy DES passwords to migrate; bcrypt hashes only.
ALTER TABLE "users" DROP COLUMN "legacyPasswordEnc";
