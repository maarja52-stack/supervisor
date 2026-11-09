# Hotel V Housekeeping App

Vite-based housekeeping quality app. The frontend stores its working state in the browser and can sync employee records, inspections, and employee/evidence photos to a bound Google Sheet and its owner's Google Drive.

## Connect a private Google account

The Apps Script endpoint verifies a Google sign-in token against one configured email before allowing any API action. Employee photo folders are kept private. Do not remove the identity verification or change the folders to public link sharing.

### 1. Create a Google Sheet and Apps Script

1. Create or open the Google Sheet that will hold the app data.
2. In the sheet, open **Extensions → Apps Script**. This creates a script bound to that sheet.
3. Replace the contents of `Code.gs` with `google-apps-script/Code.gs` from this project, then save.
4. In Apps Script **Project Settings → Script properties**, add:
   - `GOOGLE_OAUTH_CLIENT_ID`: the OAuth web client ID from step 2 below.
   - `GOOGLE_OWNER_EMAIL`: the Google account email that is allowed to use the app.
5. In the Apps Script editor, select and run `authorizeGoogleServices`. Review and grant the requested Sheets, Drive, and external-request permissions.

The script creates the `Employees`, `Room_Records`, and `Employee Photos` resources when the app first saves data.

### 2. Create a Google OAuth client ID

1. In Google Cloud Console, select or create a project and configure its OAuth consent screen. For an app in testing, add your Google account as a test user.
2. Create an OAuth client ID of type **Web application**.
3. Add the origins from which you will open the app under **Authorized JavaScript origins**. For local development, add `http://localhost:5173`. For this repository's GitHub Pages site, add `https://maarja52-stack.github.io` (do not include `/supervisor/`).
4. Copy the client ID. This client ID is public and is not an OAuth client secret.

### 3. Deploy the Apps Script API

1. In Apps Script, choose **Deploy → New deployment → Web app**.
2. Set **Execute as** to **Me**.
3. Set access to **Anyone** so the separately hosted app can reach the endpoint. The script verifies the Google identity token and only permits `GOOGLE_OWNER_EMAIL`; do not remove that check.
4. Deploy and copy the web app URL ending in `/exec`.

### 4. Configure and run the frontend

In `src/config.js`, set the two public connection values:

```js
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/your-deployment-id/exec';
export const GOOGLE_OAUTH_CLIENT_ID = 'your-client-id.apps.googleusercontent.com';
```

The repository includes a GitHub Actions workflow to publish the app at `https://maarja52-stack.github.io/supervisor/`. In the repository's **Settings → Pages**, set the build and deployment source to **GitHub Actions**. Push the configured project to `main` and wait for the **Deploy to GitHub Pages** workflow to finish.

For local development, use the authorized origin `http://localhost:5173`:

```bash
npm install
npm run dev
```

Open the app from an authorized origin and click the Google sign-in button. The app syncs changes made after sign-in; existing browser data is not automatically uploaded. Photos remain private in Drive, and the app keeps a local preview copy in that browser.

When changing `Code.gs` after deployment, update the existing Apps Script deployment to a new version. Never add an OAuth client secret, password, or Google account token to this repository.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```
