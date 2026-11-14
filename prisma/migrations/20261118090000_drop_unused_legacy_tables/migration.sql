-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "bank_accounts" DROP CONSTRAINT "bank_accounts_profileId_fkey";

-- DropForeignKey
ALTER TABLE "document_field_values" DROP CONSTRAINT "document_field_values_documentId_fkey";

-- DropForeignKey
ALTER TABLE "document_field_values" DROP CONSTRAINT "document_field_values_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "holiday_calendar_entries" DROP CONSTRAINT "holiday_calendar_entries_holidayListId_fkey";

-- DropForeignKey
ALTER TABLE "holiday_calendar_entries" DROP CONSTRAINT "holiday_calendar_entries_profileId_fkey";

-- DropForeignKey
ALTER TABLE "holiday_lists" DROP CONSTRAINT "holiday_lists_siteId_fkey";

-- DropForeignKey
ALTER TABLE "weekly_off_assignments" DROP CONSTRAINT "weekly_off_assignments_profileId_fkey";

-- DropForeignKey
ALTER TABLE "weekly_off_assignments" DROP CONSTRAINT "weekly_off_assignments_weeklyOffConfigId_fkey";

-- DropForeignKey
ALTER TABLE "weekly_off_configs" DROP CONSTRAINT "weekly_off_configs_siteId_fkey";

-- DropTable
DROP TABLE "activity_logs";

-- DropTable
DROP TABLE "bank_accounts";

-- DropTable
DROP TABLE "document_field_values";

-- DropTable
DROP TABLE "holiday_calendar_entries";

-- DropTable
DROP TABLE "holiday_lists";

-- DropTable
DROP TABLE "weekly_off_assignments";

-- DropTable
DROP TABLE "weekly_off_configs";

