In my company.
Leave credit rule for prodata base

Base on the employee type
Trainee and probation period -they will get one leave each month
once they are on payroll. they will get remain leave.



support: the person on probation for 3 month: april, may, and june Total leave 3
after they comes on payroll. remain month leave credit at once.
June to march = 9

12 leave he will have.

once they have completed 2 years, they will get 24 but base on prodata. (remaining month)









This describes a real new capability the system doesn't have yet — and it's worth being precise about it before I write any code, since it's a payroll-adjacent correctness thing.

First, what you're describing, in the system's own terms:

- **The 24-days-after-2-years part is already built.** Leave Policies support "service slabs" — different days/year at different service milestones, with an "immediate" timing option that prorates for the months remaining in the year the milestone falls. I can configure that today with no new code: e.g. 12 days/year for months 0–24 of service, 24 days/year after, timing = Immediate.

- **The probation → payroll switch is genuinely new.** The employee record already has a "Date of confirmation" field, but nothing in the leave engine reads it — accrual only knows "monthly" or "upfront," not "monthly until a date, then dump the rest of the year at once." That's exactly the gap the planning docs flag as "probation lock — not built yet."

Before I build that, two things change the design a fair bit:

Given the usage limit, I'll stop here rather than start a multi-file engine change I can't finish cleanly.

**What's confirmed, for next time:**
- Probation leave (1 day/month) is usable as it accrues — no lock.
- The moment an employee's **Date of confirmation** is set (on or before today), the system should credit the remaining months of the current leave year **in one lump sum**, on top of what they already accrued monthly during probation.
- The 24-days-after-2-years part needs **no new code** — it's already supported via Leave Policy service slabs (set fromMonths=0/toMonths=24 → 12 days/year, fromMonths=24 → 24 days/year, timing=Immediate).

**What's not done:** the actual engine change (reading `dateOfConfirmation` in the accrual job, switching a probationary employee from monthly accrual to a one-time remaining-months credit at confirmation) hasn't been written yet. That touches `entitlement-rules.ts` / `entitlement.service.ts` / `leave.service.ts` and needs tests — real work, not a quick edit.

**Your usage limit was reached this turn.** Nothing was implemented for this leave-credit rule beyond the design decisions above — everything from the prior turns (comp off, attendance rules, My Profile, RBAC sidebar, country-scoped document/leave types) was already committed and pushed before this. Next session, I can pick this straight up from the two confirmed answers and implement the probation→payroll crediting logic plus the service-slab policy configuration for the 2-year bump.