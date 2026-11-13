-- CreateTable
CREATE TABLE "application_branding" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "appName" TEXT NOT NULL DEFAULT 'HRMS',
    "logoFileId" BIGINT,
    "faviconFileId" BIGINT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "loginBrandingText" TEXT,
    "footerText" TEXT,
    "updatedByProfileId" INTEGER,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "application_branding_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "application_branding" ADD CONSTRAINT "application_branding_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_branding" ADD CONSTRAINT "application_branding_faviconFileId_fkey" FOREIGN KEY ("faviconFileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
