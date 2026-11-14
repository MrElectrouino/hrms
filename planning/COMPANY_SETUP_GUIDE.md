# Company setup guide

A step by step guide to install the HRMS on a computer and configure it for one company. Written from what the application does today (2026-11-15). Where something is not built yet, it says so.

Who does what: **System Admin** can open every screen below. **HR Admin** can open Administration, Attendance setup, Branches, Masters, Users, Menus & rights and Leave policies, but not System settings.

---

## Part A. Install on a new computer

### A1. What you need

| Software | Version | Notes |
|---|---|---|
| Node.js | 24 (22 works) | `node -v` |
| PostgreSQL | 16 or newer | A dump made with 18.x restores best on 18.x |
| Git | any | optional, for the history |

### A2. Get the code

- From the zip: unzip it to a folder, for example `E:\Nodejs\hrms`.
- From the git bundle: `git clone hrms_<date>.bundle hrms`.

### A3. Install packages

```bash
cd hrms
npm install
cd frontend
npm install
cd ..
```

### A4. Create the database

```bash
createdb -U postgres hrms
```

Or in pgAdmin: right-click Databases, Create, name it `hrms`.

### A5. Create the settings file `.env`

Copy `.env.example` to `.env` in the project root and fill it. These are the values that matter:

| Name | Example / how to get it |
|---|---|
| `NODE_ENV` | `development` |
| `PORT` | `3000` |
| `DATABASE_URL` | `postgresql://postgres:YOURPASSWORD@localhost:5432/hrms` |
| `DATABASE_URL_UNPOOLED` | **the same value as DATABASE_URL.** The application and the seed read this one |
| `JWT_SECRET` | at least 32 random characters. The server refuses to start without it |
| `JWT_ACCESS_TTL` | `15m` |
| `REFRESH_TTL_DAYS` | `14` |
| `PII_ENC_KEY_ID` | `k1` |
| `PII_ENC_KEY` | 32 random bytes, base64. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `PII_HASH_PEPPER` | any long random text |
| `CORS_ORIGIN` | `http://localhost:3001` |
| `FRONTEND_BASE_URL` | `http://localhost:3001` (used in password reset links) |
| `APP_TIMEZONE` | `Asia/Dubai` (or your business timezone) |
| `DOCUMENT_STORAGE_PATH` | `./private-storage/documents` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | for password-reset email. Leave `SMTP_HOST` empty in development and the email is written to the log instead |

Keep the PII values safe. They encrypt national ID numbers and similar personal data. **If you lose them, that data in any existing database can no longer be read.**

### A6. Point the frontend at the API

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

### A7. Create the tables and starter data

```bash
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
```

The seed creates the reference data and the **System Admin**:

- Username `admin` (change it with `ADMIN_USERNAME`).
- Password: set `ADMIN_PASSWORD` before running (8 to 128 characters with upper, lower, a digit and a special character), or the seed prints a random one **once**. Write it down. A generated password must be changed at first login.

```bash
# example with a chosen password (PowerShell)
$env:ADMIN_PASSWORD = "Choose-A-Strong1!"; npm run prisma:seed
```

If you restored a database dump instead (part F), skip A7: the tables and the admin already exist.

### A8. Start it

Two terminals:

```bash
npm run start:dev          # API, http://localhost:3000/api/v1
cd frontend && npm run dev # website, http://localhost:3001
```

Open `http://localhost:3001`, sign in as `admin`. If you are not signed in, every page sends you to the login page.

---

## Part B. Configure the company

Do these in order. Each step needs the ones before it.

### B1. System settings (System Admin)

Open **System Settings → General settings**. The sections are a list down the left.

1. **Company.** Fill in Company Name, Legal Name, Trade Licence Number, Issuing Authority and **Trade Licence Expiry Date**, Company Registration Number, Tax Registration Number, address, phone, email, website. Click **Save** (one button for the whole section). The System Admin is reminded in the notification bell when the licence is within 60 days of expiry.
2. **Countries.** Add every country you have staff in: ISO code (two letters), name, currency, default timezone (for example `Asia/Dubai`, `Asia/Kolkata`), language, date format. Then click **Make default** on your main country. Profile layouts exist for India (IN), UAE (AE), UK (GB) and US (US). Any other country works for branches and policies but its employee profile uses the India layout.
3. **Branding.** Application name, logo, favicon, three colours, login page text, footer text, **time format** and **number format**. One Save.
4. **Security.** Failed login limit, lockout minutes, session timeout (minutes). Password rules are fixed: at least 8 characters with upper, lower, digit and special.
5. Leave **Attendance configuration** and **Leave configuration** for steps B6 and B7.

### B2. Branches (Administration, Branches)

Add each place the company works from. For each: name, code (short, unique), **country** (from your list), optional timezone (leave empty to use the country's), address, city, phone, email.

- The nine starter branches (Pune HQ, Bengaluru, Chennai, Dubai Office, Abu Dhabi, London, Manchester, Austin HQ, New York) came from the migrations. Edit them to match your company, set their country, switch off or delete the rest. A branch that has employees, users, calendars or policies can only be switched off.
- Example for a company with one office in India and one in Dubai: create "India" (country India) and "Dubai" (country UAE, timezone Asia/Dubai).

### B3. Masters (Administration, Masters)

- **Parameters.** These are the dropdown lists. Review and edit: **Department** (replace the 8 starters), **Employee Type** (the **code** of each type is the prefix of employee codes: code `PRM` gives `PRM-0001`), Gender, Marital Status, Blood Group, Roster Group, Notice Reason, Relationship (emergency contact), Mood, and the rest. Hide values you do not want rather than deleting.
- **Shifts.** Name, start and end time, grace minutes for late, half-day minutes, optional alternate start/end (used in special periods such as Ramadan).
- **Document Types.** Create your own (Passport, Visa, National ID, Licence and so on). Tick the **has expiry** option on any type that expires: the issue and expiry dates then become required on documents of that type, and expiry reminders work.
- **Sites** and **Languages**: old lists kept for the profile. Edit as needed.

### B4. Profile configuration (System Settings menu)

- **Profile rules.** Pick a country at the top, then choose which tabs, groups and fields show and which are required. Fields marked "default" follow the built-in layout. Save, or Reset to defaults.
- **Custom fields.** Add your own fields to the employee profile (text, number, date, single or multiple choice and so on) for all countries or one.
- **Salary templates** (Administration). Pay component templates per country, used in the profile's Compensation tab.

### B5. Users and access (Administration)

1. **Users.** Create accounts for HR Admins, Managers and Executives. A user is linked to a person (profile). Choose the user type: Executive, Manager, System Admin or HR Admin. Give an HR Admin access to **all branches** or only chosen branches.
2. **Menus & rights.** Adjust which menu items each user type (or a single user) can open.
3. **Modules** (System Admin). Switch modules on or off. Leave and Attendance are on. Payroll and the others are not built.

### B6. Attendance (Administration, Attendance setup, and System settings, Attendance configuration)

Start with **Attendance setup**:

1. **Work schedules.** Required hours per day, fixed or flexible start, break rules.
2. **Holiday calendars.** Create a calendar per company, per country or per branch (for example one for the India branch, one for the Dubai branch). Add holidays one by one or with the Excel import. Use **Save order** to decide which calendar wins when several apply.
3. **Roster.** Repeating shift patterns (weekly offs and shifts per weekday) and Excel import of dated rosters.
4. **Assignments.** Give each employee a schedule, roster and calendar (or assign in bulk).

Then **System settings → Attendance configuration**:

5. **Policies.** The starter policies were deleted. Create your own, for example one for India and one for the UAE. A policy sets: late and half-day rules, whether employees may mark past dates themselves, a cut-off time, whether HR is exempt, whether managers may edit only unapproved days, whether approval is required, the Ramadan alternate shift start, short hours, overtime. Use **Assign** to attach a policy to a country, a branch or one employee. The most specific assignment wins (employee, then branch, then country). **Until a policy applies to an employee, that employee cannot mark attendance.**
6. **Periods.** Ramadan (special) periods per country.
7. **Settings.** Company-wide attendance settings. **Statuses.** Names and colours of the attendance statuses (one list for all countries).
8. **Processing.** Runs the nightly job on demand. It also runs by itself at 02:00.

Timezone rule: the branch's own timezone, then the branch's country, then the employee's country, then the Default Country, then UTC.

### B7. Leave (System settings, Leave configuration, and Administration, Leave policies)

1. **Leave configuration → leave types.** The starters were deleted. Add your types (Annual, Sick, Casual, Unpaid and so on): paid or not, tracks a balance or not, half-day allowed, negative balance allowed, document needed (and after how many days), maximum days per request, takes part in the sandwich rule, is comp-off. A type that has been used cannot be deleted, only switched off.
2. **Leave configuration → settings.** Leave year start month, the sandwich rule (weekly offs and holidays, both sides or either side), and comp-off (credit days, expiry days, minimum minutes worked).
3. **Leave policies** (Administration). Create a policy per group of people: who it applies to (country, branch, employee type or one employee), start and end dates, statutory or company, and for each leave type the days per year, whether credited upfront or monthly, how joiners part-way through the year are prorated, rounding, minimum and maximum, and optional length-of-service slabs. The "Check an employee" box shows which policy applies and how the days were worked out, without saving anything. A policy that has produced entitlements is locked: end it and start a new one to change a rule.
4. **Credits are created by the nightly accrual job** (02:30) or manually from Leave configuration (Run accrual). Running it twice does not double-credit.

Not built yet: probation lock, carry-forward, lapse and encashment at year end, exit settlement, leave across two leave years. These wait for the business answers in `planning/leave_entitlement_requirements.md`, section 13.

### B8. Add employees

Employees → Add employee (the full profile form). Choose the **employee type** (this makes the employee code), the **branch**, the **country of employment** (this chooses the profile layout), reporting manager, shift, dates, and the rest. Then create the employee's **user account** (B5) so they can log in. An Excel import for employees is not built yet.

---

## Part C. Check it before going live

Log in as each kind of user and test:

| Login | Check |
|---|---|
| Employee | Dashboard shows own day and leave. Mark attendance (IN, then OUT). Apply for leave and see the day count. |
| Manager | Team attendance. Approve a correction request. Approve or reject team leave. |
| HR Admin | Branch switcher limits what is shown. Add an adjustment in Leave, Balances. Reports. |
| System Admin | System settings sections save. Notification bell shows licence expiry when due. |

Also check: a holiday shows as a holiday on the attendance and leave calendars, a late mark follows the policy, the nightly job run (Attendance configuration, Processing) marks absent days.

---

## Part D. Backups

Make a backup before any big change and at least daily in production.

```bash
# Windows, tools in the Postgres bin folder
"E:\Installed\DB\bin\pg_dump.exe" -U postgres -h localhost -d hrms -f hrms_backup.sql
```

Also copy `private-storage/` (uploaded documents and logos) and your `.env`.

## Part E. Restore

```bash
createdb -U postgres hrms_restore
psql -U postgres -d hrms_restore -f hrms_backup.sql
```

Point `DATABASE_URL` and `DATABASE_URL_UNPOOLED` at the restored database. Then run `npx prisma migrate deploy` so any newer migrations are applied.

## Part F. Updating the application

1. Take a backup.
2. Put the new code in place, run `npm install`.
3. `npx prisma migrate deploy` then `npx prisma generate`.
4. Rebuild and restart the API (`npm run build`, `npm run start:prod`) and the frontend (`cd frontend && npm run build && npm start`).

Never edit a migration that has already been applied. Add a new one.

---

## Part G. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Server stops at start with "JWT_SECRET must be set" | `.env` missing or the secret shorter than 32 characters |
| Database errors on start | `DATABASE_URL_UNPOOLED` not set (the app reads that one) |
| Login page on every page | You are signed out. Sign in again |
| "Your account is not linked to an active employee record" on Mark attendance | The `admin` account is not an employee. Use an employee login, or link the account to an employee |
| "No attendance policy applies to this employee" | Create a policy and assign it to the employee's country, branch or the employee (B6) |
| Leave policy preview says no policy covers the employee | Check scope and dates; employee type and country come from the employee's profile (Organization tab) |
| Default Country dropdown is empty | Add the country first (B1, Countries) |
| Branch country dropdown is empty | Same: add countries first |
| Page shows old data after a code change | Restart the API (and the frontend dev server) |
| Tests fail with "Must use import to load ES Module" | Run `npm test`, not `jest` |
| A profile field is missing for a country | Check Profile rules for that country; it may be hidden |

## Part H. Not built yet (so you are not surprised)

Payroll, Reports menu, leave carry-forward / encashment / exit settlement and probation rules, special periods by shift, Excel import of employees, applying the time and number format on screens, profile layouts for countries other than IN, AE, GB and US.
