# Hotel V Housekeeping App

Vite-based housekeeping quality app. Working state is stored in the browser. When configured, employee changes, inspections, and photos are also sent to a Google Sheet and the owner's Google Drive through Apps Script. No Google sign-in is used.

## Google Apps Script backend

> **Public access warning:** The Apps Script API is deployed for anyone to call without signing in. Anyone who obtains the web-app URL can read and modify employee and inspection data, delete employee records and photo folders, upload files to the owner's Drive, and view uploaded photos. Do not use this setup for sensitive data. The URL is included in the public frontend and is not a secret.

1. Open the bound Apps Script project for the Google Sheet.
2. Replace its `Code.gs` with `google-apps-script/Code.gs` from this repository and save.
3. Run `authorizeGoogleServices` once in the Apps Script editor and grant the requested Sheets and Drive permissions.
4. Deploy as a **Web app**, executing as **Me**, with access set to **Anyone**. Copy the deployment URL ending in `/exec`.
5. Set `GOOGLE_SCRIPT_URL` in `src/config.js` to that `/exec` URL, then build and deploy the frontend.

The script creates `Employees` (including starting date and contract type), `Employee_Archive`, `Room_Records`, `Photo_Metadata`, and `App_Settings` tabs, plus employee photo folders, as needed. Archiving moves the employee's row from `Employees` to `Employee_Archive`; restoring moves it back. Existing rows marked archived are moved when the API is opened or employee data is listed. New employee profiles can be added from the Employees page with a starting date and a permanent, fixed-term, or on-call contract type. Employee, inspection, and supervisor settings are synced through Google when changed, and the app loads the shared employee, inspection, photo, and supervisor data from Google when it opens. Uploaded photos are shared as "anyone with the link" so the app can display them on other devices without Google sign-in. Existing browser data is not automatically backfilled to Sheets.

Supervisor names can be edited in the app's Settings page. The shared roster is stored in the `App_Settings` sheet tab and is loaded on every device.

The Reports page lets you choose any employee (including archived employees) and date range, defaults to the previous six months, and summarizes matching inspections. Use **Print / Save as PDF**, then choose **Save as PDF** in the browser's print dialog to save or print the report.

The inspection form shows each room's category and standard cleaning time: Comfort 30 minutes, Superior 40 minutes, and Suite 50 minutes. Enter the actual minutes spent to see whether the room was over or under its standard. The room category, standard, and entered time are saved with the inspection, synced through Google, and shown in inspection history and employee reports. Reports total the recorded minutes over and under standard; inspections without a time entry are excluded from those totals.

The frontend submits through a hidden form/iframe so it can receive Apps Script responses without browser CORS blocking. Whenever `Code.gs` changes, update the existing Apps Script deployment to a new version.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```
