-- CreateTable
CREATE TABLE "profile_field_rules" (
    "id" SERIAL NOT NULL,
    "countryCode" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "groupTitle" TEXT NOT NULL DEFAULT '',
    "fieldKey" TEXT NOT NULL DEFAULT '',
    "isVisible" BOOLEAN,
    "isRequired" BOOLEAN,
    "updatedByProfileId" INTEGER,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_field_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_field_rules_countryCode_idx" ON "profile_field_rules"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "profile_field_rules_scope_key" ON "profile_field_rules"("countryCode", "sectionKey", "groupTitle", "fieldKey");
