# Leave Entitlement and Leave Policy: Business Requirements

Status: **draft for business confirmation. No schema or code is proposed here.**
Scope: entitlement, accrual, probation, year-end treatment, exit settlement and edge cases for the generic multi-country HRMS.

## 0. Starting point (what already exists)

The leave module built so far already provides:

- Leave types with sandwich eligibility, half-day and per-request limits.
- Balance buckets ("credits") with optional expiry, used earliest-expiry first.
- A ledger of every movement (credit, used, returned, expired, adjustment).
- Accrual that is either annual or monthly, safe to run twice (no duplicate credit).
- Daily expiry job, comp-off credits, manual HR adjustment with a reason.
- A leave-year start month in global settings.

What is **not** there yet, and is the subject of this document: policy scoping (country, entity, category), effective dating, proration, service slabs, probation rules, carry-forward, lapse, encashment, exit settlement, leave requests across two leave years, and policy-change handling.

## 1. Guiding principles

1. **No country rule lives in code.** Every number and switch below is data, edited by an admin.
2. **Statutory and company benefit are separate layers.** A statutory floor (what the law requires) is configured apart from the company benefit. The employee gets the higher of the two where the law says so, and both are visible on the balance.
3. **Everything is effective-dated.** A policy is never edited in place once used. A change creates a new version with a start date, and every balance movement records the policy version that produced it.
4. **Five concerns stay separate:** entitlement (what you are owed), accrual (when it is credited), balance transactions (the ledger), encashment (cash conversion decision) and payroll (the money). Leave never calculates pay. It hands payroll a quantity of days and the basis used.
5. **The ledger is the truth.** Balances are always the sum of ledger rows. Any correction is a new row, never an edit.

## 2. Entitlement per leave type

### 2.1 What an admin configures per leave type, per policy

| Setting | Options |
|---|---|
| Balance tracking | Tracked, or **unlimited / no balance** (for example unpaid leave, or leave approved case by case) |
| Annual quantity | Any decimal (1.5, 2.5) |
| Credit method | **Upfront** (full year on day 1 of the leave year), **Monthly** (quantity ÷ 12 each month), **Daily** (quantity ÷ days in year, credited nightly), **Custom schedule** (admin lists credit dates and amounts, for example 10 in January and 5 in July), **Event based** (comp-off, or granted by HR) |
| Credit timing within the period | Start of period or end of period (monthly credit on the 1st or on the last day) |
| Entitlement source | Fixed quantity, or **service slab** (section 4) |
| Unit | Days (hours is a later extension) |
| Negative balance | Not allowed / allowed up to N days / allowed unlimited |
| Eligible employees | Rule set (section 2.2) |

Recommended defaults: tracked, upfront for statutory types that the law grants as a lump sum, monthly for company types, negative balance not allowed.

### 2.2 Who a policy applies to

A policy is attached to a **scope**. Scope fields, all optional and combinable:

- Country, legal entity, branch
- Employment type (permanent, contract, temporary, intern)
- Employee category / grade
- Department
- Gender (for example maternity leave) and other eligibility conditions such as religion-based or one-time leave (pilgrimage)

**Precedence** when several policies match: the most specific wins (employee override, then entity + category + grade, then entity + category, then entity, then country, then global default). Exactly one policy version applies to an employee on any given date. The system must show an admin **"which policy applies to this person on this date and why"**.

Statutory and company entitlements are two separate policies for the same leave type. The employee's effective entitlement is the larger of the two (default), or the sum, configurable per leave type because some jurisdictions treat them differently.

### 2.3 Effective dating

- Each policy version has a start date and an optional end date. No gaps or overlaps inside one scope.
- Changing a quantity next year is a new version starting next leave year.
- Changing it mid-year is allowed but needs a choice (section 8.4): apply from the start date only, or recalculate the year.

## 3. Joining part-way through the leave year

### 3.1 Settings

| Setting | Options |
|---|---|
| Leave year | Calendar year, financial year (any start month, for example April), or **employee anniversary** year |
| Proration method | **None** (full quantity), **Completed months**, **Started months**, **Exact calendar days**, **Company rule** (for example: joined on or before the 15th counts the month in full, otherwise not) |
| Rounding | None, down to whole, up to whole, nearest whole, nearest half, **always up to half**, **always down to half** |
| Rounding tie rule | Midpoints round up (default) or down |
| Rounding applied | On the final entitlement (default), or on each monthly credit. The choice must be fixed per policy so results stay consistent |
| Minimum / maximum | Optional floor and cap after rounding |

### 3.2 Worked examples (annual entitlement 24 days)

**Calendar year, joins 1 July.**

- Completed months: July to December = 6 → 24 × 6 / 12 = **12.00**
- Started months: 6 → **12.00**
- Exact days: 184 days of 365 → 24 × 184 / 365 = **12.10**

**Calendar year, joins 16 July.**

- Completed months (full months after joining): August to December = 5 → **10.00**
- Started months (July counts): 6 → **12.00**
- Exact days: 169 of 365 → 24 × 169 / 365 = **11.11** (11.08 in a leap year, 366 days)
- Company rule "joined after the 15th loses the month": July does not count → **10.00**

**Rounding of 11.11:** none 11.11 · down 11 · up 12 · nearest 11 · nearest half 11.0 · always up to half 11.5 · always down to half 11.0.

**April to March year, joins 1 July.** Remaining months: July to March = 9 → 24 × 9 / 12 = **18.00**.

**Anniversary year.** Joins 16 July: the first leave year runs 16 July to 15 July. Full quantity, no proration. This is the only case where "joining part-way" does not arise.

### 3.3 Edge cases

- Joining on the last day of the year or month: result may be 0 under completed-months. A minimum entitlement setting handles this.
- Leap years: the exact-days method uses the real number of days in that year.
- Monthly credit with rounding: rounding each month can drift from the annual figure. Recommended: credit the exact monthly amount, round the running total, and make the final month absorb any difference.
- Date of joining changed after balances were credited: the system recalculates and posts a correcting ledger entry, never silently edits.
- Backdated joining (data entered late): accrual catches up for the missed months in one run, clearly labelled as catch-up.

## 4. Length of service

### 4.1 Settings

| Setting | Options |
|---|---|
| Slabs | Any number of rows: service from (months), service to (months, open ended allowed), annual quantity |
| Service start date | Original joining date, **payroll effective date**, group joining date (for transfers), or a manually set "service start override" |
| Milestone unit | Months or years |
| When a new slab applies | **Immediately on the milestone date**, **from the next leave year**, **from the next accrual period** |
| Mid-year proration across slabs | **Split** the year at the milestone (each part prorated at its own slab), **step** (new rate applies only to future credits, nothing back-dated), or **none** |
| Per leave type | Each leave type has its own slabs. Many types have none |
| Break in service | Whether time before a gap counts toward service (section 8.7) |

### 4.2 Example (calendar year, slabs 21 days under 5 years, 30 days from 5 years)

Employee joined 1 March 2021, so the 5-year milestone is 1 March 2026.

- **From next leave year:** 2026 stays 21, 2027 is 30.
- **Immediately, split:** January to February at 21 → 21 × 2/12 = 3.50; March to December at 30 → 30 × 10/12 = 25.00. Total **28.50**.
- **Immediately, step with monthly credit:** 21/12 = 1.75 for January and February, then 30/12 = 2.50 from March. Total 3.50 + 25.00 = **28.50**. (Same total here; they differ only when the milestone falls mid-month.)
- **Anniversary leave year:** the slab changes exactly on the anniversary. No split needed.

### 4.3 Validation rules

- Slabs for one leave type must not overlap and must cover the whole range of service.
- The milestone date is shown to the employee and HR ("30 days from 1 March 2026").
- A change to the service start date re-evaluates the slab and posts any correction.

## 5. Probation and confirmation

### 5.1 Settings, per leave type and employment type

| Setting | Options |
|---|---|
| May apply during probation | Yes / No / only up to N days |
| Entitlement starts | From joining date, from confirmation date, or after N months of service |
| Accrual during probation | Accrues normally / accrues but locked until confirmation / does not accrue |
| Full entitlement after confirmation | Credited on confirmation (catch-up for the probation months) / continues normally / prorated from confirmation date |
| Leave taken during probation | Deducted from the balance (normal) / deducted from the post-confirmation credit / unpaid conversion beyond what was accrued |
| Treatment of probation-period balance on confirmation | Retained, adjusted (replaced by the confirmed-policy quantity), or recalculated for the whole year |
| Probation extension | Extending the probation date moves the unlock date. Credits already locked stay locked |
| Employment type | Intern, temporary, contract and permanent each have their own policy. Probation rules can differ or be switched off |

### 5.2 Recommended configurations

1. **Statutory-friendly default:** accrues from joining, usable only for types the law allows (sick, emergency, unpaid), full types unlocked at confirmation.
2. **Strict:** no leave of any kind before confirmation except unpaid.
3. **Generous:** full usage from day 1, no probation distinction.

### 5.3 Example

Joins 1 January, 6-month probation, annual leave 24 days, monthly credit, "accrue but locked until confirmation".

- January to June: 2 days credited each month, balance shows 12 but **locked**.
- Confirmed 1 July: lock released, usable 12 days. Credit continues at 2 per month.
- Probation extended by 3 months: the unlock moves to 1 October. The system cancels the scheduled release and reschedules it. Any approved but not yet taken leave in the locked period needs HR review.

### 5.4 Edge cases

- Confirmation backdated: unlock applies from the new date, and any leave applications made earlier are re-validated.
- Probation ends but nobody confirmed the employee: the system reminds HR. It never auto-confirms unless a setting says so.
- Employee converts from contract to permanent: section 8.3.

## 6. Year-end treatment (per leave type)

Run once per leave type, per employee, at the leave-year close (the year may differ per employee under anniversary years). The job is idempotent and fully recorded.

### 6.1 Settings

**Carry forward:** allowed or not; maximum (a fixed number of days, a percentage of the unused balance, or the lower of the two); expiry (a fixed date such as 31 March, or N days / months into the new year); order of use (carried balance first, the default, or current year first).

**Lapse:** the entire unused balance, or only the part above the carry-forward limit. Each lapse is a ledger row "Expired", so the employee can see what was lost.

**Encashment:** allowed or not; maximum days per year; minimum balance that must remain; eligibility (service length, employment type, not on notice); calculation basis (section 6.3); needs approval or automatic; mandatory (the excess is always paid out) or optional (employee elects); payroll month the amount is released in.

### 6.2 Order of operations at year-end (default, configurable)

1. Pay out **mandatory encashment** (up to its maximum).
2. Offer **optional encashment** requests already approved.
3. **Carry forward** up to the limit, creating a new bucket in the new year with its expiry.
4. **Lapse** whatever remains.

Example: unused balance 10 days, carry-forward cap 5, mandatory encashment up to 3. Result: 3 encashed, 5 carried forward, 2 lapse. If encashment were optional and the employee did not elect it: 5 carried forward, 5 lapse.

### 6.3 Encashment calculation

Daily rate = chosen monthly amount ÷ divisor. Basis options: basic salary, gross salary, or a chosen list of salary components. Divisor options: 30, 26, calendar days of the month, working days of the month, or a fixed number from the policy.

Example: basic 3,000 per month, divisor 30 → 100 per day. 12 days encashed → **1,200**. Leave records the **days and the basis**. Payroll multiplies and pays. This keeps the salary figures out of the leave tables.

### 6.4 Validation

- Encashment cannot exceed the available balance, the policy maximum, or leave less than the required minimum balance.
- A day cannot be both encashed and carried forward.
- Carry-forward expiry earlier than the end of the new year must be stated, so employees are warned in the bell notification beforehand (already built for expiring balances).

## 7. End of service settlement

### 7.1 Settings, per exit reason

Exit reasons come from the parameter list: resignation, termination (with cause / without cause), retirement, end of contract, death, absconding, other. Each reason has its own rule row.

| Setting | Options |
|---|---|
| Encash unused leave | Yes / No / only some leave types |
| Quantity basis | **Accrued to last working day** (usual), or full annual entitlement (rare, usually a company decision) |
| Accrual stops | Last working day, notice start, or a configured date |
| Pending applications | Excluded (default; pending requests are cancelled) or reserved days included |
| Approved future leave | Cancelled and returned to balance, or kept if it falls inside notice |
| Negative balance | Recovered from settlement, written off, or recovered only for some exit reasons |
| Carried-forward balance | Included or excluded |
| Comp-off | Paid at its own rate, lapsed, or treated as normal leave |
| Cap | Maximum days payable |
| Basis and divisor | As section 6.3 |

### 7.2 Example

Annual 24 days, monthly credit, calendar year. Exit 30 September. Accrued 9 × 2 = 18. Carried in: 3. Taken: 14. Balance 7. Basic 3,000 and divisor 30 gives a daily rate of 100. Payable **700**. If the balance were minus 2 and recovery is on, **minus 200** goes to the settlement.

### 7.3 Workflow and audit

On exit approval, leave produces a **settlement statement**: opening balance, accrual up to the stop date, usage, adjustments, final days, the basis and divisor, and the policy version. HR reviews, approves, and sends the days to payroll or Full & Final. The statement is stored with the exit record. Reversing a settlement (for example exit withdrawn) is a new ledger entry.

## 8. Other rules and edge cases

### 8.1 Leave year type
Calendar, financial and anniversary are all supported as an attribute of the policy, not a global setting. Reports and balances always show the leave-year dates.

### 8.2 Transfers between countries or legal entities
Default: the balance is **closed in the old entity** (carried, paid or lapsed per exit-like rule) and a new opening balance is created in the new entity under that entity's policy. Alternatively, the balance moves across (service continues). The choice is per transfer type. Service start date is kept for service slabs unless the policy says otherwise.

### 8.3 Change in employment type, grade or salary
A change in employment type or grade switches the policy from the change date. The part-year is handled by the same split logic as service slabs (section 4.2). Salary changes do not affect days. They only affect encashment value.

### 8.4 Policy changes during a leave year
Choose one per change: **prospective** (new rule applies from its start date, nothing back-dated), or **recalculate** (the year's credits are recomputed and a single correcting row is posted). Both are visible in the ledger with the policy version.

### 8.5 Leave crossing two leave years
A request spanning 28 December to 3 January is split by leave year. Each part is checked and deducted from the balance of its own year. The application shows one request, with two calculation blocks. If next year's balance is not yet credited, either allow it as an advance (negative balance rule) or block.

### 8.6 Joining or leaving mid-cycle
Covered in sections 3 and 7. Accrual stops on the configured date. Accrual never runs for an inactive employee.

### 8.7 Rejoining after a break
Settings: treat as **new joiner** (service restarts), **continued service** (service carries on, gap not counted), or **bridged** (gap counts only if shorter than N days). The previous employment's closing settlement stays untouched.

### 8.8 Negative balance
Only if the leave type allows it, up to its limit. It is recorded as a debit with a negative running balance. Next credits repay it first. At exit, section 7 decides recovery.

### 8.9 Reservations
A pending application **reserves** days (shown as "waiting approval"). Reserved days cannot be used twice. A rejection or cancellation releases them. Already implemented.

### 8.10 Cancellation and reversal
Cancelling an approved leave returns days to the **same bucket** if it has not expired, otherwise to a new bucket with the original expiry rule noted (policy choice: reinstate expired days or not).

### 8.11 Duplicate accrual prevention
Every credit carries a unique reference (employee, leave type, period, policy version). Running accrual twice produces zero new rows. A re-run after a policy fix posts only the difference.

### 8.12 Historical corrections and manual adjustments
Done by an HR adjustment row, with a mandatory reason, an optional expiry, and the user who did it. Closed leave years need a higher permission to adjust and the adjustment is flagged "prior period".

### 8.13 Leap years and month lengths
Daily accrual uses the real number of days in the year. Monthly credit is always 1/12 regardless of month length. Exact-days proration uses real days. All formulas state which one they use.

### 8.14 Fractions and rounding
All quantities are stored with two decimals. Rounding rules apply at defined points only (section 3.1), never repeatedly. Displayed balances use the same rounding as stored.

## 9. Recommended policy configuration structure (conceptual)

1. **Leave type** (what exists, for example Annual, Sick): name, paid or unpaid, half-day allowed, documents needed, sandwich eligibility, statutory flag.
2. **Policy** (a named, versioned bundle): scope, effective dates, statutory or company layer, precedence.
3. **Policy rule per leave type**:
   - entitlement: quantity or service slabs, credit method, schedule
   - proration: method, rounding, tie rule
   - probation: usability, unlock rule
   - year-end: carry forward, lapse, encashment
   - exit: rule rows per exit reason
   - negative balance and eligibility
4. **Assignment**: which policy applies to which scope, with precedence and dates (employee-level override allowed).
5. **Entitlement run** (a record per run): who, period, policy version, quantity, rounded result. This is separate from the ledger so calculations can be explained and rerun.
6. **Ledger**: the movements (credit, debit, reversal, expiry, adjustment, encashment hold, settlement).
7. **Encashment request / settlement**: days, basis, divisor, state, payroll reference.

Names are indicative only. Database design starts after section 12 is answered.

## 10. Recommended entitlement calculation workflow

For each employee, leave type and period:

1. Find the policy version(s) that apply in the period (precedence rules, split at any change date).
2. Check eligibility (employment type, probation, gender, minimum service).
3. Determine the annual quantity (fixed, or service slab, split at milestones).
4. Apply proration for the period the employee was employed (joining, exit, break in service, unpaid leave if the policy cuts accrual for it).
5. Apply the credit method (upfront, monthly, daily, custom) and the timing.
6. Apply rounding at the configured point.
7. Combine statutory and company layers (maximum or sum).
8. Write an **entitlement run** record with every input, then post the **ledger** credit using a unique reference.
9. At year end run section 6; at exit run section 7.

Every step must be reproducible from the stored run record.

## 11. Audit and transaction tracking

Each ledger row stores: employee, leave type, date, quantity, bucket, expiry, kind, **policy and version**, entitlement run reference, source (system job, HR, application, settlement), the user, the reason, and a pointer to the reversed row where relevant.

Required history views: balance as of any past date, why a credit was this size (the run record), every policy change with who and when, every manual adjustment, year-end outcome per employee (carried, encashed, lapsed), and the exit settlement statement.

Rules: no row is edited or deleted. A mistake is corrected by a new row. Policy versions already used cannot be deleted.

## 12. Country considerations (indicative only; verify each with local HR or legal advice)

The system must not assume any of these. They show why the rules must be configurable.

- **UAE:** statutory annual leave tied to completed service (a smaller monthly amount in the first year, a fixed annual figure after one year), separate statutory sick, maternity and other leave, and a leave encashment right at end of service.
- **India:** leave rules differ by state and by establishment type; financial-year leave year (April to March) is common; carry-forward and encashment caps are usually company policy, with some statutory minimum days.
- **Saudi Arabia, Qatar and other Gulf countries:** annual leave is longer after a service threshold (about five years), and end-of-service settlement includes unused leave.
- **US and similar:** generally no statutory annual leave. Everything is company policy, with state sick-leave laws as a separate statutory layer.

Do not treat the above as the legal numbers to configure. Confirm with HR for each country.

## 13. Questions that need business confirmation before database design

Please answer for **at least one country first**.

1. Which countries and legal entities go live first? What is each one's leave year (calendar, financial, anniversary)?
2. List every leave type for that country and mark each as statutory, company or both.
3. For each leave type: annual quantity, credit method (upfront, monthly, daily, custom), and whether it is tracked or unlimited.
4. Which employee categories, grades or employment types get different entitlements?
5. Joining part-way: which proration method, which rounding, and which tie rule? Is any minimum entitlement guaranteed?
6. Is there service-based entitlement? If so, the slabs, the service start date to use, and whether slabs apply immediately or from the next leave year. When the milestone falls mid-year, split or step?
7. Probation: length for each employment type, which leave types are usable, whether accrual is locked until confirmation, and how a probation extension affects it.
8. Year-end for each leave type: carry forward (cap and expiry), lapse, encashment (maximum, minimum remaining, mandatory or optional, approval).
9. Encashment pay: basis (basic, gross, components) and divisor (30, 26, calendar days, working days). Does payroll exist in this phase, or does leave only report the days?
10. Exit: for each exit reason, is unused leave paid, on what quantity basis (accrued or full year), and what about negative balances, carried-forward days and comp-off?
11. Does accrual continue during unpaid leave, notice period or long absence (maternity, sick)?
12. Transfers between entities or countries: close and reopen, or move the balance?
13. Rejoining after a break: new joiner, continued service, or only within a time limit?
14. On a mid-year policy change: prospective only, or recalculate the whole year?
15. May leave be taken before it is credited (advance leave), and how many days?
16. Who may override: employee-level exceptions, adjustments in closed years, and who approves encashment?
17. Which of these rules are legal requirements that must be provable to an auditor, and which are company choices?

## 14. Suggested delivery order

1. Policy scope + effective dating, replacing the current single settings row.
2. Proration and rounding, entitlement run record.
3. Service slabs.
4. Probation rules.
5. Year-end: carry forward and lapse, then encashment requests.
6. Exit settlement statement.
7. Cross-year leave requests, policy-change recalculation, rejoin and transfer handling.
