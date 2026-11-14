# HRMS – Leave Management, Accrual, Balance & Sandwich Leave
## Complete Functional Planning Document

**Document Version:** 3.0  
**Status:** Functional Planning  
**Initial Countries:** India and UAE  
**Architecture:** Multi-country, Multi-organization HRMS  
**Backend:** NestJS  
**ORM:** Prisma  
**Database:** PostgreSQL  
**Frontend:** Next.js + Tailwind CSS

---

# 1. Project Objective

We are building a generic HRMS application that supports organizations operating in different countries.

The Leave Management module must use a common application workflow while allowing each organization to configure its own:

- Leave types.
- Leave entitlement.
- Leave accrual methods.
- Employee eligibility.
- Service-based entitlement.
- Employment-type-based entitlement.
- Financial-year or leave-year settings.
- Leave expiry and carry-forward.
- Sandwich leave policies.
- Compensatory Off policies.
- Leave approval workflows.
- Document requirements.
- Leave calendar.
- Country-specific configurations.

The system must not have separate hardcoded Leave Management modules for India and UAE.

Instead, the same module should work through configurable policies and country-specific settings.

**Important:** Country applicability must follow the employee's employment country/legal entity and applicable work location, not the employee's nationality.

# 2. Overall Leave Management Modules

The Leave Management module should contain the following functional areas:

1. Leave Type Master.
2. Leave Policy Management.
3. Leave Accrual & Entitlement.
4. Leave Balance Management.
5. Sandwich Leave Configuration.
6. Comp Off Configuration.
7. Leave Application.
8. Leave Approval Workflow.
9. Leave Calendar.
10. Leave Documents.
11. Leave Encashment and Carry Forward.
12. Leave Reports.
13. Attendance Integration.
14. Payroll Integration.

Each area should be configurable according to the organization's policy.

---

# 3. Leave Type Master

Leave Type Master defines the types of leave available to employees.

Examples:

- Casual Leave.
- Sick Leave.
- Privilege Leave.
- Annual Leave.
- Medical Leave.
- Maternity Leave.
- Paternity Leave.
- Bereavement Leave.
- Compensatory Leave.
- Loss of Pay.
- Special Leave.
- Half Day.

## 3.1 General Leave Type Fields

| Field | Description |
|---|---|
| Leave Name | Display name |
| Leave Code | Unique leave code |
| Description | Leave type description |
| Country | Country applicability, where required |
| Paid/Unpaid | Paid, unpaid or partially paid |
| Balance Tracking | Whether balance is maintained |
| Entitlement Method | Fixed, calculated, earned, unlimited or no balance tracking |
| Accrual Method | Monthly, annual, daily, custom or none |
| Document Required | Whether supporting documents are required |
| Document Required After | Number of leave days after which documents are mandatory |
| Minimum Application | Minimum leave quantity |
| Maximum Application | Maximum leave quantity |
| Allow Half Day | Whether half-day application is permitted |
| Allow Hourly Leave | Whether hourly leave is permitted |
| Allow Backdated Leave | Whether past-date application is allowed |
| Allow Future Leave | Whether future-date application is allowed |
| Negative Balance | Whether employee can apply beyond available balance |
| Reason Required | Whether reason is mandatory |
| Gender Restriction | Optional eligibility restriction |
| Is Sandwich Eligible | Whether this leave type participates in sandwich calculations |
| Carry Forward | Whether this leave type supports carry-forward |
| Encashment | Whether this leave type supports encashment |
| Active | Whether leave type is available |

Not every field must be visible for every leave type. The system should show relevant settings based on the selected entitlement and leave configuration.

## 3.2 Entitlement Types

The system should support:

| Entitlement type | Description |
|---|---|
| Fixed | Fixed entitlement, such as 12 days per year |
| Calculated | Entitlement calculated through service, slabs or another formula |
| Earned | Entitlement earned through a qualifying event, such as Comp Off |
| Unlimited | No fixed annual entitlement limit |
| No Balance Tracking | Record leave without maintaining an entitlement balance |

**Important distinction:**

Unlimited and No Balance Tracking are not the same.

- Unlimited: The system still records leave usage and can show a balance or usage history, but there is no fixed entitlement limit.
- No Balance Tracking: The system records leave requests and approvals without maintaining an entitlement balance.

LOP can be configured without a normal earned balance, subject to company policy.

---

# 4. Country-Specific Leave Types

The system must support different leave types and configurations for different countries.

## 4.1 India Leave Types

Initial company leave types:

| Leave Type | Paid/Unpaid | Balance | Accrual |
|---|---|---|---|
| Casual Leave | Paid | Yes | Policy-based |
| Privilege Leave | Paid | Yes | Policy-based |
| Sick Leave | Paid | Yes | Policy-based |
| Comp Off Leave | Paid | Yes | Earned through approved work |
| LOP | Unpaid | No fixed entitlement | No normal accrual |

The organization must be able to configure entitlement, accrual and expiry separately for each leave type.

## 4.2 UAE Leave Types

The initial UAE leave-type requirements are:

| Leave Type | Paid/Unpaid | Balance/Calculation | Special Requirements |
|---|---|---|---|
| Annual Leave | Paid/Unpaid as configured | Calculated | Service/entitlement-based |
| Medical Leave | Paid | Fixed or slab-based | Document required |
| Compensatory Leave | Paid | Earned | Depends on qualifying work on holidays/weekly offs |
| Emergency Leave | Unpaid | Policy-based | As configured |
| Short Leave | Unpaid | Policy-based | As configured |
| LOP | Unpaid | No normal entitlement balance | Used for unpaid leave |
| Half Day | Unpaid | 0.5 day or configured duration | Half-day application |
| Special Leave | Unpaid | Policy-based | Reason mandatory |
| Medical Leave – No Certificate | Paid | Fixed entitlement | No medical certificate |
| Bereavement Leave | Paid | Policy-based | Relationship-based rules may be configured |
| Maternity Leave | Paid | Fixed or slab-based | Eligibility and payment stages may be configured |
| Paternity Leave | Paid | Fixed entitlement | Policy-based |

### 4.2.1 Annual Leave

Annual Leave must support:

- Fixed entitlement.
- Calculated entitlement.
- Service-based entitlement.
- Monthly or annual accrual.
- Paid or unpaid treatment as configured.
- Proration.
- Expiry.
- Carry-forward.
- Encashment, if applicable.

### 4.2.2 Medical Leave

Medical Leave should support:

- Paid leave.
- Fixed entitlement.
- Slab-based entitlement.
- Document requirement.
- Configurable document requirement threshold.
- Different payment stages, if required by policy.

Example of a configurable slab structure:

| Leave period | Payment treatment |
|---|---|
| Slab 1 | Configurable payment percentage |
| Slab 2 | Configurable payment percentage |
| Slab 3 | Configurable payment percentage |

The actual number of days and payment percentages must be configured according to the applicable company policy and legal requirements.

### 4.2.3 Compensatory Leave

Compensatory Leave is earned when an employee works on a qualifying weekly off or public holiday.

It should integrate with the Comp Off earning process described later in this document.

### 4.2.4 Emergency Leave

- Unpaid.
- Balance and application restrictions configurable.
- Approval workflow configurable.

### 4.2.5 Short Leave

- Unpaid.
- Supports configured duration or partial-day application.
- Approval workflow configurable.

### 4.2.6 LOP

- Unpaid.
- No normal entitlement accrual.
- Used to record loss-of-pay leave.
- Can participate in sandwich leave according to the UAE sandwich policy.
- Balance tracking should follow the configured no-balance or usage-tracking behaviour.

### 4.2.7 Half Day

- Unpaid in the initial company configuration.
- Supports half-day application.
- Supports first-half and second-half selection if required.
- Deduction quantity should be configurable.

### 4.2.8 Special Leave

- Unpaid.
- Reason is mandatory.
- Examples: demise or marriage.
- HR/Admin can configure applicable reasons if the company wants a controlled reason list.

### 4.2.9 Medical Leave – No Certificate

This is separate from regular Medical Leave.

- Paid.
- Fixed entitlement.
- No medical certificate required.
- Entitlement and frequency configurable.

### 4.2.10 Bereavement Leave

- Paid.
- Can support relationship-based entitlement.
- Relationship and day entitlement should be configurable.

### 4.2.11 Maternity Leave

- Paid.
- Supports fixed or slab-based entitlement.
- Can support different payment stages.
- Eligibility and document requirements configurable.

### 4.2.12 Paternity Leave

- Paid.
- Fixed or configured entitlement.
- Eligibility and application requirements configurable.

**Country compliance note:** These are the requested initial UAE leave categories and configuration expectations. Statutory entitlement values, eligibility and payment stages must be verified against the applicable UAE legislation and company policy before production configuration. The system should not hardcode assumed statutory values.

---

# 5. Leave Accrual & Entitlement Management

Leave entitlement should be calculated through a separate Leave Accrual Engine.

Entitlement may depend on:

- Employee type.
- Employment status.
- Payroll effective date.
- Original joining date.
- Completed years of service.
- Leave type.
- Country.
- Organization.
- Financial year.
- Policy assignment.

## 5.1 Initial Company Policy – India

The company follows an April–March financial year.

Rules:

- Employees below two years of payroll service receive 12 annual leaves.
- Employees with two years or more of payroll service receive 24 annual leaves.
- Interns and employees in probation receive one leave per month.
- When the employee moves to payroll, the remaining entitlement is calculated according to the configured transition rule.
- Leave does not carry forward.
- Unused leave expires at financial-year end.

## 5.2 Service Calculation

For the initial company, experience is calculated from the **Payroll Effective Date**.

Example:

| Event | Date |
|---|---|
| Original joining date | 1 April 2024 |
| Probation | April–June 2024 |
| Payroll effective date | 1 July 2024 |
| Completes two years | 1 July 2026 |

On 1 July 2026, the employee enters the two-year entitlement bracket.

This calculation basis should be configurable for other organizations.

## 5.3 Service-Based Entitlement

| Completed payroll service | Annual entitlement |
|---|---:|
| Less than 2 years | 12 days |
| 2 years and above | 24 days |

The administrator should be able to add more service slabs.

Example:

| Service duration | Annual entitlement |
|---|---:|
| Less than 1 year | 10 |
| 1–less than 2 years | 12 |
| 2–less than 5 years | 24 |
| 5 years and above | 30 |

These are examples of configurable company policies, not statutory defaults.

## 5.4 Probation-to-Payroll Calculation

Example:

| Period | Employee type | Leave credit |
|---|---|---:|
| April | Probation | 1 |
| May | Probation | 1 |
| June | Probation | 1 |
| July–March | Payroll | 9 |
| **Total** | | **12** |

The transition calculation must be configurable.

Supported methods:

1. Remaining financial-year entitlement.
2. Continue monthly accrual.
3. Recalculate full financial-year entitlement.

Additional settings:

- Effective date.
- Previous credit treatment.
- Reallocation across leave types.
- Rounding.
- Recalculation approval.

## 5.5 Mid-Year Service Milestone

When the employee crosses two years during a financial year, entitlement must be recalculated.

Example:

- April–September: 12 days annual rate.
- October–March: 24 days annual rate.

Monthly prorated calculation:

`(12 / 12 × 6) + (24 / 12 × 6) = 18 days`

The system must calculate entitlement for each period and create an adjustment transaction. It must not simply add another full 24 days.

## 5.6 Supported Accrual Methods

| Method | Description |
|---|---|
| Monthly | Fixed monthly credit, e.g. 1.2, 1.5 or 2 days |
| Annual Upfront | Full entitlement credited at the start of the year |
| Annual Prorated | Entitlement based on eligible months/days |
| Daily | Credit based on eligible calendar/working/paid days |
| Milestone-Based | Entitlement changes after service milestone |
| Custom Schedule | Administrator defines credit dates and quantities |
| No Accrual | Leave type does not earn a normal balance |

Different leave types may use different methods.

## 5.7 Leave Type Distribution

A company may distribute total entitlement across different leave types.

Example:

| Leave type | Annual allocation |
|---|---:|
| Casual Leave | 6 |
| Sick Leave | 3 |
| Privilege Leave | 3 |
| **Total** | **12** |

Support:

- Fixed-day allocation.
- Percentage allocation.
- Employee-type-based allocation.
- Service-slab-based allocation.
- Separate allocation during probation and payroll.

## 5.8 Financial-Year Expiry

For the initial company:

- Financial year: April–March.
- Carry forward: Disabled.
- Expiry: 31 March.
- New entitlement cycle: 1 April.

At expiry:

1. Identify unused balance.
2. Create expiry transaction.
3. Close the old entitlement bucket.
4. Start the next entitlement cycle.
5. Preserve all historical transactions.

Carry-forward and expiry must be configurable for other companies.

---

# 6. Leave Balance Management

The balance screen should show the employee's balance separately for each leave type.

Recommended fields:

| Field | Description |
|---|---|
| Opening Balance | Previous-period balance |
| Entitlement | Applicable period entitlement |
| Accrued | Amount credited |
| Adjustments | Manual/automatic adjustments |
| Used | Approved leave usage |
| Pending | Pending or reserved leave |
| Expired | Expired quantity |
| Available | Available quantity |
| Next Accrual Date | Next expected credit |
| Expiry Date | Applicable expiry date |

Example:

| Leave Type | Entitlement | Used | Pending | Available |
|---|---:|---:|---:|---:|
| Casual Leave | 6 | 2 | 1 | 3 |
| Sick Leave | 3 | 1 | 0 | 2 |
| Privilege Leave | 3 | 0 | 0 | 3 |

The system must distinguish actual available balance from projected balance.

## 6.1 Balance Buckets

Do not maintain only one total balance.

Every credit should have its own entitlement bucket containing:

- Employee.
- Leave type.
- Source policy.
- Credit date.
- Original quantity.
- Used quantity.
- Remaining quantity.
- Expiry date.
- Financial year.
- Source transaction.

This is essential when different credits have different expiry dates.

## 6.2 Balance Transaction Ledger

Every change must be recorded:

- Opening balance.
- Monthly accrual.
- Annual allocation.
- Daily accrual.
- Service milestone adjustment.
- Probation-to-payroll adjustment.
- Manual credit.
- Manual debit.
- Leave usage.
- Leave cancellation reversal.
- Expiry.
- Carry-forward.
- Encashment.
- Comp Off credit.
- Comp Off usage.
- Comp Off expiry.
- Comp Off reversal.

Never silently overwrite or delete historical balance transactions.

## 6.3 Pending Leave Reservation

The organization should configure when balance is reserved:

- On leave application submission.
- On leave approval.

If reserved on submission, the system must release the reservation on rejection or cancellation.

The employee screen should distinguish pending/reserved balance from approved leave usage.

---

# 7. Sandwich Leave Management

Sandwich leave must be part of the Leave Management module.

However, it must be configurable because some organizations do not follow sandwich leave policies, and different countries or companies may apply different rules.

## 7.1 System Configuration

The organization should be able to enable or disable sandwich leave.

At organization/policy level:

- Sandwich leave enabled.
- Applicable country/policy.
- Include weekly offs.
- Include public holidays.
- Apply before holiday/weekend.
- Apply after holiday/weekend.
- Apply when leave is taken on both sides, if configured.
- Effective dates.
- Treatment of additional counted days.

At Leave Type Master level:

**Is Sandwich Eligible**

The administrator selects whether a particular leave type participates in the sandwich calculation.

Default should be disabled unless explicitly enabled.

A leave type should participate only when:

1. Sandwich policy is enabled.
2. The leave type is marked as sandwich eligible.
3. The configured country/company sandwich conditions are satisfied.

## 7.2 India Sandwich Rule

Initial India requirement:

**Any eligible leave taken immediately before or after a holiday or weekly off can trigger sandwich leave.**

Example:

| Day | Status |
|---|---|
| Friday | Leave |
| Saturday | Weekly off |
| Sunday | Weekly off |
| Monday | Present |

Under the configured India rule, the weekend may be counted as sandwich leave because leave was taken immediately before the weekly off.

Another example:

| Day | Status |
|---|---|
| Friday | Present |
| Saturday | Weekly off |
| Sunday | Weekly off |
| Monday | Leave |

The weekend may also be counted because leave was taken immediately after the weekly off.

The applicable leave type must be marked as sandwich eligible.

## 7.3 UAE Sandwich Rule

Initial UAE requirement:

**Only LOP leave before or after a holiday or weekend should trigger sandwich leave.**

Example:

| Day | Status |
|---|---|
| Friday | LOP |
| Saturday | Weekly off |
| Sunday | Weekly off |
| Monday | Present |

The weekend is counted according to the UAE sandwich policy.

Another example:

| Day | Status |
|---|---|
| Friday | Present |
| Saturday | Weekly off |
| Sunday | Weekly off |
| Monday | LOP |

The weekend is counted according to the UAE sandwich policy.

Other paid leave types should not automatically trigger the UAE sandwich rule unless the organization changes its configuration.

## 7.4 Sandwich Configuration Must Be Leave-Type Based

The country rules must not be hardcoded.

Example:

| Country | Leave type | Sandwich eligible |
|---|---|---|
| India | Casual Leave | Configurable |
| India | Sick Leave | Configurable |
| India | Privilege Leave | Configurable |
| India | LOP | Configurable |
| UAE | LOP | Enabled for initial policy |
| UAE | Annual Leave | Configurable |
| UAE | Medical Leave | Configurable |
| UAE | Special Leave | Configurable |

The administrator must control eligibility.

## 7.5 Sandwich Calculation

The calculation should use:

- Employee roster.
- Assigned weekly off.
- Public holiday calendar.
- Leave dates.
- Leave type.
- Country/company sandwich policy.
- Before/after conditions.
- Sandwich eligibility flag.

Do not assume Saturday and Sunday are weekly offs.

## 7.6 Sandwich Preview

Before the employee submits a leave request, show:

- Original requested leave days.
- Weekly offs/holidays between or adjacent to leave.
- Additional sandwich days.
- Total days considered.
- Expected balance deduction.

Example:

| Description | Days |
|---|---:|
| Requested leave | 1 |
| Weekend counted | 2 |
| Total deduction | 3 |

This should be a preview, and the final calculation should be validated again during approval.

## 7.7 Sandwich Audit

Store:

- Original leave request dates.
- Original leave quantity.
- Additional sandwich dates.
- Reason each date was counted.
- Applied policy.
- Applied leave type eligibility.
- Final deduction.
- Approval details.

If the leave request is edited or cancelled, the sandwich calculation must be recalculated or reversed safely.

## 7.8 Important Sandwich Decisions

The following should remain configurable:

- Before holiday/weekend.
- After holiday/weekend.
- Both sides required.
- Consecutive holidays.
- Multiple weekly offs.
- Public holidays.
- Different weekly-off patterns.
- Different leave types.
- Country-specific rule.
- Treatment of counted days.

The initial India and UAE behaviour described above must be available as policy configurations.

---

# 8. Compensatory Off (Comp Off)

Comp Off is earned through qualifying attendance events.

It must be handled separately from normal leave accrual.

## 8.1 Eligibility

Potential qualifying events:

- Work on configured weekly off.
- Work on public holiday.
- Other configured non-working days.

Do not hardcode Saturday or Sunday.

The system must use the employee's roster and assigned holiday calendar.

Example:

| Attendance situation | Eligibility |
|---|---|
| Worked on configured Sunday off | Policy-dependent |
| Worked on configured Saturday off | Policy-dependent |
| Worked on normal working Saturday | Not eligible by default |
| Worked on public holiday | Policy-dependent |
| Worked on normal weekday | Not eligible by default |

## 8.2 Attendance Approval Workflow

1. Employee works on a weekly off or public holiday.
2. Attendance is marked and sent for approval.
3. Manager reviews the attendance.
4. Manager approves or rejects attendance.
5. Manager can select whether to grant Comp Off, if configured.
6. System determines the credit quantity.
7. System creates an individual Comp Off balance credit.
8. Employee sees the credit and expiry date.

Attendance approval and Comp Off granting must be separate decisions.

## 8.3 System Admin Comp Off Configuration

Create a separate Comp Off Configuration section in System Administration.

### Credit Method

**Fixed**

- Administrator configures the credit quantity.
- Initial default: 1 day.
- Manager cannot change the quantity during approval.

**Variable**

- Manager enters the credit quantity.
- Administrator configures minimum and maximum values.
- Administrator configures permitted increments, such as 0.5 day.

### Additional Settings

- Weekly-off eligibility.
- Public-holiday eligibility.
- Minimum working hours.
- Fixed/variable credit.
- Default credit.
- Minimum and maximum credit.
- Permitted increment.
- Approval requirement.
- Employee group/site applicability.
- Maximum balance.
- Expiry method.
- Carry-forward.
- Reversal behaviour.

## 8.4 Comp Off Expiry

Support:

- No expiry.
- Expire after configured days from credit date.
- Expire at financial-year end.
- Expire on a fixed date.
- Other configured validity rules.

Each Comp Off credit must have an individual expiry date.

Example:

| Earned date | Credit | Expiry | Used | Remaining |
|---|---:|---|---:|---:|
| 12 July | 1 | 10 September | 0 | 1 |
| 19 July | 1 | 17 September | 1 | 0 |
| 26 July | 1 | 25 September | 0 | 1 |

## 8.5 Comp Off Consumption

Use FEFO (First Expiring, First Out).

When the employee applies for Comp Off:

1. Find all available and unexpired credit buckets.
2. Sort by earliest expiry date.
3. Reserve or consume the required amount.
4. Update the bucket quantities.
5. Create usage transactions.

## 8.6 Comp Off Reversal

If attendance approval is reversed:

- Identify the source Comp Off credit.
- Check whether it has already been used.
- Reverse unused credit.
- If already partly used, route through an authorized adjustment process.
- Retain complete transaction history.

---

# 9. Leave Application and Approval

The Leave Application module must use the entitlement and balance engine.

## 9.1 Application Validation

When an employee applies:

1. Identify the leave type.
2. Identify the assigned leave policy.
3. Check employee eligibility.
4. Check available balance if applicable.
5. Check negative-balance restrictions.
6. Check minimum/maximum application.
7. Check half-day or hourly rules.
8. Check document requirements.
9. Check reason requirements.
10. Check date conflicts and overlapping requests.
11. Identify weekly offs and public holidays.
12. Apply sandwich policy if eligible.
13. Display the calculation preview.
14. Submit for approval.

## 9.2 Document Requirements

Leave Type Master should control:

- Whether documents are required.
- After how many days documents become mandatory.
- Allowed document formats.
- Document upload timing.
- Whether HR can waive the requirement, if authorized.

This is especially relevant for UAE Medical Leave.

## 9.3 Approval Workflow

Support configurable approval levels:

- Reporting Manager.
- Department Manager.
- HR.
- Payroll/authorized approver.
- Custom multi-level approval.

Approval flow should depend on organization configuration.

Store complete approval history.

## 9.4 Balance Deduction Timing

Support:

- Deduct on submission.
- Reserve on submission and deduct on approval.
- Deduct only on final approval.

On rejection or cancellation, restore the appropriate reservation or balance through transactions.

---

# 10. Leave Calendar

The Leave Calendar must display past, current and future leave information.

It should be available for:

- Employee.
- Manager/team.
- Department.
- Site/branch.
- HR/Admin.

## 10.1 Calendar Information

Show:

- Approved leave.
- Pending leave.
- Rejected leave, where filter enabled.
- Cancelled leave, where filter enabled.
- Public holidays.
- Weekly offs.
- Sandwich days.
- Comp Off.
- Other attendance-related information, if permitted.

## 10.2 Calendar Colours

Suggested colour configuration:

| Calendar item | Suggested colour |
|---|---|
| Approved leave | Green |
| Pending leave | Yellow |
| Rejected leave | Red |
| Public holiday | Blue |
| Weekly off | Grey |
| Sandwich leave | Purple |
| Comp Off | Orange |
| Cancelled leave | Muted grey |

The colours should be configurable.

Show a colour legend at the bottom of the calendar.

## 10.3 Calendar Filters

- Country.
- Site/branch.
- Department.
- Employee.
- Leave type.
- Approval status.
- Date range.
- Calendar category.

## 10.4 Calendar Details

Clicking a leave entry should show:

- Employee details.
- Leave type.
- From/to dates.
- Number of leave days.
- Approval status.
- Approver.
- Reason.
- Sandwich calculation.
- Documents, subject to permissions.

---

# 11. Leave Expiry, Carry Forward and Encashment

These rules must be configurable per leave type or policy.

Supported carry-forward options:

- No carry forward.
- Full carry forward.
- Limited carry forward.
- Carry forward with expiry.

Supported expiry options:

- Financial-year end.
- Fixed date.
- Specified number of days from credit date.
- No expiry.

Encashment configuration:

- Enabled/disabled.
- Eligible leave types.
- Maximum encashment quantity.
- Calculation basis.
- Approval requirement.
- Payroll integration.

The initial India company policy is no carry forward and financial-year-end expiry.

---

# 12. Joining, Exit and Employment Changes

The system must handle:

## 12.1 New Employee

- Joining date.
- Employment type.
- Payroll effective date.
- Policy assignment.
- Joining-month accrual rule.
- Proration.

## 12.2 Employee Exit

- Accrual stop date.
- Pending leave.
- Remaining leave.
- Negative balance.
- Encashment or expiry.
- Comp Off treatment.
- Final settlement integration.

## 12.3 Employment-Type Change

When an employee moves from Intern/Probation to Payroll:

- Record the old and new employment types.
- Record effective date.
- Resolve the transition policy.
- Recalculate entitlement.
- Create adjustment transactions.
- Preserve old credits and history.

## 12.4 Policy Change

When an employee moves to another policy:

- Close the old policy assignment.
- Create the new effective-dated assignment.
- Apply the configured transition treatment.
- Preserve historical balances.
- Avoid duplicate accrual.

---

# 13. Attendance Integration

Leave Management must integrate with:

- Attendance.
- Employee Roster.
- Weekly Off.
- Holiday Calendar.
- Attendance Approval.
- Comp Off.

Attendance must identify work performed on configured weekly offs or holidays.

The attendance approval workflow should allow the manager to grant Comp Off according to the configured policy.

Attendance must not directly modify balances without creating a corresponding transaction.

Sandwich calculation must also use the same roster and holiday information.

---

# 14. Payroll Integration

Leave Management should provide:

- Approved paid leave.
- Approved unpaid leave.
- LOP days.
- Half-day deductions.
- Leave encashment.
- Comp Off usage.
- Final settlement leave information.
- Leave salary information, where applicable.

The accrual engine calculates entitlement.

The leave module calculates leave usage.

Payroll calculates the financial impact.

Do not mix leave entitlement calculation with salary calculation.

---

# 15. Policy Assignment Hierarchy

Support effective-dated policy assignment at:

1. Country default.
2. State/province.
3. Organization.
4. Site/branch.
5. Employee group.
6. Employee-specific override.

The system must define assignment priority.

Employee-specific assignment should take precedence when explicitly configured.

Country-specific configurations should be based on the employee's employment country/legal entity and applicable work location, not nationality.

---

# 16. System Administration

System Admin should control the configuration capabilities.

Suggested configuration sections:

1. Leave Type Master.
2. Leave Accrual Methods.
3. Sandwich Leave Configuration.
4. Comp Off Configuration.
5. Financial Year Configuration.
6. Leave Calendar Colours.
7. Leave Document Rules.
8. Leave Approval Workflow.
9. Country-Specific Leave Configuration.

Organization HR/Admin should manage policy values within the capabilities and permissions allowed by System Admin.

---

# 17. Suggested Database Entities

The following is a logical proposal. Exact Prisma models and relationships should be designed separately.

| Entity | Responsibility |
|---|---|
| `LeaveType` | Common leave type master |
| `LeaveTypeCountryConfig` | Country-specific leave type settings, where needed |
| `LeavePolicy` | Organization leave policy |
| `LeavePolicyAssignment` | Employee/group/site policy assignment |
| `LeaveAccrualPolicy` | Accrual configuration |
| `LeaveAccrualRule` | Accrual calculation rules |
| `LeaveAccrualSlab` | Service-based entitlement slabs |
| `LeaveAccrualAllocation` | Allocation to leave types |
| `EmployeeEmploymentHistory` | Historical employment changes |
| `EmployeeLeaveBalance` | Current balance summary |
| `LeaveBalanceBucket` | Individual credit bucket and expiry |
| `LeaveBalanceTransaction` | Credits, usage, adjustments and expiry |
| `SandwichPolicy` | Country/company sandwich configuration |
| `SandwichPolicyLeaveType` | Leave types eligible for sandwich |
| `SandwichCalculation` | Calculated sandwich dates and quantities |
| `CompOffPolicy` | Comp Off eligibility and credit settings |
| `CompOffRequest` | Attendance-linked Comp Off decision |
| `CompOffBalance` | Individual Comp Off credit bucket |
| `CompOffTransaction` | Comp Off credit, usage, expiry and reversal |
| `LeaveRequest` | Employee leave application |
| `LeaveRequestDocument` | Supporting documents |
| `LeaveApprovalHistory` | Approval audit |
| `HolidayCalendar` | Assigned public holidays |
| `Roster` / `WeeklyOff` | Employee weekly-off information |
| `AccrualProcessingRun` | Accrual job execution |
| `AccrualProcessingDetail` | Employee-level processing result |

Existing common HRMS entities should be reused wherever possible.

## 17.1 Important Database Rules

- Use effective dates for policy assignments.
- Keep historical employment records.
- Keep policy versions or immutable historical configurations.
- Store source references for all transactions.
- Store original and remaining quantities in balance buckets.
- Maintain reversal references.
- Prevent duplicate accrual processing.
- Use database transactions for concurrent balance deductions.
- Use decimal quantities, not integer-only balances, where fractional leave is supported.

---

# 18. Background Processing

Scheduled processing should support:

- Monthly accrual.
- Annual upfront allocation.
- Daily accrual.
- Service milestone recalculation.
- Probation-to-payroll recalculation.
- Financial-year opening.
- Financial-year expiry.
- Comp Off expiry.
- Expiry notifications.
- Ledger reconciliation.

All processing must use the organization's configured timezone.

Each run should have:

- Processing period.
- Start/end timestamps.
- Status.
- Total employees processed.
- Successful records.
- Failed records.
- Retry information.
- Error details.

A failed employee calculation should not silently corrupt other employees' balances.

---

# 19. Reports

## 19.1 Leave Reports

- Employee Leave Balance.
- Leave Entitlement.
- Monthly Accrual.
- Annual Accrual.
- Leave Usage.
- Pending Leave.
- Expiring Balance.
- Expired Balance.
- Leave by Department.
- Leave by Country/Site.
- Sandwich Leave Report.
- Leave Adjustment Report.

## 19.2 Comp Off Reports

- Comp Off Earned.
- Comp Off Used.
- Comp Off Expired.
- Pending Comp Off Approval.
- Employee Comp Off Balance.
- Comp Off by Department/Site.
- Comp Off Reversal Report.

## 19.3 Audit Reports

- Accrual Processing History.
- Service Milestone Changes.
- Probation-to-Payroll Adjustments.
- Policy Changes.
- Manual Balance Adjustments.
- Sandwich Calculation History.
- Expiry Processing.
- Ledger Reconciliation.

---

# 20. Notifications

Support configurable notifications for:

- Leave balance credited.
- Leave application submitted.
- Leave approved/rejected.
- Leave balance approaching expiry.
- Service milestone reached.
- Probation-to-payroll transition processed.
- Accrual processing failure.
- Comp Off credited.
- Comp Off approaching expiry.
- Comp Off expired.
- Sandwich calculation applied.

---

# 21. Permissions and Audit

| Role | Responsibilities |
|---|---|
| System Admin | Configure system capabilities |
| Organization Admin | Configure organization leave policies |
| HR Admin | Assign policies and manage balances |
| Payroll Admin | Access payroll-related leave information |
| Manager | Approve leave and eligible Comp Off credits |
| Employee | View balances and apply for leave |

Audit all:

- Policy creation and changes.
- Policy assignment.
- Accrual processing.
- Manual adjustments.
- Sandwich calculations.
- Comp Off approval.
- Leave approval.
- Expiry.
- Reversals.

---

# 22. Implementation Phases

## Phase 1 – Leave Foundation

- Leave Type Master.
- Country-specific leave configuration.
- Organization Leave Policy.
- Financial-year configuration.
- Policy assignment.
- Paid/unpaid and balance settings.

## Phase 2 – Accrual & Entitlement

- Monthly accrual.
- Annual upfront.
- Prorated accrual.
- Daily accrual.
- Service-based slabs.
- Employee-type rules.
- Probation-to-payroll transition.
- Mid-year recalculation.
- Leave type allocation.

## Phase 3 – Balance Management

- Balance buckets.
- Transaction ledger.
- Leave usage.
- Pending reservations.
- Expiry.
- Carry-forward.
- Encashment.
- Reconciliation.

## Phase 4 – Sandwich Leave

- Organization sandwich enable/disable.
- Leave-type sandwich eligibility.
- Country-specific rules.
- Weekly-off and holiday calculation.
- Sandwich preview.
- Additional-day deduction.
- Sandwich audit.

## Phase 5 – Comp Off

- Comp Off System Admin configuration.
- Weekly-off eligibility.
- Public-holiday eligibility.
- Attendance approval integration.
- Fixed/variable credit.
- Individual credit buckets.
- Expiry.
- FEFO consumption.
- Reversal.

## Phase 6 – Leave Application and Approval

- Application validation.
- Document validation.
- Approval workflow.
- Balance reservation/deduction.
- Cancellation and reversal.

## Phase 7 – Calendar and Reports

- Employee calendar.
- Manager/team calendar.
- HR calendar.
- Colour legend.
- Calendar filters.
- Reports and notifications.

## Phase 8 – Attendance and Payroll Integration

- Attendance integration.
- Roster and holiday integration.
- Payroll deduction.
- Leave encashment.
- Final settlement.

---

# 23. Decisions Already Agreed

| Topic | Agreed requirement |
|---|---|
| India financial year | April–March |
| India carry forward | No; unused leave expires |
| India below 2 years | 12 days annual entitlement |
| India 2 years and above | 24 days annual entitlement |
| Service calculation | From payroll effective date |
| Two-year threshold | Effective on the date employee completes two payroll years |
| Probation accrual | One leave per month in the initial company |
| Probation-to-payroll | Configurable transition calculation |
| Mid-year service change | Recalculate entitlement |
| Accrual methods | Monthly, annual, prorated, daily, milestone and custom |
| Leave allocation | Distribute entitlement across leave types |
| Sandwich company setting | Admin can enable/disable |
| Sandwich leave-type setting | Admin selects eligibility while creating/editing leave type |
| India sandwich rule | Eligible leave before or after holiday/weekly off can trigger sandwich |
| UAE sandwich rule | LOP before or after holiday/weekly off can trigger sandwich |
| Calendar | Past, current and future leave display |
| Calendar legend | Show colour legend |
| Comp Off credit | System Admin configuration |
| Fixed Comp Off | Configured default; initial default 1 day |
| Variable Comp Off | Manager enters credit quantity |
| Comp Off expiry | Configurable |
| Weekly off | Based on employee roster, not hardcoded Saturday/Sunday |

---

# 24. Open Decisions Before Final Database Design

These details still need final confirmation.

## Accrual

1. If an employee joins in the middle of a month, should the employee receive full-month credit, prorated credit or no credit?
2. If an employee completes two years in the middle of a month, should the new entitlement apply immediately with daily proration or from the next month?
3. When probation becomes payroll, can previous credits be adjusted, or should they always be retained?
4. Which rounding rules should be supported?
5. How should an allocation remainder be handled?

## Sandwich Leave

6. Should the default sandwich trigger be leave on either side, or can an organization configure a both-sides requirement?
7. Should intervening public holidays and weekly offs all be counted when a sandwich rule is triggered?
8. Should additional sandwich days be deducted from the same leave type, or should the company be able to configure another deduction treatment?
9. How should a leave request spanning multiple eligible leave types be evaluated?
10. Should HR be able to override a sandwich calculation with a recorded reason?

## Comp Off

11. What minimum hours worked are required to earn Comp Off?
12. What minimum, maximum and increments are allowed in variable mode?
13. Should a manager be allowed to approve attendance without granting Comp Off?
14. Confirm earliest-expiring-first consumption.
15. What should happen if Comp Off has already been consumed when its source attendance approval is reversed?

## Balance and Employment

16. Should pending leave reserve balance on submission or only on approval?
17. What happens when approved leave crosses a financial-year boundary?
18. What happens to unused leave and Comp Off when an employee exits?
19. Should a policy amendment affect existing employees immediately or only from a new effective date?
20. Should negative balances be allowed for specific leave types?

---

# 25. Compliance and Configuration Note

The India and UAE leave types in this document reflect the requested initial business configuration.

They do not represent a complete statement of statutory leave entitlements.

Statutory entitlement, payment stages, eligibility, document requirements and other legal conditions must be verified against applicable country, state, establishment and employment rules before production use.

The system should support these requirements through configuration rather than hardcoded country-specific calculations.

---

# 26. Final Architecture Recommendation

Build the Leave Management system around six connected capabilities:

1. **Leave Type & Policy Management** – defines available leave types and employee eligibility.
2. **Leave Accrual Engine** – calculates entitlement based on employment type, service, period and policy.
3. **Leave Balance Ledger** – maintains credit buckets, usage, expiry and adjustments.
4. **Sandwich Leave Engine** – calculates additional leave days according to company, country and leave-type eligibility.
5. **Comp Off Engine** – grants and manages earned leave from approved attendance.
6. **Leave Application & Calendar** – provides application, approval, visibility and reporting.

All six capabilities should share the same employee, employment history, roster, holiday calendar and approval information.

**Expected outcome:** One configurable global Leave Management module that supports the initial India and UAE requirements, accommodates different company policies and remains extensible for additional countries without rewriting the business logic.
