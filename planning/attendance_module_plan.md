# HRMS Attendance Module -- Architecture & Implementation Plan

**Project:** Generic Global HRMS\
**Initial countries:** India and UAE\
**Backend:** NestJS, Prisma, PostgreSQL\
**Frontend:** Next.js, Tailwind CSS\
**Document status:** Architecture plan -- working draft

------------------------------------------------------------------------

## 1. Purpose

Design a reusable Attendance module for a global HRMS. The module must
support different company working arrangements and country-specific
attendance rules without creating a completely separate attendance
system for each country.

The initial working-hour models are:

1.  **Fixed Working Hours**
2.  **Flexible Working Hours**

Attendance processing must also consider the employee's roster, holiday
calendar, shift, site and approved leave.

## 2. Design principles

-   Use one common attendance domain and shared attendance records.
-   Keep working schedules, shifts, rosters, holiday calendars, sites
    and leave as separate concepts.
-   Keep country-specific rules in country attendance policies, not
    scattered throughout common attendance code.
-   Use effective-dated assignments so historical attendance can be
    recalculated using the configuration that applied on that date.
-   Support both manual maintenance and bulk Excel upload where
    required.
-   Keep configurable values in the database; implement executable
    business rules in NestJS.
-   Preserve an audit trail for attendance changes, imports, approvals
    and recalculations.

## 3. Scope

### 3.1 In scope

  -----------------------------------------------------------------------
  Area                    Responsibility          Maintenance
  ----------------------- ----------------------- -----------------------
  Work Schedule           Defines fixed or        Manual
                          flexible working-hour   
                          requirements            

  Shift Management        Defines shift timings   Manual
                          and break details       

  Roster Management       Assigns workdays,       Manual + Excel upload
                          weekly offs and shifts  
                          by date                 

  Holiday Calendar        Defines public/company  Manual + Excel upload
                          holidays and            
                          applicability           

  Site Management         Defines employee work   Manual
                          locations and timezone  

  Leave Management        Supplies approved leave Existing Leave module
  integration             and leave portions to   integration
                          attendance              

  Attendance              Captures punches,       Manual, device/API and
                          calculates daily        system processing
                          attendance and supports 
                          corrections/approval    

  Attendance Policy       Defines attendance      Country/company
                          treatment such as       configuration
                          grace, late, short      
                          hours, half-day and     
                          overtime                
  -----------------------------------------------------------------------

### 3.2 Initial working-hour models

**Fixed Working Hours**

An employee follows a defined start and end time. Example: 09:00 AM to
06:00 PM, with a 60-minute unpaid break and 8 required working hours.

**Flexible Working Hours**

An employee can start within an allowed time window, provided the
required working hours are completed. Example: earliest start 07:00 AM,
latest start 10:00 AM and 8 required working hours.

Do not introduce weekly-hours-only schedules or core-hours schedules in
the initial scope unless the business confirms that they are required.

## 4. Keep the concepts separate

These concepts are related but must not be combined into one table or
one setting.

  -----------------------------------------------------------------------
  Concept                 What it answers         Example
  ----------------------- ----------------------- -----------------------
  Work Schedule           How many hours must the Fixed 09:00--18:00;
                          employee work, and what Flexible start
                          start-time model        07:00--10:00
                          applies?                

  Shift                   Which operational time  General, Morning or
                          period is assigned?     Night shift

  Roster                  What is the employee    Monday: General shift;
                          expected to work on a   Tuesday: weekly off
                          particular date?        

  Holiday Calendar        Is the date a public or UAE National Day
                          company holiday for     
                          this employee/site?     

  Site                    Where is the employee   Dubai Office
                          assigned, and which     
                          timezone/location       
                          settings apply?         

  Leave                   Is approved leave       Annual leave, unpaid
                          applicable for the date leave, half-day leave
                          or part of the date?    

  Attendance Policy       How should attendance   Grace period, late,
                          results be classified   short hours, half-day,
                          and treated?            overtime
  -----------------------------------------------------------------------

**Important:** A fixed work schedule does not necessarily mean the
employee has the same shift every day. A roster may assign different
shifts by date. A flexible work schedule may not need a fixed shift
start time.

## 5. Master/configuration modules

Recommended navigation under **Master Setup**:

``` text
Master Setup
├── Site Management
├── Shift Management
├── Work Schedule
│   ├── Fixed Working Hours
│   └── Flexible Working Hours
├── Roster Management
└── Holiday Calendar
```

Leave Management remains its own module and integrates with Attendance.

### 5.1 Site Management

Maintain: - Site name and code - Country and address - Timezone -
Active/inactive status - Optional site-specific calendar or
attendance-policy association

A site is a work-location master. Do not assume that a site's country
alone determines every employee's attendance policy; policy assignment
should be explicit and effective-dated.

### 5.2 Shift Management

Maintain: - Shift name and code - Start time and end time - Break
configuration - Cross-midnight indicator or equivalent handling - Active
status

A shift can be assigned to a date through the roster. Define how
overnight shifts are attributed to an attendance work date.

### 5.3 Work Schedule

Maintain reusable schedule definitions. The employee should be assigned
a Work Schedule record; do not store only an `IsFlexible` Boolean on the
employee.

Suggested fields:

  Field                  Purpose
  ---------------------- ---------------------------------------
  Id                     Primary key
  OrganizationId         Owning organization
  Name / Code            Schedule identity
  ScheduleType           `FIXED` or `FLEXIBLE`
  StartTime              Fixed start time
  EndTime                Fixed end time
  EarliestStartTime      Flexible earliest permitted start
  LatestStartTime        Flexible latest permitted start
  RequiredDailyMinutes   Required working minutes
  BreakDurationMinutes   Default break duration, if applicable
  IsActive               Availability for assignment

Use only the fields relevant to the selected schedule type. Consider
schedule-day details if requirements vary by weekday.

### 5.4 Roster Management

Roster supports both: - Manual entry/editing through the UI - Excel
template download and bulk upload

A roster entry should identify the employee, work date,
working/non-working status and assigned shift where applicable. It
should also support weekly offs and roster patterns.

Upload workflow: 1. Download the standard template. 2. Upload the
completed file. 3. Parse and validate rows. 4. Show a preview before
saving. 5. Detect duplicates and conflicting assignments. 6. Allow valid
rows to be imported according to the agreed partial/all-or-nothing
policy. 7. Provide row-level errors and an import summary. 8. Store
import history and who performed the import.

### 5.5 Holiday Calendar

Holiday Calendar supports: - Manual entry/editing - Excel template
download and bulk upload - Calendar year and country/site
applicability - Public holidays and company-specific holidays -
Duplicate-date validation - Import preview, row-level errors and import
history

Do not automatically apply every country holiday to every employee.
Define how calendars are assigned to organizations, sites or employees,
with effective dates.

## 6. Employee assignments

Configuration records must be linked to employees through assignments
with effective dates.

Recommended assignment concepts:

  -----------------------------------------------------------------------
  Assignment                          Purpose
  ----------------------------------- -----------------------------------
  Employee--Site                      Employee's work location

  Employee--Work Schedule             Fixed/flexible schedule

  Employee--Attendance Policy         Applicable attendance rules

  Employee--Holiday Calendar          Applicable holiday calendar, if not
                                      inherited from site/org

  Employee--Roster                    Date-specific work pattern or
                                      roster entries

  Roster--Shift                       Shift assigned for a particular
                                      roster date
  -----------------------------------------------------------------------

Where the organization requires inheritance, define and document a
resolution order. For example, a holiday calendar may be inherited from
the site and overridden by an explicit employee assignment. Avoid
silently choosing precedence rules.

All assignments that affect historical attendance should have
`EffectiveFrom` and `EffectiveTo` dates. Prevent overlapping active
assignments where the business rule requires a single applicable
assignment.

## 7. Attendance data model -- conceptual

The following is a starting point for database design, not final Prisma
schema.

### 7.1 Core entities

  -------------------------------------------------------------------------
  Entity                                Purpose
  ------------------------------------- -----------------------------------
  `AttendancePolicy`                    Country/company attendance policy
                                        identity and validity

  `AttendancePolicyRule`                Structured rule settings, such as
                                        grace minutes or thresholds

  `AttendancePolicyAssignment`          Assigns a policy to an employee or
                                        supported organizational scope

  `WorkSchedule`                        Fixed/flexible schedule definition

  `WorkScheduleDay`                     Optional weekday-specific hours and
                                        break requirements

  `WorkScheduleAssignment`              Effective-dated employee schedule
                                        assignment

  `Shift`                               Shift definitions

  `Site`                                Work locations and timezone

  `Roster` / `RosterEntry`              Roster header and employee/date
                                        assignments

  `HolidayCalendar` / `Holiday`         Calendar header and holiday dates

  `EmployeeHolidayCalendarAssignment`   Effective-dated calendar
                                        assignment, if needed

  `AttendancePunch`                     Individual IN/OUT punch events

  `AttendanceDaily`                     Daily attendance summary/result

  `AttendanceAdjustment`                Manual correction and reason

  `AttendanceApproval`                  Approval workflow/history

  `AttendanceImport` /                  Upload tracking and row-level
  `AttendanceImportRow`                 results
  -------------------------------------------------------------------------

### 7.2 AttendancePunch

Prefer storing individual punch events rather than only one IN and one
OUT column. This supports multiple work sessions and breaks.

Suggested fields: - Id - EmployeeId - PunchDateTime (stored
consistently, preferably UTC) - PunchType (`IN` / `OUT`) - Source
(manual, device, API, import) - SiteId, if known - Device/reference
details, if applicable - CreatedBy and CreatedAt

Example:

  Time    Punch
  ------- -------
  08:30   IN
  12:30   OUT
  13:30   IN
  17:30   OUT

The daily calculation can total the work intervals and apply the
relevant break rules. Define handling for unmatched IN/OUT punches,
duplicate punches and overnight work.

### 7.3 AttendanceDaily

Suggested fields: - Id - EmployeeId - AttendanceDate (the employee's
attendance work date) - SiteId - WorkScheduleId - ShiftId, nullable
where no fixed shift applies - RosterEntryId, if applicable -
AttendancePolicyId - FirstInDateTime - LastOutDateTime - WorkedMinutes -
RequiredMinutes - LateMinutes - ShortMinutes - OvertimeMinutes -
AttendanceStatusCode - ProcessingStatus - IsManuallyAdjusted -
CalculationVersion - CreatedAt / UpdatedAt

Use semantic status codes in the common system, such as `PRESENT`,
`ABSENT`, `LATE`, `SHORT_HOURS`, `HALF_DAY`, `HOLIDAY`, `WEEKLY_OFF`,
`ANNUAL_LEAVE` and `UNPAID_LEAVE`. Final status definitions and
combinations need business approval. Country-specific legacy IDs should
be mapped rather than reused as universal meanings.

## 8. Attendance processing flow

For each employee and attendance work date:

1.  Resolve the employee's effective site and timezone.
2.  Resolve the applicable roster entry.
3.  Determine whether the date is a working day, weekly off or rostered
    non-working day.
4.  Resolve the applicable holiday calendar and check for a holiday.
5.  Retrieve approved leave and determine full-day or partial-day
    coverage.
6.  Resolve the assigned shift, if the roster requires one.
7.  Resolve the employee's fixed/flexible Work Schedule.
8.  Retrieve and validate punch events.
9.  Calculate worked minutes from valid IN/OUT intervals.
10. Resolve the effective Attendance Policy.
11. Apply policy rules to calculate late, short hours, half-day,
    overtime and final status.
12. Save the daily result, calculation inputs/version and audit details.

The exact precedence when a holiday, rostered workday, approved leave
and punches overlap must be explicitly defined. Do not assume one
universal precedence without business confirmation.

**Important:** Do not mark an employee absent merely because no punch
exists. First establish that the employee was expected to work on that
date and check holiday, weekly-off, roster and approved-leave
information.

## 9. Fixed and flexible attendance evaluation

### Fixed schedule

-   Compare the first valid IN punch with the scheduled start, subject
    to policy grace rules.
-   Calculate working intervals and total worked minutes.
-   Compare worked minutes with required minutes.
-   Calculate overtime only under the applicable policy and approval
    rules.

### Flexible schedule

-   Validate the first valid IN punch against the allowed start window.
-   Calculate total worked minutes.
-   Compare total worked minutes with required minutes.
-   Do not classify an employee as late merely because they did not
    arrive at a fixed shift start that does not apply to their schedule.
-   Apply any configured rule for starting outside the allowed window.

A completed daily-hours requirement does not automatically mean there
can never be a policy violation. For example, an employee may start
outside the permitted window but still complete the required hours. The
business must decide how that case is classified.

## 10. Country-specific attendance policies

Use a common Attendance Service with country policy strategies. Do not
create separate full attendance engines or duplicate common attendance
tables for India and UAE.

Suggested NestJS structure:

``` text
src/attendance/
├── attendance.module.ts
├── attendance.controller.ts
├── attendance.service.ts
├── attendance.repository.ts
├── dto/
├── policies/
│   ├── attendance-policy.interface.ts
│   ├── attendance-policy.factory.ts
│   ├── india/
│   │   └── india-attendance.policy.ts
│   └── uae/
│       └── uae-attendance.policy.ts
├── rules/
│   ├── timestamp.rule.ts
│   ├── late.rule.ts
│   ├── short-hours.rule.ts
│   ├── half-day.rule.ts
│   ├── overtime.rule.ts
│   └── validation.rule.ts
└── calculations/
    ├── punch-calculator.service.ts
    └── daily-attendance.service.ts
```

Common service responsibilities: - Load effective employee
configuration. - Resolve schedule, roster, shift, site, holiday and
leave inputs. - Select the applicable policy. - Orchestrate calculations
and validations. - Persist results in a Prisma transaction. - Maintain
audit history and calculation version.

Country policy responsibilities: - Country-specific timestamp
interpretation and restrictions. - Country-specific attendance
classifications and exceptions. - Country-specific Ramadan or other
legally/company-required handling, where applicable. - Country-specific
mapping between legacy statuses and common semantic statuses.

Keep policy settings such as grace minutes and thresholds in database
configuration where they are genuinely configurable. Keep executable
logic in tested NestJS code.

### Existing legacy context to preserve during migration

The existing UAE implementation uses `AddUpdateMuster` and the India
implementation uses `AddUpdateAttendance`. They have different status
parameter types and some different business rules. Examples identified
during the earlier review include UAE Ramadan handling and an 11 AM
self-marking restriction, while the reviewed India procedure does not
contain those same rules.

Treat these as migration discovery points, not as a complete or legally
verified country-rule specification. Before implementation, document and
obtain business approval for every existing rule, exception, status
mapping and timestamp behavior.

## 11. API planning

Possible API groups (final routes and payloads to be designed with the
schema):

``` text
/master/sites
/master/shifts
/master/work-schedules
/master/rosters
/master/rosters/import
/master/holiday-calendars
/master/holiday-calendars/import

/attendance/punches
/attendance/daily
/attendance/process
/attendance/regularizations
/attendance/approvals
/attendance/reports
```

Use authorization checks for organization, site and employee scope.
Validate effective dates, duplicate assignments and conflicting roster
entries at the API/service layer and enforce appropriate database
constraints as well.

## 12. Frontend planning

Recommended screens:

### Master Setup

-   Site list, create/edit and timezone configuration
-   Shift list and shift form
-   Work Schedule list and form
-   Roster calendar, manual assignment and upload wizard
-   Holiday Calendar list/calendar, manual entry and upload wizard

### Attendance

-   Daily attendance view with employee/date filters
-   Employee attendance detail and punch timeline
-   Missing or unmatched punch exception list
-   Attendance regularization form
-   Approval queue
-   Processing/reprocessing history
-   Attendance reports and export

### Upload experience

For both Roster and Holiday Calendar: - Template download - File
selection - Validation/preview - Confirm import - Import result with
successful, rejected and duplicate rows - Downloadable error report

## 13. Validation and edge cases

Plan tests for:

-   Fixed and flexible schedules
-   Different required hours by weekday
-   Break handling and multiple punch intervals
-   Missing IN or OUT punch
-   Duplicate or out-of-order punches
-   Overnight shifts and attendance-date attribution
-   Site timezone and daylight-saving changes where relevant
-   Employee transfer between sites
-   Schedule, shift, roster or policy changes effective mid-period
-   Holiday on a rostered working day
-   Leave on a holiday or weekly off
-   Half-day and partial-day leave
-   Work performed on a holiday or weekly off
-   Manual corrections and approval/rejection
-   Reprocessing after configuration changes
-   Duplicate and conflicting upload rows
-   Country policy differences between India and UAE

## 14. Security, audit and reliability

-   Restrict master setup and policy administration to authorized roles.
-   Keep upload files/import summaries and row-level errors for audit.
-   Record who created, changed, approved or imported each relevant
    record.
-   Preserve original punch events; corrections should be traceable
    rather than silently overwriting source events.
-   Use transactions for daily processing and import commits.
-   Make processing idempotent for the same employee/date/configuration
    version.
-   Record the policy/configuration version used for each calculation.
-   Define locking/reopening rules for attendance periods before payroll
    integration.

## 15. Suggested implementation phases

  -----------------------------------------------------------------------
  Phase                               Deliverable
  ----------------------------------- -----------------------------------
  1\. Rule discovery                  Document India/UAE legacy rules,
                                      statuses, exceptions and expected
                                      outputs

  2\. Domain and schema               Finalize relationships, effective
                                      dates, constraints and Prisma
                                      models

  3\. Master setup                    Sites, shifts, work schedules,
                                      holiday calendars and roster

  4\. Assignments                     Employee assignments and
                                      effective-date resolution

  5\. Punch capture                   Manual/device/API punch ingestion
                                      and validation

  6\. Calculation engine              Common calculations plus India and
                                      UAE policy strategies

  7\. Attendance UI                   Daily view, exceptions,
                                      regularization and approvals

  8\. Upload workflows                Roster and holiday Excel import
                                      with validation and audit

  9\. Payroll integration             Approved attendance results and
                                      period locking

  10\. Migration and UAT              Compare old and new outputs for
                                      representative employees/dates
  -----------------------------------------------------------------------

## 16. Decisions still requiring confirmation

1.  Can a flexible employee have a roster-assigned shift, or should
    flexible schedules always operate without fixed shift timings?
2.  Are required hours and break durations configurable per weekday?
3.  Can an employee be assigned different sites, schedules or policies
    during the same payroll period?
4.  What is the precedence when rostered work, public holiday, approved
    leave and actual punches overlap?
5.  Does a flexible employee who starts outside the allowed window but
    completes required hours count as late, a policy violation or
    present?
6.  Should roster and holiday imports reject the entire file on any
    invalid row, or import valid rows and report invalid ones?
7.  What are the rules for overnight shifts and cross-midnight punches?
8.  Which existing India/UAE attendance rules must be preserved exactly,
    and which can be redesigned?

## 17. Recommended next design deliverable

Before writing Prisma models or implementation code, prepare a detailed
database schema and relationship diagram covering:

-   Organization, country, site and employee
-   Work Schedule and effective-dated assignment
-   Shift and roster entries
-   Holiday Calendar and assignments
-   Attendance Policy, rules and assignments
-   Attendance Punch and Attendance Daily
-   Leave integration
-   Regularization, approval and audit history

Then validate the schema against representative India and UAE scenarios
and compare the calculated results with the existing HRMS.
