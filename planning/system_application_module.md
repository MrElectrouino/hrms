# System Administration Module – Global HRMS

> **Implementation note (2026-11-13):** this doc is a plan, not a spec to follow verbatim —
> improvise against what already exists in `prisma/schema.prisma` rather than building parallel
> structures. In particular:
> - **Section F (Application Configuration, key-value settings)** — a general-purpose key-value
>   config table already exists: `SystemConfiguration` (table `system_configurations`: `name`,
>   `value`, `valueDate`, `valueKind` for string/number/date/secret typing, `description`).
>   Simple global on/off flags and defaults (self-service toggles, notification toggles, etc.)
>   should go there first; only split out a dedicated model when a setting needs real structure
>   (relations, per-scope overrides) that a flat key-value row can't express.
> - **Country scoping (Sections D/E)** — don't introduce `CountrySettings`/`CountryFieldConfig`
>   from scratch yet. The project already has a working convention for country-scoped
>   admin-managed masters: `countryCode String @default("ALL")` (see `CustomFieldDefinition` and
>   `SalaryTemplate`). New country-scoped masters (leave types, etc.) should follow that same
>   pattern for consistency.
> - **Small admin-editable code lists** — `ParameterType`/`Parameter` is the existing generic
>   catalog pattern (legacy `system.ParameterType`/`Parameter`) for small dropdown-backed lists;
>   check there before adding a new lookup table for something that's really just a short list of
>   codes.
> - **Gap vs. this plan:** the current schema has no multi-organization/multi-tenant layer at all
>   (no `Organization`, no per-org data isolation) — `Site` is a flat 4-row master. Sections C, H
>   and the "Organization Overrides" layer in §5 describe a real multi-tenant architecture that
>   does not exist yet; treat those as the furthest-out, least-grounded part of this plan.

## 1. Project Context

We are developing a Global HRMS application that supports multiple organizations and multiple countries.

### Technology Stack
- Frontend: Next.js
- UI Styling: Tailwind CSS
- Backend: NestJS
- ORM: Prisma
- Database: PostgreSQL

The application must support multiple organizations, legal entities, branches/sites and countries.

The System Administration module is accessible exclusively to the **System Admin (Super Admin)**. Organization Administrators must not have access to global system configuration.

## 2. Objective

Develop a centralized System Administration module to manage global application settings, branding, regional configurations, country-specific settings, custom fields, organization defaults, modules and security policies.

The application should be configurable rather than hardcoded. Adding a new country or organization should not require changes to the application source code for ordinary configuration requirements.

## 3. System Administration Menu Structure

Create the following menu structure:

### A. Application Branding
Manage the global application appearance.

Fields:
- Application Name
- Application Logo
- Application Favicon
- Primary Color
- Secondary Color
- Accent Color
- Login Page Branding
- Application Footer Text

Requirements:
- Allow uploading and changing logos.
- Support image previews.
- Allow organizations to override global branding where permitted.
- Store uploaded files in object storage and their references in PostgreSQL.

### B. Regional Settings

Manage default regional configurations.

Fields:
- Default Country
- Default Timezone
- Default Language
- Default Date Format
- Default Time Format (12/24 hours)
- Default Currency
- Number Format

Requirements:
- Support different timezones for organizations and sites.
- Store timestamps in UTC and apply the relevant timezone for display and business processing.
- Support country-specific regional formats.

### C. Organization Management

Manage companies registered in the HRMS.

Features:
- Create Organization
- Edit Organization
- Activate / Deactivate Organization
- Organization Details
- Organization Logo
- Organization Branding
- Organization Countries
- Legal Entities
- Branches / Sites
- Organization Administrator
- Organization Subscription / Status

Each organization should have its own configuration and data isolation.

### D. Country Configuration

Manage countries supported by the HRMS.

Features:
- Country Master
- Country Code (ISO)
- Country Name
- Currency
- Default Timezone
- Default Language
- Date Format
- Country-specific Employee Sections
- Country-specific Employee Fields
- Country-specific Statutory Information
- Country-specific HR Settings

Initially support:
- India
- United Arab Emirates (UAE)

The architecture must allow additional countries without code changes for standard configuration.

### E. Custom Fields

Provide a dynamic custom-field management feature.

System Admin should be able to create additional fields for employee profiles.

Field properties:
- Field Name
- Field Code
- Section
- Field Type
- Placeholder
- Description
- Required / Optional
- Visible / Hidden
- Country Applicability
- Organization Applicability
- Display Order
- Active / Inactive

Supported field types:
- Text
- Textarea
- Number
- Decimal
- Date
- Dropdown
- Multi-select
- Radio
- Checkbox
- Email
- Phone
- URL

For dropdown and multi-select fields, allow administrators to manage options.

Do not hardcode custom fields in React components. Render them through a reusable dynamic field renderer.

### F. Application Configuration

Manage general application behavior.

Examples:
- Default Employee Code Format
- Employee Code Auto Generation
- Enable Employee Self-Service
- Enable Manager Self-Service
- Enable Notifications
- Enable Document Expiry Alerts
- Enable Approval Workflows
- Enable Audit Logging

Provide a flexible configuration mechanism using key-value settings for simple application-level options.

Use dedicated database models for complex configuration entities.

### G. Module Configuration

Allow System Admin to control available HRMS modules.

Modules:
- User Management
- Employee Management
- Document Management
- Leave Management
- Attendance Management
- Payroll Management
- Leave Salary
- Full & Final Settlement
- Onboarding
- Performance Management

Features:
- Enable / Disable module.
- Assign available modules to organizations.
- Define dependencies between modules.
- Prevent disabling modules that are required by active modules unless dependencies are resolved.

### H. Organization Templates

Create predefined configuration templates for new companies.

Examples:
- UAE Standard HRMS
- India Standard HRMS
- Global Standard HRMS

A template should define:
- Supported countries
- Default modules
- Employee profile sections and fields
- Default regional settings
- Default application configuration
- Default HR configuration

When creating a new organization, System Admin can select a template.

The system should copy the template configuration into the new organization rather than maintaining a live dependency on the template.

### I. Security Configuration

Manage global security defaults.

Features:
- Password Policy
- Minimum Password Length
- Password Complexity
- Session Timeout
- Maximum Failed Login Attempts
- Account Lockout Duration
- Multi-Factor Authentication Settings
- Login Session Management

Allow organization-specific overrides only where permitted by System Admin.

## 4. Database Architecture

Use PostgreSQL with Prisma ORM.

Create separate relational models for:

- SystemSettings
- OrganizationSettings
- CountrySettings
- SiteSettings
- CustomFieldDefinitions
- CustomFieldOptions
- OrganizationModules
- OrganizationTemplates
- TemplateConfigurations
- CountrySectionConfig
- CountryFieldConfig
- SystemAuditLogs

Requirements:
- Use UUID primary keys.
- Add appropriate foreign keys and unique constraints.
- Use createdAt, updatedAt, createdBy and updatedBy where applicable.
- Use soft deletion or active/inactive status where appropriate.
- Ensure organization data isolation.
- Avoid storing everything in one generic configuration table.
- Use JSONB only for genuinely flexible configuration payloads.

## 5. Configuration Inheritance

Implement configuration resolution using the appropriate scope:

1. System Defaults
2. Organization Overrides
3. Country-specific Configuration
4. Site-specific Configuration

Not every setting should support every scope. Define allowed override scopes for each configuration type.

For example:
- Application branding: System / Organization.
- Timezone: Organization / Country / Site.
- Employee form fields: System defaults / Organization / Country.
- Security: System defaults / Organization where permitted.

More specific settings should override inherited defaults only when that setting supports the relevant scope.

## 6. Caching

Use Redis for frequently accessed configuration.

Requirements:
- Cache global application settings.
- Cache organization settings.
- Cache country configurations.
- Cache employee form sections and fields.
- Invalidate relevant cache keys after configuration updates.
- Use appropriate TTL as a fallback.
- Support multiple NestJS instances using shared Redis.
- PostgreSQL remains the source of truth.

## 7. Backend Architecture – NestJS

Create separate NestJS modules:

- system-admin
- application-branding
- regional-settings
- organization-management
- country-configuration
- custom-fields
- application-configuration
- module-configuration
- organization-templates
- security-configuration

Requirements:
- Use DTOs for request validation.
- Use Prisma services for database operations.
- Implement RBAC and API authorization.
- Restrict System Administration APIs to System Admin.
- Use transactions for multi-table operations.
- Implement centralized exception handling.
- Maintain audit logs for configuration changes.

## 8. Frontend Architecture – Next.js

Create a modern enterprise SaaS administration interface.

Design requirements:
- Clean and professional UI.
- Consistent with the existing HRMS application design.
- Responsive layout.
- Left sidebar navigation.
- Page title and breadcrumbs.
- Search and filtering where appropriate.
- Reusable form components.
- Consistent spacing and typography.
- Confirmation dialogs for important changes.
- Loading, empty and error states.
- Success notifications.

Each configuration category should have its own dedicated page.

Do not create one massive settings page.

Use reusable components and a consistent design system.

## 9. Access Control

Only System Admin can:
- Access the System Administration menu.
- Create and update global settings.
- Manage country configurations.
- Manage application branding.
- Manage organization templates.
- Configure global modules.
- Manage global security defaults.

Organization Admin can only manage settings explicitly delegated to their organization.

Enforce all permissions in the backend APIs, not only in the frontend.

## 10. Audit and Data Integrity

Record:
- Who changed the configuration.
- What was changed.
- Previous value.
- New value.
- Date and time.
- Organization or country context, where applicable.

Configuration updates must not accidentally delete existing employee data.

Hiding an employee field must not delete its previously stored values.

## 11. Development Instructions

Before implementation:

1. Review the existing project structure.
2. Review the existing Prisma schema.
3. Identify reusable frontend and backend components.
4. Propose the database relationships.
5. Prepare a modular implementation plan.
6. Identify configuration inheritance and caching requirements.

Then implement the module incrementally.

Do not duplicate existing functionality.

Do not hardcode country-specific conditions in frontend components.

Use reusable components, proper TypeScript types, DTO validation and clean service architecture.

## 12. Expected Deliverables

Provide:
1. Database schema using Prisma.
2. Database migration files.
3. Seed data for India and UAE.
4. NestJS modules, controllers, services and DTOs.
5. REST API documentation.
6. Next.js System Administration UI.
7. Redis caching implementation.
8. RBAC implementation.
9. Audit logging.
10. Sample configuration data for new organizations.

**Important:** Build this as a scalable foundation for a global HRMS, not as a collection of unrelated settings screens.