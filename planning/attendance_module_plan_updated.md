# HRMS Attendance & Leave Architecture Plan

## 1. Purpose

Design a configurable attendance and leave foundation for a generic HRMS application.

- **Backend:** NestJS
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Frontend:** Next.js and Tailwind CSS
- **Initial country scope:** India and UAE, with room for additional countries.

The architecture separates common attendance processing from country-specific rules and company-configurable policies.

## 2. Core Design Principles

1. Keep common attendance processing in one shared service.
2. Use country-specific policy strategies only for genuine legal, operational, or legacy differences.
3. Store configurable thresholds and company choices in the database; do not hardcode them.
4. Use effective-dated employee assignments.
5. Keep Work Schedule, Shift, Roster, Site, Holiday Calendar, Leave Policy, and Attendance Policy as separate concepts.
6. Preserve calculation inputs, policy versions, and audit history.
7. Do not mark an employee absent until the system establishes that the employee was expected to work.

## 3. Working-Hour Types

The initial implementation supports two schedule types.

### 3.1 Fixed Working Hours

A fixed schedule has a defined start and end time.

Example:
- Start: 09:00
- End: 18:00
- Break: 60 minutes
- Required working time: 8 hours

Late arrival can be calculated against the scheduled start time, subject to the applicable grace period and Attendance Policy.

### 3.2 Flexible Working Hours

A flexible schedule has an allowed start window and a required amount of working time.

Example:
- Earliest start: 07:00
- Latest start: 10:00
- Required working time: 8 hours

An employee starting at 09:45 should not automatically be marked late merely because they did not start at 09:00. Calculate required working duration and any configured flexible-hours conditions.

### 3.3 Work Schedule Fields

| Field | Description |
|---|---|
| Id | Primary key |
| OrganizationId | Organization |
| Name / Code | Schedule name and code |
| ScheduleType | FIXED or FLEXIBLE |
| StartTime / EndTime | Fixed schedule times |
| EarliestStartTime / LatestStartTime | Flexible start window |
| RequiredDailyMinutes | Required working minutes |
| BreakDurationMinutes | Planned break duration |
| IsActive | Active status |

For weekday-specific requirements, add a `WorkScheduleDay` table. Avoid adding weekly-hours-only or core-hours models until required.

## 4. Separate Attendance Concepts

| Concept | Purpose |
|---|---|
| Site | Work location and timezone context |
| Shift | Operational time window, such as morning or night shift |
| Work Schedule | Required working time and fixed/flexible start model |
| Roster | Employee's date-specific workday, weekly off, and shift assignment |
| Holiday Calendar | Public and company holidays applicable to an employee |
| Leave | Approved leave and partial-day leave |
| Attendance Policy | Rules for late arrival, short hours, half-day, overtime, and exceptions |

A fixed-hours employee may work rotating shifts through a roster. A flexible-hours employee may not have a fixed shift start. Shift and Work Schedule are not interchangeable.

## 5. Master Setup

```text
Master Setup
├── Site Management
├── Shift Management
├── Work Schedule
│   ├── Fixed Working Hours
│   └── Flexible Working Hours
├── Roster Management
└── Holiday Calendar
```

Leave Types and Leave Policies belong in Leave Management and integrate with attendance.

### 5.1 Site Management

Support site name/code, address, country, timezone, active status, and optional default holiday calendar or attendance policy. Employee-to-site assignments should be effective-dated.

### 5.2 Shift Management

Support name/code, start/end time, break definitions, overnight shift handling, and active status. Shift describes operational timing; it does not replace Work Schedule.

### 5.3 Roster Management

A roster entry may identify employee, work date, working day or weekly off, assigned shift, optional schedule override, and source (manual, upload, or generated pattern).

Roster management should support manual entry and Excel upload.

### 5.4 Holiday Calendar

Support calendar name, country/region, holiday date/name/type, optional site or employee-group applicability, and active status. Support manual entry and Excel upload.

### 5.5 Import Workflow

For roster and holiday imports:
1. Download an Excel template.
2. Upload the completed file.
3. Parse and validate rows.
4. Preview before saving.
5. Detect duplicates and conflicting assignments.
6. Show row-level validation messages.
7. Save according to the selected import policy (all-or-nothing or partial success).
8. Keep import history, uploader, timestamp, and results.

## 6. Employee Configuration and Effective-Dated Assignments

Allow assignment of Site, Work Schedule, Attendance Policy, Holiday Calendar (or inherited calendar), and Roster/Roster Pattern.

Assignments should have effective start/end dates. Prevent overlapping active assignments where only one assignment is valid at a time.

Define inheritance clearly. For example, an employee may inherit the holiday calendar from their site unless an employee-level assignment overrides it.

Historical attendance should retain references to the resolved configuration or a configuration snapshot so later master-data changes do not silently rewrite historical calculations.

## 7. Attendance Policy

Attendance Policy is separate from Work Schedule. Possible configurable rules include:
- Late-arrival grace minutes
- Short-hours threshold
- Half-day threshold
- Overtime eligibility and calculation
- Missing-punch handling
- Attendance correction window
- Special-status handling
- Country- or employee-group-specific exceptions

Use policy rule records or versioned policy configuration rather than hardcoding company-specific values.

## 8. Attendance Data Model

The following is a conceptual model; refine Prisma models and relationships during implementation.

### 8.1 AttendancePunch

Store individual punch events rather than assuming one IN and one OUT per employee per day.

Suggested fields:
- Id, OrganizationId, EmployeeId
- PunchDateTimeUtc
- PunchType (IN or OUT)
- Source (web, mobile, device, import, manual)
- SiteId, where known
- DeviceReference
- CreatedAt, CreatedBy

This supports multiple sessions, for example 08:30 IN, 12:30 OUT, 13:30 IN, 17:30 OUT. Define duplicate punch, unmatched punch, overnight, and correction handling.

### 8.2 AttendanceDaily

Suggested fields:
- Id, OrganizationId, EmployeeId, AttendanceDate
- SiteId, RosterEntryId, ShiftId, WorkScheduleId
- AttendancePolicyId and policy version/reference
- FirstInUtc, LastOutUtc
- WorkedMinutes, RequiredMinutes
- LateMinutes, ShortMinutes, OvertimeMinutes
- AttendanceStatusCode
- ProcessingStatus
- IsManuallyAdjusted
- CalculationVersion
- CreatedAt, UpdatedAt, audit user references

Use semantic status codes such as PRESENT, ABSENT, LATE, SHORT_HOURS, HALF_DAY, HOLIDAY, WEEKLY_OFF, PAID_LEAVE, UNPAID_LEAVE, and WORKED_ON_HOLIDAY. Map country-specific or legacy numeric IDs to semantic statuses.

### 8.3 Adjustments and Approvals

Keep manual corrections separate from raw punches and calculated results. Suggested entities:
- AttendanceAdjustment
- AttendanceApproval
- AttendanceProcessingLog

Record original and corrected values, reason, requester, approver, and timestamps.

## 9. Attendance Processing Flow

For each employee and work date:
1. Resolve effective site and timezone.
2. Resolve roster entry.
3. Determine working day or weekly off.
4. Check applicable holiday calendar.
5. Retrieve approved leave and partial-day leave.
6. Resolve applicable shift, if any.
7. Resolve Work Schedule (fixed or flexible).
8. Retrieve and validate punch events.
9. Calculate worked minutes.
10. Resolve effective Attendance Policy.
11. Calculate late, short hours, half-day, and overtime.
12. Determine final semantic attendance status.
13. Save result, calculation inputs/version, and audit details.

First determine whether the employee was expected to work. A missing punch on a weekly off, holiday, or approved leave date must not automatically produce an absence.

## 10. Fixed and Flexible Calculations

**Fixed schedule:** Compare actual attendance against scheduled start and required working duration, applying the configured grace period and policy.

**Flexible schedule:** Compare worked duration with required working duration and validate the allowed start window if required by policy. Do not apply a fixed-start late rule by default.

Break deduction, rounding, overnight handling, and incomplete punch treatment must be explicitly defined.

## 11. Country-Specific Attendance Policies

Use one shared attendance processing service with country-specific policy strategies for genuine differences.

Suggested NestJS structure:

```text
src/attendance/
  attendance.module.ts
  attendance.controller.ts
  attendance.service.ts
  attendance.repository.ts
  dto/
  policies/
    attendance-policy.interface.ts
    attendance-policy.factory.ts
    india/india-attendance.policy.ts
    uae/uae-attendance.policy.ts
  rules/
    timestamp.rule.ts
    late.rule.ts
    short-hours.rule.ts
    half-day.rule.ts
    overtime.rule.ts
    validation.rule.ts
  calculations/
    punch-calculator.service.ts
    daily-attendance.service.ts
```

The shared service orchestrates data loading, policy resolution, calculation, persistence, and audit. Country-specific strategies handle country-specific legal rules, timestamp conventions, legacy status mappings, and special cases such as Ramadan where applicable.

### 11.1 Legacy Procedure Migration

The existing system has separate India and UAE attendance procedures. During migration:
- Identify the business rule behind each legacy condition.
- Move configurable values into policy/configuration.
- Keep genuine country-specific behavior in the country strategy.
- Map legacy status IDs to semantic application statuses.
- Compare old and new calculations against representative historical cases before cutover.

Do not copy entire legacy procedures into separate country-specific services without separating common logic from policy differences.

# 12. Leave Management Integration

Leave Management owns leave applications, leave balances, leave policies, leave types, accrual, and leave-specific calculations.

Attendance processing consumes approved leave results. It should not independently invent or recalculate leave entitlement.

## 12.1 Leave Type Configuration: Sandwich Eligibility

When System Admin creates or edits a Leave Type, provide a Boolean setting:

**Eligible for Sandwich Leave Policy**

Suggested database field:

| Field | Type | Default | Description |
|---|---|---|---|
| IsSandwichEligible | BOOLEAN | false | Determines whether this leave type participates in sandwich leave calculation |

Example configuration:

| Leave Type | IsSandwichEligible |
|---|---:|
| Annual Leave | true |
| Casual Leave | true |
| Sick Leave | false |
| Maternity Leave | false |
| Unpaid Leave | false |

These are examples only. Each organization chooses which leave types are eligible.

## 12.2 Organization-Level Sandwich Configuration

Provide an organization-level setting to enable or disable the Sandwich Leave Policy.

The sandwich calculation runs only when:
1. The organization's Sandwich Leave Policy is enabled.
2. The selected leave type has `IsSandwichEligible = true`.
3. The applicable policy conditions are satisfied.

If the organization disables the policy, no leave type triggers sandwich calculation even if its eligibility flag is true.

Recommended eligibility logic:

```text
ApplySandwichPolicy =
    Organization.SandwichLeaveEnabled
    AND LeaveType.IsSandwichEligible
    AND ApplicableSandwichPolicyConditionsAreMet
```

## 12.3 Sandwich Policy Rules

Keep actual sandwich calculation rules in Leave Policy configuration, not Attendance Policy.

Potential settings include:
- Apply to weekly offs
- Apply to public holidays
- Apply only when leave exists on both sides of an intervening non-working day
- Whether separate leave applications can form one continuous leave period
- Treatment of partial-day leave
- Whether the intervening day is debited from leave balance or treated as unpaid
- Exceptions required by law or employee category

The feature is optional and should be disabled by default.

### Example

Assume Friday and Monday are working days and Saturday/Sunday are weekly offs.

| Day | Day Type | Eligible Annual Leave | Non-eligible Sick Leave |
|---|---|---:|---:|
| Friday | Working day with leave | 1 | 1 |
| Saturday | Weekly off | 1 | 0 |
| Sunday | Weekly off | 1 | 0 |
| Monday | Working day with leave | 1 | 1 |
| **Total** | | **4 days** | **2 days** |

This is an illustrative result only. Actual calculation depends on organization settings, leave application continuity, and applicable statutory requirements.

### Legal consideration

Do not apply a company sandwich rule blindly to every employee or leave category. For India, statutory annual-leave provisions and coverage of the relevant worker/establishment must be considered. Legal requirements may override configurable company rules. Country-specific legal validation is required before enabling this feature.

## 13. API and Frontend Areas

Potential API areas:

```text
/master/sites
/master/shifts
/master/work-schedules
/master/rosters
/master/holiday-calendars

/attendance/punches
/attendance/daily
/attendance/adjustments
/attendance/approvals
/attendance/process

/leave/types
/leave/policies
/leave/applications
/leave/balances
```

Frontend screens should include:
- Site Management
- Shift Management
- Work Schedule Management
- Roster Calendar and Roster Upload
- Holiday Calendar and Holiday Upload
- Attendance Daily View
- Attendance Corrections and Approvals
- Leave Type Create/Edit, including Sandwich Eligibility
- Organization/System Configuration, including the organization-level Sandwich Policy switch
- Leave Policy Configuration
- Leave Application and Leave Balance views

The Leave Type form exposes `IsSandwichEligible` to authorized System Admin users. The organization-level enable/disable control is managed separately in system/organization configuration.

## 14. Validation, Audit, and Operations

- Validate effective-date overlaps for employee assignments.
- Validate roster conflicts and duplicate employee/date entries.
- Validate holiday duplicates within a calendar.
- Keep raw punches immutable where possible; corrections should be auditable adjustments.
- Record who changed schedules, rosters, policies, leave-type eligibility, and organization-level sandwich settings.
- Preserve the policy/configuration version used for each processed attendance or leave calculation.
- Support controlled recalculation and retain before/after results.
- Make timezone conversion explicit, especially for sites in different countries.
- Define overnight shift and daylight-saving behavior where relevant.

## 15. Suggested Implementation Phases

### Phase 1 — Master Setup
- Site Management
- Shift Management
- Fixed and Flexible Work Schedules
- Holiday Calendar
- Roster Management and Excel import

### Phase 2 — Employee Assignments
- Effective-dated site assignment
- Work Schedule assignment
- Attendance Policy assignment
- Holiday Calendar assignment/inheritance
- Roster assignment

### Phase 3 — Attendance Foundation
- Punch capture and validation
- Daily attendance calculation
- Fixed and flexible schedule calculations
- Attendance adjustments and approvals
- Attendance processing logs

### Phase 4 — Country Policies
- India policy strategy
- UAE policy strategy
- Country-specific validation and status mapping
- Legacy comparison and migration testing

### Phase 5 — Leave Integration
- Leave Type and Leave Policy configuration
- Approved leave integration with attendance
- Organization-level Sandwich Leave Policy enable/disable
- Leave Type `IsSandwichEligible` setting
- Sandwich calculation and audit details
- Statutory/legal overrides and validation

### Phase 6 — Reporting and Optimization
- Attendance reports
- Missing punch reports
- Late and short-hours reports
- Roster and holiday import reports
- Leave balance and sandwich calculation audit reports
- Performance testing and processing optimization

## 16. Decisions to Confirm Before Implementation

1. Whether flexible schedules require an allowed start window or only required daily minutes.
2. How breaks are represented and deducted.
3. How overnight shifts and unmatched punches are handled.
4. Whether roster patterns repeat automatically.
5. Whether holiday calendars are inherited from site, country, or organization by default.
6. Whether roster imports allow partial success or require all rows to be valid.
7. Which employee groups are covered by each attendance and leave policy.
8. How leave applications on either side of weekly offs/holidays are considered continuous for sandwich calculation.
9. Which statutory rules and employee categories override company sandwich settings.
10. Whether sandwich deductions are debited from leave balance, treated as unpaid, or handled through another configured method.

## 17. Final Architecture Recommendation

Build a shared Attendance Engine that resolves Site, Roster, Shift, Work Schedule, Holiday Calendar, Leave, and Attendance Policy for each employee/date.

Keep country-specific behavior in policy strategies and configurable company choices in the database.

Keep sandwich leave within Leave Management:
- An organization-level switch enables or disables the Sandwich Leave Policy.
- `LeaveType.IsSandwichEligible` decides which leave types participate.
- Leave Policy rules define how weekly offs, holidays, and continuous leave periods are treated.

This supports organizations that use sandwich leave, organizations that do not use it, and organizations that apply it only to selected leave types.
