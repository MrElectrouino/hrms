# HRMS Attendance & Leave Architecture Plan

## 1. Purpose

Design a configurable attendance and leave foundation for a generic HRMS application built with:

- **Backend:** NestJS
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Frontend:** Next.js and Tailwind CSS

The initial country scope includes India and UAE, while the architecture should support additional countries without duplicating the entire attendance engine.

The design separates common attendance processing from country-specific rules and company-configurable policies.

---

## 2. Core Design Principles

1. Keep common attendance processing in one shared service.
2. Use country-specific policy strategies only for genuine legal, operational, or legacy differences.
3. Store configurable thresholds and company choices in the database; do not hardcode them.
4. Use effective-dated employee assignments so historical attendance can be interpreted using the configuration that applied at the time.
5. Keep Work Schedule, Shift, Roster, Site, Holiday Calendar, Leave Policy, and Attendance Policy as separate concepts.
6. Preserve calculation inputs, policy versions, and audit history.
7. Do not mark an employee absent until the system has established that the employee was expected to work on that date.

---

## 3. Working-Hour Types

The initial implementation will support two work schedule types.

### 3.1 Fixed Working Hours

A fixed schedule has a defined start and end time.

Example:

- Start: 09:00
- End: 18:00
- Break: 60 minutes
- Required working time: 8 hours
- Grace period: configured through the applicable Attendance Policy

Late arrival can be calculated against the scheduled start time, subject to grace-period and policy rules.

### 3.2 Flexible Working Hours

A flexible schedule has an allowed start window and a required amount of working time.

Example:

- Earliest start: 07:00
- Latest start: 10:00
- Required working time: 8 hours

An employee starting at 09:45 should not automatically be marked late merely because they did not start at 09:00. The calculation should focus on the required working duration and any configured flexible-hours conditions.

### 3.3 Work Schedule Data

Suggested fields:

| Field | Description |
|---|---|
| Id | Primary key |
| OrganizationId | Organization |
| Name | Schedule name |
| Code | Unique schedule code within organization |
| ScheduleType | FIXED or FLEXIBLE |
| StartTime | Fixed schedule start |
| EndTime | Fixed schedule end |
| EarliestStartTime | Earliest permitted flexible start |
| LatestStartTime | Latest permitted flexible start |
| RequiredDailyMinutes | Required working minutes |
| BreakDurationMinutes | Planned break duration, if applicable |
| IsActive | Active status |

For weekday-specific requirements, add a `WorkScheduleDay` table with the applicable weekday and required minutes. Avoid adding weekly-hours-only or core-hours models until the business requires them.

---

## 4. Separate the Attendance Concepts

These concepts are related but must not be represented as one configuration.

| Concept | Purpose |
|---|---|
| Site | Work location and timezone context |
| Shift | Operational time window, such as morning or night shift |
| Work Schedule | Required working time and fixed/flexible start model |
| Roster | Employee's date-specific workday, weekly off, and shift assignment |
| Holiday Calendar | Public and company holidays applicable to an employee |
| Leave | Approved leave and partial-day leave |
| Attendance Policy | Rules for late arrival, short hours, half-day, overtime, and exceptions |

A fixed-hours employee may still work rotating shifts through a roster. A flexible-hours employee may not have a fixed shift start. Do not treat Shift and Work Schedule as interchangeable.

---

## 5. Master Setup

The following items should be available under Master Setup:

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

Leave Types and Leave Policies should be managed in the Leave Management module, with their rules integrated into attendance processing.

### 5.1 Site Management

A site should support:

- Site name and code
- Address and country
- Timezone
- Active status
- Optional default holiday calendar and attendance policy

Employee-to-site assignments should be effective-dated.

### 5.2 Shift Management

A shift should support:

- Name and code
- Start and end time
- Break definitions
- Overnight shift indicator or supported cross-midnight time range
- Active status

Shift definitions describe operational timing. They do not replace the employee's Work Schedule.

### 5.3 Roster Management

Roster entries determine the employee's expected work pattern on each date.

A roster entry may identify:

- Employee
- Work date
- Working day or weekly off
- Assigned shift, where applicable
- Work schedule override, only if the product requires it
- Source: manual, upload, or generated pattern

Roster management should support both manual entry and Excel upload.

### 5.4 Holiday Calendar

A holiday calendar should support:

- Calendar name and country/region
- Holiday date
- Holiday name and type
- Optional site or employee-group applicability
- Active status

Holiday calendars should support manual entry and Excel upload.

### 5.5 Manual and Upload Workflows

| Setup | Manual | Excel Upload |
|---|---:|---:|
| Site | Yes | Not initially required |
| Shift | Yes | Not initially required |
| Work Schedule | Yes | Not initially required |
| Roster | Yes | Yes |
| Holiday Calendar | Yes | Yes |

For roster and holiday imports:

1. Download a standard Excel template.
2. Upload the completed file.
3. Parse and validate rows.
4. Show a preview before saving.
5. Detect duplicate entries and conflicting assignments.
6. Show row-level validation messages.
7. Save valid rows according to the chosen import policy (all-or-nothing or partial success).
8. Keep import history, uploader, timestamp, and results.

---

## 6. Employee Configuration and Effective-Dated Assignments

Employee configuration should allow assignment of:

- Site
- Work Schedule
- Attendance Policy
- Holiday Calendar, or inherited calendar
- Roster or roster pattern

Assignments should have effective start and end dates. Prevent overlapping active assignments where only one assignment is valid at a time.

Define inheritance clearly. For example, an employee may inherit the holiday calendar from their site unless an employee-level assignment overrides it.

Historical attendance should retain references to the resolved configuration or a configuration snapshot so later master-data changes do not silently rewrite historical calculations.

---

## 7. Attendance Policy

Attendance Policy controls how the system interprets attendance results. It should be separate from Work Schedule.

Possible configurable rules include:

- Late arrival grace minutes
- Short-hours threshold
- Half-day threshold
- Overtime eligibility and calculation
- Missing punch handling
- Allowed attendance correction window
- Special-status handling
- Country- or employee-group-specific exceptions

Use policy rule records or versioned policy configuration rather than hardcoding company-specific values in the attendance service.

---

## 8. Attendance Data Model

The following is a conceptual model. Final Prisma models and relationships should be refined during implementation.

### 8.1 AttendancePunch

Store individual punch events rather than assuming every employee has only one IN and one OUT.

Suggested fields:

| Field | Description |
|---|---|
| Id | Primary key |
| OrganizationId | Organization |
| EmployeeId | Employee |
| PunchDateTimeUtc | Punch timestamp in UTC |
| PunchType | IN or OUT |
| Source | Web, mobile, device, import, manual |
| SiteId | Site, if known |
| DeviceReference | External device identifier |
| CreatedAt / CreatedBy | Audit information |

This supports multiple work sessions, for example:

- 08:30 IN
- 12:30 OUT
- 13:30 IN
- 17:30 OUT

Define handling for duplicate punches, unmatched IN/OUT events, overnight shifts, and manual corrections.

### 8.2 AttendanceDaily

Store the processed daily result.

Suggested fields:

- Id, OrganizationId, EmployeeId, AttendanceDate
- SiteId, RosterEntryId, ShiftId, WorkScheduleId
- AttendancePolicyId and policy version/reference
- FirstInUtc and LastOutUtc
- WorkedMinutes and RequiredMinutes
- LateMinutes, ShortMinutes, OvertimeMinutes
- AttendanceStatusCode
- ProcessingStatus
- IsManuallyAdjusted
- CalculationVersion
- CreatedAt, UpdatedAt, and audit user references

Use semantic status codes such as:

- PRESENT
- ABSENT
- LATE
- SHORT_HOURS
- HALF_DAY
- HOLIDAY
- WEEKLY_OFF
- PAID_LEAVE
- UNPAID_LEAVE
- WORKED_ON_HOLIDAY

Country-specific or legacy numeric status IDs should be mapped to these semantic statuses rather than becoming the core application meaning.

### 8.3 Attendance Adjustment and Approval

Keep manual corrections separate from raw punches and calculated results.

Suggested entities:

- AttendanceAdjustment
- AttendanceApproval
- AttendanceProcessingLog

Record the original value, corrected value, reason, requester, approver, and timestamps.

---

## 9. Attendance Processing Flow

For each employee and work date:

1. Resolve the employee's effective site and timezone.
2. Resolve the roster entry.
3. Determine whether the date is a working day or weekly off.
4. Check the applicable holiday calendar.
5. Retrieve approved leave and partial-day leave.
6. Resolve the applicable shift, if any.
7. Resolve the Work Schedule (fixed or flexible).
8. Retrieve and validate punch events.
9. Calculate worked minutes.
10. Resolve the effective Attendance Policy.
11. Calculate late minutes, short hours, half-day, and overtime.
12. Determine the final semantic attendance status.
13. Save the result, calculation inputs/version, and audit details.

The system must first determine whether the employee was expected to work. A missing punch on a weekly off, holiday, or approved leave date must not automatically produce an absence.

---

## 10. Fixed and Flexible Calculations

### Fixed schedule

Compare actual attendance against the scheduled start and required working duration, applying the configured grace period and policy.

### Flexible schedule

Compare the employee's worked duration with the required working duration and validate the allowed start window if the policy requires it. Do not apply a fixed-start late rule by default.

Break deduction, rounding, overnight handling, and incomplete punch treatment must be explicitly defined in policy/configuration.

---

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
    india/
      india-attendance.policy.ts
    uae/
      uae-attendance.policy.ts
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

The shared service should orchestrate data loading, policy resolution, calculation, persistence, and audit. Country-specific strategies should handle country-specific legal rules, timestamp conventions, legacy status mappings, and special cases such as Ramadan where applicable.

### 11.1 Existing Legacy Procedure Differences

The existing system has separate India and UAE attendance procedures. During migration:

- Identify the actual business rule behind each legacy condition.
- Move configurable values into policy/configuration.
- Keep genuine country-specific behavior in the appropriate country strategy.
- Map legacy status IDs to semantic application statuses.
- Validate old and new calculations against representative historical cases before cutover.

Do not copy entire legacy stored procedures into separate country-specific NestJS services without first separating common logic from policy differences.

---

# 12. Leave Management Integration

Leave Management owns leave applications, leave balances, leave policies, leave types, accrual, and leave-specific calculations.

Attendance processing should consume approved leave results. It should not independently invent or recalculate leave entitlement.

## 12.1 Leave Type Configuration

When System Admin creates or edits a Leave Type, provide a Boolean setting:

**Eligible for Sandwich Leave Policy**

Suggested field:

| Field | Type | Default | Description |
|---|---|---|---|
| IsSandwichEligible | BOOLEAN | false | Determines whether this leave type participates in sandwich leave calculation |

Example:

| Leave Type | IsSandwichEligible |
|---|---:|
| Annual Leave | true |
| Casual Leave | true |
| Sick Leave | false |
| Maternity Leave | false |
| Unpaid Leave | false |

These are example settings only. Each organization chooses which leave types are eligible.

## 12.2 Company-Level Sandwich Configuration

Provide an organization-level setting to enable or disable the Sandwich Leave Policy.

The sandwich calculation should run only when:

1. The organization's Sandwich Leave Policy is enabled.
2. The leave type's `IsSandwichEligible` setting is true.
3. The applicable policy conditions are satisfied.

If the organization disables the policy, no leave type should trigger sandwich calculation even if its eligibility flag is true.

## 12.3 Sandwich Policy Rules

Keep the actual sandwich calculation rules in Leave Policy configuration, not in the Attendance Policy.

Potential company-level or leave-policy settings include:

- Apply to weekly offs
- Apply to public holidays
- Apply only when leave exists on both sides of an intervening non-working day
- Whether separate leave applications can form one continuous leave period
- Treatment of partial-day leave
- Whether the intervening day is debited from leave balance or treated as unpaid
- Exceptions required by applicable law or employee category

Do not assume every company uses sandwich leave. The organization-level policy should be optional and disabled by default.

### Example

Assume Friday and Monday are working days and Saturday/Sunday are weekly offs.

| Day | Day Type | Sandwich-eligible Annual Leave | Non-eligible Sick Leave |
|---|---|---:|---:|
| Friday | Working day with leave | 1 | 1 |
| Saturday | Weekly off | 1 | 0 |
| Sunday | Weekly off | 1 | 0 |
| Monday | Working day with leave | 1 | 1 |
| **Total** | | **4 days** | **2 days** |

This is an illustrative result only. The actual calculation depends on the organization's settings, leave application continuity, and applicable statutory requirements.

### Important legal consideration

Do not apply a company sandwich rule blindly to every employee or leave category. For India, statutory annual-leave provisions and the coverage of the relevant worker/establishment must be considered. Legal requirements may override the organization's configurable rule. Country-specific legal validation is required before enabling the feature.

---

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
/leave/policies/{id}/sandwich-rules
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
- Leave Policy Configuration, including organization-level Sandwich Policy settings
- Leave Application and Leave Balance views

The Leave Type form should expose the `IsSandwichEligible` toggle to authorized System Admin users. The organization-level sandwich enable/disable control should be managed separately in system/organization configuration.

---

## 14. Validation, Audit, and Operational Requirements

- Validate effective-date overlaps for employee assignments.
- Validate roster conflicts and duplicate employee/date entries.
- Validate holiday duplicates within a calendar.
- Keep raw punches immutable where possible; corrections should be auditable adjustments.
- Record who changed schedules, rosters, policies, leave-type eligibility, and organization-level sandwich settings.
- Preserve the policy/configuration version used for each processed attendance or leave calculation.
- Support recalculation with a controlled process and retain before/after results.
- Make timezone conversion explicit, especially for sites in different countries.
- Define overnight shift and daylight-saving behavior where relevant.

---

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

---

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

---

## 17. Final Architecture Recommendation

Build a shared Attendance Engine that resolves Site, Roster, Shift, Work Schedule, Holiday Calendar, Leave, and Attendance Policy for each employee/date.

Keep country-specific behavior in policy strategies and configurable company choices in the database.

Keep sandwich leave within Leave Management. Use:
- An organization-level switch to enable or disable the Sandwich Leave Policy.
- `LeaveType.IsSandwichEligible` to decide which leave types participate.
- Leave Policy rules to define how weekly offs, holidays, and continuous leave periods are treated.

This supports organizations that use sandwich leave, organizations that do not use it, and organizations that apply it only to selected leave types.
