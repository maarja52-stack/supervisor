export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxY4o5WgaF1ZEWr-7CIl7cDWlNMKKDNvlJB8M1UQ5xkWAEzI6gNoqWunTYvVdRHh6zZ/exec';

export const GOOGLE_OAUTH_CLIENT_ID = '252524244341-avhquqo68cgs4oncfffs1b5ng1a9atek.apps.googleusercontent.com';

export const googleScriptConfig = {
  url: GOOGLE_SCRIPT_URL.trim(),
  enabled: Boolean(GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim().length > 0),
  oauthClientId: GOOGLE_OAUTH_CLIENT_ID.trim(),
};
