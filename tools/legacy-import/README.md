# Import employees from the old system

`import-employees.js` reads the old system's employee JSON (the `DisplayName / FieldName / FieldValue / DropDownList`
format) and creates the employee through the application's own services, so every rule still applies.

```bash
npm run build
node tools/legacy-import/import-employees.js handover/legacy/<file>.json            # check only, nothing is saved
node tools/legacy-import/import-employees.js handover/legacy/<file>.json --commit   # create
```

- One employee per file (an array of fields), or several (an array of those arrays).
- The old employee code (for example `EA-315`) is kept. New employees of a branch with a code prefix continue after the highest number.
- The branch comes from the old **Location**, matched by name. The shift comes from **Shift**. Both must already exist.
- A login is created from `UserName` and `UserTypeId` with a generated temporary password. The old password is **not** imported.
  Temporary passwords are written to `handover/import-logins.txt` (git-ignored), never printed.
- Put the data files in `handover/legacy/` (git-ignored): they hold personal data.
- Not stored because the app has no field for it: home country phone, date of rejoining, visa type. The reporting manager
  is skipped (set it in the Employment tab once that person exists).
