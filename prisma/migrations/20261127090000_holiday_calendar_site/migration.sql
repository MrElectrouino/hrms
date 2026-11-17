-- A holiday calendar can belong to a site (a Site from Masters), as well as to a company, country or branch.
ALTER TABLE "holiday_calendars" ADD COLUMN "siteId" INTEGER;
CREATE INDEX "holiday_calendars_siteId_idx" ON "holiday_calendars"("siteId");
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
