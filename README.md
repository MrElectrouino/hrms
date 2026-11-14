# HRMS Modernization — New Project Workspace

This repository is the **new home** for the HRMS modernization project. It is kept strictly
separate from the legacy repository (`D:\.net\hrms`), which remains a **read-only reference**.

## Current status

Implementation is well under way. Built: employee profile, administration and system settings, branches and countries, attendance, leave (types and entitlement policies), dashboard and notifications. Payroll is not started.

Start here:

- `planning/SESSION_NOTES.md` : what is built, decisions, known gaps, how to carry the work to another PC.
- `planning/COMPANY_SETUP_GUIDE.md` : install and configure the application for a company.
- `planning/AGENTS.md` : mandatory rules for AI coding agents.

## Technology

| Layer | Technology |
|---|---|
| Backend | NestJS 12 (TypeScript, ESM), Prisma 7 |
| Database | PostgreSQL |
| Frontend | Next.js 16 (pages router), React 19, Tailwind 3 |
| Tests | Jest (`npm test`) |

## Directory layout

```
src/               NestJS API (one folder per module)
prisma/            schema, migrations, seed
frontend/          Next.js website
planning/          living project documents
  AGENTS.md          rules for AI coding agents
  PROGRESS.md        status log
  TASKS.md           task backlog
  DECISIONS.md       decision records
  SESSION_NOTES.md   handover notes
  COMPANY_SETUP_GUIDE.md  install and company setup
  attendance_marking_plan.md, leave_entitlement_requirements.md, system_application_module.md  design notes
```

## Golden rules (see `planning/AGENTS.md` for full text)

1. Legacy code in `D:\.net\hrms` is **read-only** — never modify, refactor, or format it.
2. The UAT SQL Server database is **read-only** — SELECT and metadata access only, never writes, never execute stored procedures.
3. No implementation work before architecture, scope, and migration strategy are reviewed and approved.
4. Every claim about existing behavior must cite source evidence; mark unverified behavior as open questions.
