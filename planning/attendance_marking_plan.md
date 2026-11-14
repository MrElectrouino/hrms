# Attendance marking: what the two procedures do, and what is still missing

Sources read in full: `planning/discovery/procs/AddUpdateMuster.sql` (UAE), `planning/discovery/procs/India/AddUpdateAttendance.sql` (India), and the ChatGPT export `Plan Attendance Procedures.md`.

## 1. What I built so far (admin setup only)

| Done | Notes |
|---|---|
| Work schedules (fixed / flexible, optional start window, automatic break deduction) | Setup only; nothing reads them yet |
| Holiday calendars (company / country / branch), Excel import, configurable order | Setup only |
| Roster patterns, single-day entries, Excel import | Setup only |
| Employee assignments (work schedule, roster pattern, holiday calendar), month preview | Setup only |

None of this marks attendance. There is no attendance record, no punch, no status and no late or half-day rule in the new system yet.

## 2. What the stored procedures do (shared behaviour)

Both procedures are the single entry point for **every** way attendance gets written. One row per employee per date (`MERGE` on date + employee).

**Four scenarios**

1. **Self IN** (employee presses IN, record id 0/null): IN time = current UTC time. The shift is looked up. Late / half-day is evaluated if the date is today.
2. **Self OUT** (second press, existing record id): OUT time = current UTC time. Rejected if OUT is before IN.
3. **Manager / HR edit** (`ApprovedBy` set): the app sends IN and OUT in local time; they are converted to UTC with the employee's timezone offset. Late / half-day is re-evaluated from the edited IN time. `ApprovedBy`, `ApprovedOn` are stamped.
4. **Past-day marking** (employee forgot a day): the late / half-day check is skipped, because it only runs when the date is today or an approver is set.

**Late / half-day rule** (minutes between local IN and shift start):
- IN on time or early: nothing.
- Later than start by up to `LateMinutes` (grace): nothing.
- Later by more than `LateMinutes` up to `HalfDayMinutes`: status becomes **Late**.
- Later by more than `HalfDayMinutes`: status becomes **Half-day**.
- Skipped when the record already has a leave-like status (so Annual Leave, Sick Leave, Day Off and similar are never downgraded).

**Special statuses** (comp off availed, ids 88 / 90): `IsPresent = 0`, IN and OUT are cleared.

**Other shared behaviour**
- IN and OUT each keep IP, coordinates and address.
- Audit columns: MarkedBy, MarkedDateTime, ApprovedBy, ApprovedOn, ModifiedBy, ModifiedOn.
- Remarks are auto-written: "Updated by <name> on dd-mm-yyyy" for an approver, "Marked on dd-mm-yyyy" for a self-mark.
- Mood: one mood entry per employee per day, written when they press IN (used for well-being reporting).
- Everything runs in one transaction. Result codes: saved, "OUT before IN" (43 in UAE, 4 in India), and in UAE "not allowed" (44). Any exception is logged and a generic "Failed to Register" is raised.
- Timestamps are stored in UTC.

## 3. India vs UAE: genuine differences

| Rule | India (`AddUpdateAttendance`) | UAE (`AddUpdateMuster`) |
|---|---|---|
| Shift source | A per-date view (`vUserShift`): the shift can change by day (roster), with timezone offset and shift start already resolved | The employee's single assigned shift plus the location's timezone |
| Ramadan | none | Alternate shift start (`AltStartTime`) between the Ramadan dates in configuration 24 |
| Late / half-day exclusion list | statuses 80, 88, 89, 90, 261 | statuses 177, 180, 181, 182, 185 |
| Self-marking time limit | none | A self-mark for today after **11:00 AM** server time is refused (message 44); HR is exempt |
| Past-day self-marking | allowed (no late rule) | **refused** unless the actor is HR (see quirks) |
| Who may edit | any approver | only HR (department 6, active) passes; any other approver or past date is refused |
| Mood id | stored as sent | mapped through parameter type 41 |
| IN location on a later update | overwritten | preserved (original IN IP / coordinates / address kept) |
| Status ids | parameter type 11 | parameter type 40 |

## 4. Things in the procedures that look like quirks (please confirm)

1. UAE header says past-day self-marking is supported, but the code refuses it for everyone except HR. Which is intended?
2. UAE: a manager who is not in the HR department cannot edit at all (any approver that is not HR falls into the "refuse" branch). Intended?
3. India sets `MarkedDateTime` to server time **plus 90 minutes**. Looks like a timezone workaround, not a rule.
4. Both procedures compare the status against the literal numbers 88 / 90 after the status has already been converted to a parameter id; this only works if those ids happen to match.
5. India overwrites the IN IP/coordinates on update, UAE keeps the first. Probably accidental in India.

## 5. What the ChatGPT discussion decided (the target design)

- One generic attendance engine: a common service plus **policy strategies** per country (India, UAE, more later). No `if (country === ...)` in the common service.
- Rules that only change a value (late minutes, half-day minutes, cutoff time, past-date marking allowed, Ramadan on/off, mood on/off) are **configuration**; rules that change the processing (how timestamps are built, shift resolution, validation) are **code** in the country strategy.
- `AttendancePolicy`, rules, and **policy assignment** with effective dates (employee, then department, then branch, then organization default). Record which policy and version produced a day's result.
- **Semantic status codes** (PRESENT, ABSENT, LATE, HALF_DAY, ANNUAL_LEAVE, SICK_LEAVE, DAY_OFF, COMP_OFF) with a country mapping to the legacy ids. Never spread numeric ids through the code.
- One `Attendance` table for all countries, UTC timestamps, the employee's timezone kept for display.
- **Punches**: store every IN/OUT event, then derive the day. Needed for flexible hours and split days.
- Daily calculation order: employee configuration, roster, holiday and leave, shift and work schedule, punches, then the policy engine. **Never mark absent until we know the person was expected to work.**
- Fixed hours: late is measured against the scheduled start. Flexible hours: worked minutes (net of break) against required minutes; no fixed-start late rule.
- Also in scope: regularization, approval, reports, a Ramadan calendar, leave integration (including sandwich leave and `IsSandwichEligible` on leave types), a System Admin "Attendance Configuration" screen, and testing by running the same scenarios through the old procedures and the new code.

## 6. What is missing (the honest list)

**Core marking**
- Attendance record, punch table, mood log
- Self IN / OUT (button, mood, IP, coordinates, address), "today" state
- Manager / HR edit, approval, regularization, past-day marking
- Auto remarks and audit columns
- Result and error messages for each refusal

**Rules engine**
- Policy strategies (India, UAE) and the common service
- Late / half-day evaluation, leave-like exclusions, special statuses
- UAE 11 AM limit and HR exemption, Ramadan calendar
- Flexible-hours and short-hours calculation, break deduction applied to real punches, overtime

**Configuration**
- Attendance policy, rules, assignments (with effective dates)
- Semantic status list and legacy id mapping
- Timezone source (nothing in the new system has a timezone for a branch yet; the Country table has a default)
- System Admin "Attendance Configuration" screen

**Daily processing and integration**
- Daily job that builds each day's result from roster, holiday, leave and punches, including absent detection
- Leave module (types, balances, applications, sandwich leave), because the day status needs approved leave
- Reports, and the side-by-side test against both procedures

## 7. Decisions I need from you

1. **Late / half-day thresholds**: they sit on the **Shift** (as in the procedures, `LateMinutes`, `HalfDayMinutes`, `AltStartTime`), and that master already exists. The chat put them in the policy. My suggestion: keep them on Shift, and let the policy hold the on/off switches and the country rules.
2. **Quirks in section 4**: which behaviour do you want for UAE past-day marking and for non-HR managers?
3. **Timezone**: use IANA timezones (not fixed offsets, so daylight saving is right). Default from the Country table, optional override per branch. OK?
4. **Location capture**: do you want IP, GPS coordinates and address captured on web and mobile, as today?
5. **Mood**: keep the daily mood on IN?
6. **Statuses**: confirm the semantic list above, and which are "leave-like" (excluded from late / half-day).
7. **Policy assignment order**: employee, then branch, then country default. (The chat also listed department; do you want department?)

## 8. Proposed order of work

1. Data model and engine: attendance, punches, statuses, policy, Ramadan, timezone. Port both procedures as tests first (every scenario in section 2 and the differences in section 3), then the code.
2. Marking API and screens: self IN/OUT, today state, manager/HR edit, my attendance calendar.
3. Attendance Configuration screen (policies, rules, statuses, Ramadan).
4. Daily processing: expected-to-work, holiday, weekly off, flexible hours, short hours, overtime, absent detection.
5. Approval, regularization, reports.
6. Leave module and its integration.

---

## 9. Decisions made (answers to section 7)

| # | Decision |
|---|---|
| Menu | The setup screens live under **Administration → Attendance setup** (tabs: Work schedules, Holiday calendars, Roster, Assignments). "Time & Attendance" is kept for marking attendance, which comes next. |
| Past-day marking | **Not allowed** for self-marking (UAE behaviour). Kept as a policy switch, so a country can allow it later. |
| Who can edit | A manager can edit only attendance that is **not yet approved**. Once approved it is locked for managers. HR can still correct any record (as in the UAE procedure). |
| India +90 minutes | **Dropped.** It was a timezone workaround; proper timezones replace it. |
| Late / half-day minutes | Stay on the **Shift** (LateMinutes, HalfDayMinutes, AltStartTime for Ramadan), as in the procedures. |
| Timezone | Proper IANA timezones. Country default (Country table already has one), optional override per branch. |
| Mood | **Kept**: one entry per employee per day, taken when they press IN. Options (UAE type 41): Happy, Sad, OK, None. |
| Location | **IP, GPS coordinates and address on web and mobile.** The server records the IP from the request (never trusted from the client); the app sends coordinates and the address text. The browser asks for location permission, and needs HTTPS. |
| Policy order | Employee, then branch, then country default. **No department.** |

## 10. Status list (from the UAE export, `system_parameters.csv`, type 40 "Muster Status")

| Legacy id | Legacy name | Proposed code | Notes |
|---|---|---|---|
| 179 | Present | PRESENT | |
| 177 | Absent | ABSENT | skips the late rule |
| 184 | Late | LATE | set by the late rule |
| 185 | Half Day | HALF_DAY | set by the half-day rule; skips the late rule |
| 178 | Not Approved | NOT_APPROVED | waiting for a manager; the only status a manager can edit |
| 181 | Not Found Present | NOT_FOUND_PRESENT | skips the late rule. Meaning to be confirmed |
| 180 | Holiday | HOLIDAY | hidden in UAE; skips the late rule |
| 182 | Worked on Holiday | WORKED_ON_HOLIDAY | skips the late rule |
| 186 | Weekly Off | WEEKLY_OFF | hidden in UAE |
| 183 | Comp off Availed | COMP_OFF_AVAILED | clears IN and OUT, not present. Hidden in UAE |

"Skips the late rule" is the UAE exclusion list (177, 180, 181, 182, 185). These are attendance statuses, not leave types, so my earlier description of them as "leave-like" was wrong.

**Finding:** the "special status" block in the UAE procedure tests for ids 88 and 90. In the UAE database those ids are comp-off *request* statuses (Rejected, Canceled), so that block never fires; the real "Comp off Availed" id is 183. The code was copied from India. The new design applies the rule to COMP_OFF_AVAILED, which is what it was meant to do.

**Additions needed for the generic app:** ON_LEAVE (paid or unpaid, from the leave type), SHORT_HOURS (flexible schedules), and a worked-on-weekly-off status (needed for comp off).

**Still open:** the meaning of "Not Found Present", and India's own status list (type 11 in the India database was not in the export, so India's ids 80, 88, 89, 90, 261 cannot be named yet).

## 11. Further decisions

- **One status list for every country.** The generic application uses the same semantic statuses everywhere. The per-country legacy ids are only a mapping used when migrating old data and when comparing results with the old procedures; they never appear in application code or configuration.
- **Added statuses:** ON_LEAVE (from the leave type, paid or unpaid), SHORT_HOURS (flexible schedules), WORKED_ON_WEEKLY_OFF (so comp off can be earned on a weekly off).
- **NOT_FOUND_PRESENT** means someone marked the employee present but they were not actually there. A manager or HR sets it. It is treated like ABSENT (counts as absent, skips the late rule).

## 12. Proposed folder structure (from the ChatGPT design, adjusted to this project)

```text
src/attendance/
  attendance.module.ts
  attendance.controller.ts        # IN/OUT, today's state, edit, approve
  attendance.service.ts           # common flow: load, policy, save, audit (no country if-statements)
  dto/
    mark-attendance.dto.ts
    update-attendance.dto.ts
  policies/
    attendance-policy.interface.ts
    attendance-policy.factory.ts  # picks the strategy by the policy's code
    india/india-attendance.policy.ts
    uae/uae-attendance.policy.ts
  rules/                          # small pure functions, unit tested
    late.rule.ts
    half-day.rule.ts
    timestamp.rule.ts
    validation.rule.ts
  calculations/
    punch-calculator.service.ts   # worked minutes from punches, break deduction
    daily-attendance.service.ts   # builds a day from roster, holiday, leave and punches
src/attendance-setup/             # already built: schedules, holiday calendars, roster, assignments
```

Differences from the chat's layout: no `attendance.repository.ts`, because this project's convention (AGENTS.md) is controller, service, Prisma, with no separate repository layer; the attendance setup stays in its own module.

## 13. What System Settings must hold (administrator configuration, never logic)

**Attendance (System Settings > Attendance configuration, System Admin only)** — API built, screen still to build
- Attendance policies per country, branch or employee (employee, then branch, then country): late rule on/off, half-day rule on/off, past-day self-marking allowed, late rules on past days, self-mark time limit (blank = none), HR exempt from the limit, manager edits only unapproved days, approval required, Ramadan start time.
- Ramadan periods per country.
- Timezone: Country default (Countries page) and an optional override per branch.
- Mood on or off. Location capture: GPS and address each OFF, OPTIONAL or REQUIRED. (IP is always recorded by the server.)
- Status list: name, colour and on/off. What a status does (skips the late rule, clears punches) is fixed in the application.
- Holiday calendar order (built, under Attendance setup).

**Still to design with the Leave module**
- Sandwich leave on/off for the organization, and `IsSandwichEligible` on each leave type; weekly-off, holiday and both-sides rules; statutory overrides.
- Comp off: credit method (fixed or variable), default credit (1 day), minimum, maximum, increment, weekly-off and holiday eligibility, minimum hours worked, expiry method, maximum balance, approval, reversal.
- Leave year (April to March), carry-forward and expiry, accrual methods, service slabs, probation to payroll transition.
- Leave approval levels, document rules, balance reservation (on submit or on approval), negative balance, calendar colours.

## 14. Build status

Built and tested: statuses, policies and assignments, Ramadan periods, branch timezones, settings, the rules (late and half-day, time limit, edit rights, status of a day, punches, timezones), marking (IN, OUT, today, past day when allowed), manager and HR edit and approval, listing. Verified against the local database with a controlled clock for UAE and India scenarios.

Not built yet: the screens (Mark attendance, My attendance, Team attendance, Attendance configuration), the daily job that fills days nobody marked (absent, holiday, weekly off, leave), flexible-hours and short-hours calculation from punches, overtime, regularization requests, reports, the leave module.

Deliberate improvements over the procedures: the self-mark time limit applies only to the first IN of the day (ending the day is always allowed); every IN and OUT is kept as a punch so split days work; the policy version used is stored on each day.

## 15. Second build slice: daily job, hours, corrections, reports, leave

Built and verified against the local database (scripted run with real data, then removed):
- **Daily job** (nightly at 02:00 and "Run now" under Attendance configuration): holiday, weekly off, approved leave and absent for days nobody marked; worked time, short hours and overtime for days with punches. Idempotent; never overwrites an approved day. Nothing is guessed when there is no roster.
- **Hours:** automatic break deduction, short hours (with grace), overtime (with threshold), flexible schedules judged on a start window only. A day worked on a holiday or weekly off has no requirement.
- **Corrections (regularization):** employee requests, manager or HR approves; applying goes through the same rules and audit as an edit.
- **Reports:** summary per employee, late, short hours, overtime, missing punch, absent, pending approval; CSV download.
- **Leave:** types (with sandwich eligibility), organization settings (sandwich on/off, weekly offs, holidays, both sides, leave year start, comp off), balance buckets with expiry and earliest-expiring-first use, apply with a live day count, manager or HR approval (days counted again at approval), cancellation with the days returned, ledger, HR adjustments, annual and monthly accrual (safe to run twice), expiry, comp off earned from approved days worked on a holiday or weekly off, leave calendar, and approved leave showing on attendance.

Known limits (not built):
- No proration of entitlement for joiners, no service-based slabs, no probation-to-payroll transition, no carry-forward or encashment, no statutory per-country entitlement values.
- Leave documents are a reminder only; there is no file upload on a leave request.
- Comp off is credited when the day is approved; reversing a credit when an approval is undone is not automatic.
- Half-day leave with no punches marks the day ON_LEAVE.
- Leave is not yet connected to payroll (there is no payroll module).
- Approved leave is not automatically reflected for days the daily job already marked approved by a person.
