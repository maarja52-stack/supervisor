# Hotel V Housekeeping App

Vite-based housekeeping quality app. Working state is stored in the browser. When configured, employee changes, inspections, and photos are also sent to a Google Sheet and the owner's Google Drive through Apps Script. No Google sign-in is used.

## Google Apps Script backend

> **Public access warning:** The Apps Script API is deployed for anyone to call without signing in. Anyone who obtains the web-app URL can read and modify employee and inspection data, delete employee records and photo folders, and upload files to the owner's Drive. Do not use this setup for sensitive data. The URL is included in the public frontend and is not a secret.

1. Open the bound Apps Script project for the Google Sheet.
2. Replace its `Code.gs` with `google-apps-script/Code.gs` from this repository and save.
3. Run `authorizeGoogleServices` once in the Apps Script editor and grant the requested Sheets and Drive permissions.
4. Deploy as a **Web app**, executing as **Me**, with access set to **Anyone**. Copy the deployment URL ending in `/exec`.
5. Set `GOOGLE_SCRIPT_URL` in `src/config.js` to that `/exec` URL, then build and deploy the frontend.

The script creates `Employees`, `Room_Records`, and `Photo_Metadata` tabs, plus employee photo folders, as needed. Employee and inspection updates are synced when made in the app. Photo files are stored in Drive; their employee, file, and inspection metadata is recorded in `Photo_Metadata`. Existing browser data is not automatically backfilled to Sheets.

Whenever `Code.gs` changes, update the existing Apps Script deployment to a new version.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```
