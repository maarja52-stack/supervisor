export const GOOGLE_SCRIPT_URL = '';
export const GOOGLE_OAUTH_CLIENT_ID = '';

export const googleScriptConfig = {
  url: GOOGLE_SCRIPT_URL.trim(),
  enabled: Boolean(GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim().length > 0),
  oauthClientId: GOOGLE_OAUTH_CLIENT_ID.trim(),
};
