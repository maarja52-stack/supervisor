# Hotel V Housekeeping App

This project is a hotel housekeeping quality-inspection prototype with a Google Apps Script backend for inspection records and employee photo albums.

## Architecture

- Frontend: Vite + JavaScript
- Quality records: Google Sheets, including checklist outcomes, score, correction notes, and inspection version
- Photo storage: Google Drive folders per employee
- Archive flow: archived employees are moved to an `Archived Employee Photos` folder
- Delete flow: employee rows are removed from `Employees` and their Drive folder is trashed

## Google Apps Script setup

1. Open Google Sheets.
2. Create a new Apps Script project.
3. Copy the contents of `google-apps-script/Code.gs` into the Apps Script editor.
4. Save and deploy as a Web App.
5. Copy the deployed URL into `src/config.js`.

Example:

```js
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/your-deployment-id/exec';
```

## Storage model

### Sheets
- `Employees` with columns:
  - id
  - name
  - startDate
  - status
  - isArchived
  - albumFolderId
  - updatedAt
- `Room_Records` with columns:
  - id
  - date
  - room
  - status
  - employeeId
  - inspector
  - percent
  - failed
  - positive
  - development
  - scored
  - possible
  - version
  - results
  - corrections
  - createdAt

### Drive folders
- Root folder: `Employee Photos`
- Per employee: `Employee Photos/<employeeId>`
- Archived employees: `Archived Employee Photos/<employeeId>`

## Archive and delete flows

- Archive employee: marks the employee as inactive and moves their folder to `Archived Employee Photos`.
- Delete employee: removes the row from Sheets and moves the Drive folder into the trash.

## Frontend integration

The app includes a Google integration wrapper in `src/googleIntegration.js` and a configuration file in `src/config.js`.

When the Google Apps Script URL is configured, the app can call:

- `listEmployees`
- `listRecords`
- `saveEmployee`
- `archiveEmployee`
- `deleteEmployee`
- `saveInspection`
- `uploadPhoto`

## Local development

```bash
npm install
npm run dev -- --host 0.0.0.0
```

## Production build

```bash
npm run build
```
