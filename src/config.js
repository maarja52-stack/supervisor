export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxY4o5WgaF1ZEWr-7CIl7cDWlNMKKDNvlJB8M1UQ5xkWAEzI6gNoqWunTYvVdRHh6zZ/exec';

export const googleScriptConfig = {
  url: GOOGLE_SCRIPT_URL.trim(),
  enabled: Boolean(GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim().length > 0),
};
