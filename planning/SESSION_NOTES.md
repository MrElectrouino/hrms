# Session notes: HRMS build (handover for working on another PC)

Written 2026-11-15. This file is the memory of the long working session so development can continue on another computer, or with a new AI session, without losing context. Read it first, then `planning/AGENTS.md`, then `planning/COMPANY_SETUP_GUIDE.md`.

> Tip for a new AI session: open the project, say "Read planning/SESSION_NOTES.md, planning/AGENTS.md and planning/PROGRESS.md, then continue from section 9".

## 1. What this project is

A generic, multi-country HRMS being built to replace a legacy .NET / SQL Server system.

| Layer | Technology |
|---|---|
| Backend | NestJS 12 (ESM only), TypeScript, class-validator, `@nestjs/schedule` cron jobs, exceljs |
| Database | PostgreSQL (dev dump made with 18.6), Prisma 7 with `@prisma/adapter-pg` |
| Frontend | Next.js 16 (pages router), React 19, Tailwind 3 |
| Tests | Jest (164 unit tests). Run with `npm test`, not bare `jest` |

Ports: API `http://localhost:3000/api/v1`, frontend `http://localhost:3001`.
Local database: `hrms` on `localhost:5432`. Postgres lives at `E:\Installed\DB` on the home PC (tools in `E:\Installed\DB\bin`).

## 2. Working rules the user set (keep following them)

- Follow `planning/AGENTS.md`. The legacy repo and the legacy/UAT database are read-only references. Only the local development database may be changed.
- Do not invent business logic or policy numbers. Ask. (Example: leave rules wait for the user's policy answers.)
- Confirm before destructive database changes (drops, deletes). Local dev database only, never a real one.
- **Do not change the existing UI/UX.** New screens must look like the existing ones (cards, tables, Drawer, blue palette).
- One Save button per form. The user dislikes a Save per row.
- Merge related screens rather than adding new menu items (the user asked for System settings with side tabs, Masters merged, and so on).
- Keep language plain; the user is not deeply technical.
- Never commit `frontend/package-lock.json` or `frontend/next-env.d.ts` changes unless asked.
- The user could not push to a remote. Work is committed locally on `master`. A zip, a git bundle and a database dump are the way to carry it between PCs (see section 10).

## 3. How to run it (short version; the long version is the setup guide)

```bash
npm install
cd frontend && npm install && cd ..
# create .env (see COMPANY_SETUP_GUIDE.md part A), then:
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed          # creates reference data + the System Admin (password printed once)
npm run start:dev            # API on :3000
cd frontend && npm run dev   # UI on :3001
```

Important: the backend and `prisma.config.ts` read `DATABASE_URL_UNPOOLED`, not `DATABASE_URL`. Set both to the same value locally.

## 4. What is built

### Employee and profile
- Nine-section employee profile, country-aware fields (India, UAE, UK, US layouts are in code: `src/employee-profile/profile-schema.ts`).
- Admin-controlled profile rules per country (show/hide/require tabs, groups, fields): System settings is not where it lives, it is the Profile rules page.
- Custom fields, salary templates, dependants, document types with an optional expiry flag.
- Dropdowns come from Parameters (department, employee type with code prefix, gender, marital status, blood group, roster group, notice reason, emergency relationship, mood and more).
- Employee code is generated from the employee type's code prefix (`PRM-0001`).

### Administration and System settings
- System settings page (System Admin only) with a side tab list: **Company**, **Countries**, **Branding**, **Attendance configuration**, **Leave configuration**, **Security**.
  - Company: name, legal name, trade licence number/authority/expiry, registration number, tax number, address, phone, email, website. The licence expiry date notifies the System Admin within 60 days.
  - Countries: the country list (a real table). One country is the **Default**. Everything country-related picks from it.
  - Branding: name, logo, favicon, colours, login text, footer, plus time format and number format.
  - Security: failed-login limit, lockout minutes, session timeout.
- Branches: a real table (`branches`) with country, optional timezone, address, city, phone, email. Screen: Administration, Branches.
- Masters: Sites, Languages, Shifts, Document Types, and Parameters.
- Users, Menus and Rights (merged screen), Modules switches, Salary templates.

### Attendance (generic, policy driven, works for any country)
- Policies (assigned by employee, branch or country, versioned), one shared status list, punches, IP/GPS/address capture, mood log, work schedules (fixed or flexible), rosters with Excel import, holiday calendars by company/country/branch with an editable order, Ramadan periods per country, regularization (correction) requests with approval, reports, a nightly processing job (`@Cron 02:00`), late/half-day/short-hours/overtime rules.
- **Weekly off templates** (Attendance setup, Weekly off): a table of named day sets (0 = Sunday ... 6 = Saturday) with optional alternate rules per weekday: off only in chosen weeks of the month (1st to 5th, last), or every other week from a date (`rules` JSON, logic in `src/attendance-setup/weekly-off.util.ts`). Given to employees on the profile (Attendance & Leave, Weekly off) or in Bulk update; stored as effective-dated rows (`employee_weekly_offs`) so history is kept. In day resolution a roster entry beats a roster pattern, which beats the template (`roster.source = 'TEMPLATE'`). Weekly off days are not marked absent and count in the leave sandwich rule. The old "Weekly Off" dropdown values were converted into templates and the parameter removed.
- Pure rule code with tests: `src/attendance/attendance-rules.ts`, `hours-rules.ts`.
- Timezone order: branch timezone, then branch country, then employee country, then Default Country, then UTC.

### Leave
- Leave types (create, edit, delete when unused), sandwich rule, leave year start month, comp-off, credit buckets with expiry (earliest expiry used first), ledger, accrual job (`@Cron 02:30`), applications with stored day-by-day calculation, approval recalculation, HR balance adjustments.
- **Leave policies** (Administration, Leave policies): scope by country, branch, employee type or one employee; effective dates; statutory and company layers (employee gets the higher); per leave type: days per year, upfront or monthly credit, proration (none, completed months, started months, cut-off day, exact days), rounding (7 modes plus tie rule), min/max, service slabs with immediate or next-year timing. Used policies are locked (end them and start a new one). Accrual uses a covering policy, else the leave type's own setting.
- Pure rules with tests: `src/leave/leave-rules.ts`, `entitlement-rules.ts`.

### Bulk update (Administration, Bulk update)
- Pick branches (multi-select) and employees, tick the fields to change, review, apply. Same value for every chosen employee, audited (`EMPLOYEE_BULK_UPDATE`), each employee saved on its own, skips are reported.
- Only group-friendly fields: branch, department, designation, grade, reporting manager, work location, cost centre, employee category, employment type, shift, attendance applicable/processing, roster group, weekly off, OT configuration. Definitions: `src/bulk-update/bulk-fields.ts` (add a field there to offer it).
- Also fixed: saving the Organization section now keeps `employees.reportingToId` in step with the Reporting manager field (manager and team screens, leave approval and the dashboard read that column).

### Dashboard and notifications
- Home page keeps the original design. Live data by role: employee (own day, balances, next leave), manager (team today, approvals waiting), HR/System Admin (everyone in the selected branches, documents expiring). Employee Overview chart = real headcount for six months; Department Distribution real.
- Notification bell + Recent Activities: leave and correction decisions, approvals waiting, expiring leave balance, expiring documents, licence expiry (System Admin).

### Security
- Writes limited to HR/System Admin; employee and document reads scoped; branch access enforced (header branch switcher sends `X-Branch-Id`).
- A signed-out visitor is redirected to `/login` from every page (`components/Layout.tsx`, `PUBLIC_PATHS`).

## 5. Where things live

| Area | Backend | Frontend |
|---|---|---|
| Dashboard | `src/dashboard/` | `pages/index.tsx`, bell in `components/Layout.tsx`, `lib/dashboard-api.ts` |
| System settings | `src/system-admin/` | `pages/system-settings.tsx`, `components/settings/*Panel.tsx` |
| Branches | `src/branches/` | `pages/branches.tsx` |
| Attendance | `src/attendance/`, `src/attendance-setup/` | `pages/attendance/*`, `pages/attendance-setup.tsx`, `components/attendance/*`, `components/settings/AttendanceConfigPanel.tsx` |
| Leave | `src/leave/` | `pages/leave/*`, `pages/leave-policies.tsx`, `components/settings/LeaveConfigPanel.tsx` |
| Profile | `src/employee-profile/` | `pages/employee-profile/*`, `pages/profile-rules.tsx` |
| Guards | `src/common/guards/` | |
| Seed | `prisma/seed.ts`, `prisma/seed-demo.mjs` (14 demo people, local only, password `Demo@12345`, `--remove` to delete) | |

Design notes live in `planning/attendance_marking_plan.md` and `planning/leave_entitlement_requirements.md` (the 17 business questions in its section 13 are the pending input from the user).

## 6. State of the local database when this was written

- Users: only `admin` (System Admin). Demo people were removed.
- Branches: 9 migrated starter branches (Pune HQ, Bengaluru, Chennai, Dubai Office, Abu Dhabi, London, Manchester, Austin HQ, New York) with **no country set**. Departments: 8 starter parameters.
- Empty on purpose: countries, document types, leave types, attendance policies, leave policies, holiday calendars, employees.
- Starter data that survives a fresh `migrate deploy` + seed: parameters/dropdowns, messages, user types, roles, menu items (old ones, see gaps), module switches, system settings 26, 30, 32 to 46 (Default Country, time format, number format, security, company details), the 20 languages, 4 sites, 4 shifts, attendance status list, branches and departments from migrations.
- A dump of this database is in the handover folder (see section 10).

## 7. Decisions made in this session (most recent last)

1. One status list for attendance for all countries; country differences are policies, not code.
2. Attendance and leave setup moved under Administration / System settings.
3. Branches, departments and other dropdowns moved into Parameters, then (later) branches became their own table because they need a country and timezone.
4. Countries Page removed, then a **countries table kept as the master country list**, managed under System settings, Countries; Default Country is chosen there.
5. Regional settings tab removed: timezone/currency/language/date format live on each country; time and number format moved to Branding.
6. Profile rules choose the country from the country list.
7. Starter data (attendance policies, leave types, document types, countries) removed so each company creates its own; delete buttons added where missing.
8. Legacy planning documents deleted (still in git history: `git show 5f7df40:planning/<file>`).
9. Seed creates the System Admin (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, else a random password printed once and a forced change at first login). The `scripts/` folder was removed.
10. Payroll is parked for later discussion.

## 8. Known gaps and open items

- Leave rules still needed from the user (see `leave_entitlement_requirements.md` section 13): UAE annual leave formula, other UAE leave types and days, credit method. Answers given so far: UAE, calendar year, proration by completed months, no rounding, leave usable in probation, carry forward everything, pay accrued days at exit. Not built yet: probation lock, carry-forward/lapse/encashment, exit settlement, leave across two leave years, policy-change recalculation, rejoin and transfer.
- Special periods by shift (Ramadan, summer hours): today only Ramadan per country plus one alternate start/end per shift. A "Special periods" list with per-shift times and required hours was offered, not built.
- Excel import for employees (columns were proposed, not confirmed).
- Profile layouts exist only for IN, AE, GB, US. Another country falls back to the India layout.
- Employee "Country of employment" does not follow the branch's country.
- Old menu items in the seed point at pages that no longer exist (`/profilelist`, `/documentlist`, `/myprofile`). Clean up with the seed review items: sites seed, old menu tree.
- Users list, reporting-manager list and dashboard employee counts are not branch scoped for non-HR.
- Several seeded values from the legacy system remain in Parameters. README.md is outdated (still says discovery phase).
- Time format, number format, language and date format settings are stored but not yet applied by the screens.
- The Default Country dropdown and the company details are not yet shown in the header or login page.
- Nothing has been verified in a browser by the AI (it cannot log in). All screens were checked by typecheck, unit tests and scripted runs against the real database. Walk through them with an employee, a manager and an HR login.

## 9. Suggested next steps

1. Restore the dump (or start fresh with the seed), start both servers, log in as `admin`.
2. Follow `COMPANY_SETUP_GUIDE.md` to configure the company; fix anything that looks wrong.
3. Send the leave answers to build probation, year-end and exit rules.
4. Decide: Special periods by shift, Excel employee import, branch scoping gaps, README refresh.

## 10. Carrying the work to another PC

The handover folder (`handover/`, git-ignored) contains:

- `hrms_db_<timestamp>.sql` plain SQL dump of the local database.
- `hrms_code_<timestamp>.zip` the code without `node_modules`, builds and caches (includes `.git`, so the commit history comes along).
- `hrms_<timestamp>.bundle` the full git history as one file, an alternative to the `.git` folder.
- copies of these two notes.

**Not included on purpose: `.env` and `frontend/.env.local`.** They hold secrets. Copy them by hand. If you lose them, recreate them with the guide, but note: **`PII_ENC_KEY`, `PII_ENC_KEY_ID` and `PII_HASH_PEPPER` must be the same ones used when the data was written**, otherwise encrypted personal data in a restored database cannot be read. The current dump has no employees, so a new key is fine for it.

To use the git bundle on the other PC:

```bash
git clone hrms_<timestamp>.bundle hrms
cd hrms && git log --oneline | head
```

To restore the database on the other PC (Postgres 16+ installed; the dump was made with 18.6, so use a psql of the same or a newer version):

```bash
createdb -U postgres hrms
psql -U postgres -d hrms -f hrms_db_<timestamp>.sql
```

## 11. Gotchas learned the hard way

- The AI's shell tool breaks on long heredocs containing quotes: write files with the editor tool and run small scripts.
- Jest needs `npm test` (ESM flag). Plain `jest` fails with "Must use import to load ES Module".
- Many source files use CRLF; keep line endings when scripting edits.
- `npx nest build` can take over a minute; kill stuck node scripts that never exit (call `process.exit(0)` at the end).
- Prisma migrations were generated with `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`, then hand-ordered when data had to be copied (see the branches migration).
- Applied migration files must not be edited. Add a new migration instead.
- Real-database smoke scripts in this project always create temporary rows and delete them afterwards.
