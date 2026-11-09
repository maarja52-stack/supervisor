import { googleScriptConfig } from './config.js';

const getUrl = () => googleScriptConfig.url;
let identityToken = '';
let identityApiPromise;

export function setGoogleIdentityToken(token) {
  identityToken = token;
}

export function clearGoogleIdentityToken() {
  identityToken = '';
}

export function loadGoogleIdentityApi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (identityApiPromise) return identityApiPromise;

  identityApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      identityApiPromise = null;
      reject(new Error('Could not load Google Sign-In.'));
    };
    document.head.append(script);
  });

  return identityApiPromise;
}

export async function callGoogleScript(action, payload = {}) {
  const url = getUrl();

  if (!url) {
    return {
      ok: false,
      mode: 'local-only',
      message: 'Google Apps Script URL is not configured yet.',
    };
  }
  if (!identityToken) {
    return {
      ok: false,
      mode: 'unauthenticated',
      message: 'Sign in with your Google account to connect Drive.',
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload, identityToken }),
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script request failed: ${response.status}`);
  }

  return response.json();
}

export async function getEmployeesFromGoogle() {
  return callGoogleScript('listEmployees');
}

export async function getRecordsFromGoogle() {
  return callGoogleScript('listRecords');
}

export async function saveEmployeeToGoogle(employee) {
  return callGoogleScript('saveEmployee', employee);
}

export async function archiveEmployeeInGoogle(employeeId) {
  return callGoogleScript('archiveEmployee', { employeeId });
}

export async function deleteEmployeeInGoogle(employeeId) {
  return callGoogleScript('deleteEmployee', { employeeId });
}

export async function saveInspectionToGoogle(inspection) {
  return callGoogleScript('saveInspection', inspection);
}

export async function uploadEmployeePhoto(photo) {
  return callGoogleScript('uploadPhoto', photo);
}

export function registerGoogleSync() {
  window.HotelVGoogle = {
    callGoogleScript,
    getEmployeesFromGoogle,
    getRecordsFromGoogle,
    saveEmployeeToGoogle,
    archiveEmployeeInGoogle,
    deleteEmployeeInGoogle,
    saveInspectionToGoogle,
    uploadEmployeePhoto,
  };
}
