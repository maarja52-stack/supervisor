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

  const requestId = crypto.randomUUID();
  const targetName = `hotel-v-google-${requestId}`;
  const iframe = document.createElement('iframe');
  iframe.name = targetName;
  iframe.title = 'Google Apps Script response';
  iframe.hidden = true;

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  form.target = targetName;
  form.hidden = true;

  for (const [name, value] of Object.entries({
    request: JSON.stringify({ action, payload }),
    requestId,
  })) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.append(input);
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timeout);
      form.remove();
      iframe.remove();
    };

    const onMessage = (event) => {
      if (event.data?.requestId !== requestId) return;

      cleanup();
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data.result);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Google Apps Script did not return a response. Check that the latest backend version is deployed.'));
    }, 30000);

    window.addEventListener('message', onMessage);
    document.body.append(iframe, form);
    try {
      form.submit();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

export async function getEmployeesFromGoogle() {
  return callGoogleScript('listEmployees');
}

export async function getRecordsFromGoogle() {
  return callGoogleScript('listRecords');
}

export async function getSnapshotFromGoogle() {
  return callGoogleScript('getSnapshot');
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
    getSnapshotFromGoogle,
    saveEmployeeToGoogle,
    archiveEmployeeInGoogle,
    deleteEmployeeInGoogle,
    saveInspectionToGoogle,
    uploadEmployeePhoto,
  };
}
