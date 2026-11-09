import { googleScriptConfig } from './config.js';

const getUrl = () => googleScriptConfig.url;

export async function callGoogleScript(action, payload = {}) {
  const url = getUrl();

  if (!url) {
    return {
      ok: false,
      mode: 'local-only',
      message: 'Google Apps Script URL is not configured yet.',
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
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

export async function archiveEmployeeInGoogle(employeeId, isArchived = true) {
  return callGoogleScript('archiveEmployee', { employeeId, isArchived });
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
