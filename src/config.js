export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwdORqHYqtFssXO-BANNYWbROeitGr1oWyfd8PsQ0kfMdyrxtzuPDOCJshv_NWyRwTj/exec';

export const googleScriptConfig = {
  url: GOOGLE_SCRIPT_URL.trim(),
  enabled: Boolean(GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim().length > 0),
};
