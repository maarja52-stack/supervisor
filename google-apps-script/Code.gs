const EMPLOYEE_HEADERS = ['id', 'name', 'startDate', 'contractType', 'status', 'isArchived', 'albumFolderId', 'updatedAt'];

function doGet() {
  const sheets = getEmployeeSheets_();
  migrateArchivedEmployees_(sheets);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'Housekeeping API is live.' })).setMimeType(ContentService.MimeType.JSON);
}

function authorizeGoogleServices() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Open this Apps Script project from its Google Sheet.');
  }

  const driveName = DriveApp.getRootFolder().getName();
  return { spreadsheet: spreadsheet.getName(), drive: driveName };
}

function doPost(e) {
  const requestId = e && e.parameter && e.parameter.requestId ? e.parameter.requestId : '';
  const formRequest = e && e.parameter && e.parameter.request ? e.parameter.request : '';
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '';
    const request = formRequest
      ? JSON.parse(formRequest)
      : body
        ? JSON.parse(body)
        : {};
    const action = request.action || 'listEmployees';
    const data = request.payload || {};
    let result;

    switch (action) {
      case 'listEmployees':
        result = listEmployees();
        break;
      case 'listRecords':
        result = listRecords();
        break;
      case 'saveEmployee':
        result = saveEmployee(data);
        break;
      case 'archiveEmployee':
        result = archiveEmployee(data.employeeId, data.isArchived);
        break;
      case 'deleteEmployee':
        result = deleteEmployee(data.employeeId);
        break;
      case 'saveInspection':
        result = saveInspection(data);
        break;
      case 'uploadPhoto':
        result = uploadEmployeePhoto(data);
        break;
      default:
        result = { ok: false, message: 'Unknown action: ' + action };
    }

    return formRequest
      ? htmlResponse({ requestId, result })
      : jsonResponse(result);
  } catch (error) {
    const message = error && error.message ? error.message : 'Request failed.';
    return formRequest
      ? htmlResponse({ requestId, error: message })
      : jsonResponse({ ok: false, message });
  }
}

function htmlResponse(value) {
  const message = JSON.stringify(value).replace(/</g, '\\u003c');
  return HtmlService
    .createHtmlOutput('<!doctype html><script>window.parent.postMessage(' + message + ', "*");</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  const existing = sheet.getDataRange().getValues();
  const existingHeaders = existing[0] || [];
  if (!existingHeaders.some((header) => String(header || '').trim())) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const missingHeaders = headers.filter((header) => !existingHeaders.includes(header));
    if (missingHeaders.length) {
      sheet.getRange(1, sheet.getLastColumn() + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    }
  }

  return sheet;
}

function ensureFolders() {
  const root = DriveApp.getRootFolder();
  const folders = root.getFoldersByName('Employee Photos');
  const mainFolder = folders.hasNext() ? folders.next() : root.createFolder('Employee Photos');
  return {
    root,
    mainFolder,
  };
}

function ensureEmployeeFolder(employeeId, displayName) {
  const { mainFolder } = ensureFolders();
  let folder = null;
  const iterator = mainFolder.getFoldersByName(employeeId);
  if (iterator.hasNext()) {
    folder = iterator.next();
  } else {
    folder = mainFolder.createFolder(employeeId);
    folder.setDescription(displayName || employeeId);
  }
  folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  return folder;
}

function listEmployees() {
  const sheet = ensureSheet('Employees', EMPLOYEE_HEADERS);
  migrateArchivedEmployees_(getEmployeeSheets_());
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || '';
    });
    return record;
  }).filter((row) => row.id);
  return { ok: true, employees: data };
}

function getEmployeeSheets_() {
  return {
    active: ensureSheet('Employees', EMPLOYEE_HEADERS),
    archived: ensureSheet('Employee_Archive', EMPLOYEE_HEADERS),
  };
}

function findEmployeeRow_(sheet, employeeId) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0] || [];
  const idColumn = headers.indexOf('id');
  if (idColumn < 0) return null;

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    if ((rows[rowIndex][idColumn] || '').toString() === employeeId) {
      const employee = {};
      headers.forEach((header, columnIndex) => {
        employee[header] = rows[rowIndex][columnIndex] ?? '';
      });
      return { rowIndex: rowIndex + 1, headers, employee };
    }
  }
  return null;
}

function removeEmployeeRows_(sheet, employeeId) {
  const rows = sheet.getDataRange().getValues();
  const idColumn = (rows[0] || []).indexOf('id');
  if (idColumn < 0) return;

  for (let rowIndex = rows.length - 1; rowIndex >= 1; rowIndex -= 1) {
    if ((rows[rowIndex][idColumn] || '').toString() === employeeId) {
      sheet.deleteRow(rowIndex + 1);
    }
  }
}

function writeEmployeeRecord_(employee, archived) {
  const sheets = getEmployeeSheets_();
  const target = archived ? sheets.archived : sheets.active;
  const source = archived ? sheets.active : sheets.archived;
  const targetRows = target.getDataRange().getValues();
  const headers = targetRows[0] || [];
  const idColumn = headers.indexOf('id');
  const values = headers.map((header) => employee[header] ?? '');
  let targetRow = 0;

  for (let rowIndex = 1; rowIndex < targetRows.length; rowIndex += 1) {
    if ((targetRows[rowIndex][idColumn] || '').toString() === employee.id) {
      targetRow = rowIndex + 1;
      break;
    }
  }

  if (targetRow) {
    target.getRange(targetRow, 1, 1, values.length).setValues([values]);
  } else {
    target.appendRow(values);
  }
  removeEmployeeRows_(source, employee.id);
  return { sheet: target, row: targetRow || target.getLastRow() };
}

function migrateArchivedEmployees_(sheets) {
  const rows = sheets.active.getDataRange().getValues();
  const headers = rows[0] || [];
  const archivedColumn = headers.indexOf('isArchived');
  if (archivedColumn < 0) return;

  for (let rowIndex = rows.length - 1; rowIndex >= 1; rowIndex -= 1) {
    const archived = rows[rowIndex][archivedColumn] === true
      || String(rows[rowIndex][archivedColumn]).toUpperCase() === 'TRUE';
    if (!archived) continue;

    const employee = {};
    headers.forEach((header, columnIndex) => {
      employee[header] = rows[rowIndex][columnIndex] ?? '';
    });
    writeEmployeeRecord_(employee, true);
  }
}

function saveEmployee(employee) {
  const sheets = getEmployeeSheets_();
  const id = employee.id || Utilities.getUuid();
  const archived = employee.isArchived === true || employee.isArchived === 'TRUE';
  const existing = findEmployeeRow_(sheets.active, id) || findEmployeeRow_(sheets.archived, id);
  const payload = {
    id,
    name: employee.name || 'Unnamed employee',
    startDate: employee.startDate || new Date().toISOString().slice(0, 10),
    contractType: employee.contractType || '',
    status: employee.status || (archived ? 'inactive' : 'active'),
    isArchived: archived ? 'TRUE' : 'FALSE',
    albumFolderId: employee.albumFolderId || existing?.employee.albumFolderId || '',
    updatedAt: new Date().toISOString(),
  };

  if (!payload.albumFolderId) {
    const folder = ensureEmployeeFolder(id, payload.name);
    payload.albumFolderId = folder.getId();
  }

  writeEmployeeRecord_(payload, archived);
  return { ok: true, employee: payload };
}

function archiveEmployee(employeeId, isArchived) {
  const sheets = getEmployeeSheets_();
  const archived = isArchived !== false;
  const found = findEmployeeRow_(sheets.active, employeeId)
    || findEmployeeRow_(sheets.archived, employeeId);
  if (!found) return { ok: false, message: 'Employee not found' };

  found.employee.isArchived = archived ? 'TRUE' : 'FALSE';
  found.employee.status = archived ? 'inactive' : 'active';
  found.employee.updatedAt = new Date().toISOString();
  writeEmployeeRecord_(found.employee, archived);

  const folderId = found.employee.albumFolderId;
  if (folderId) {
    const folder = DriveApp.getFolderById(folderId);
    const destination = archived
      ? getOrCreateFolder_(DriveApp.getRootFolder(), 'Archived Employee Photos')
      : ensureFolders().mainFolder;
    folder.moveTo(destination);
  }

  return { ok: true, archived };
}

function getOrCreateFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function deleteEmployee(employeeId) {
  const sheets = getEmployeeSheets_();
  const found = findEmployeeRow_(sheets.active, employeeId)
    || findEmployeeRow_(sheets.archived, employeeId);
  if (!found) return { ok: false, message: 'Employee not found' };

  const folderId = found.employee.albumFolderId;
  removeEmployeeRows_(sheets.active, employeeId);
  removeEmployeeRows_(sheets.archived, employeeId);
  if (folderId) {
    DriveApp.getFolderById(folderId).setTrashed(true);
  }
  return { ok: true, deleted: true };
}

function listRecords() {
  const sheet = ensureSheet('Room_Records', ['id', 'date', 'room', 'status', 'employeeId', 'inspector', 'percent', 'failed', 'positive', 'development', 'scored', 'possible', 'version', 'results', 'corrections', 'createdAt']);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || '';
    });
    return record;
  }).filter((row) => row.id);

  return { ok: true, records: data };
}

function saveInspection(inspection) {
  const sheet = ensureSheet('Room_Records', ['id', 'date', 'room', 'status', 'employeeId', 'inspector', 'percent', 'failed', 'positive', 'development', 'scored', 'possible', 'version', 'results', 'corrections', 'createdAt']);
  const id = inspection.id || Utilities.getUuid();
  const record = {
    id,
    date: inspection.date || new Date().toISOString().slice(0, 10),
    room: inspection.room || '',
    status: inspection.status || '',
    employeeId: inspection.employeeId || '',
    inspector: inspection.inspector || '',
    percent: inspection.percent || 0,
    failed: inspection.failed || 0,
    positive: inspection.positive || '',
    development: inspection.development || '',
    scored: inspection.scored || 0,
    possible: inspection.possible || 0,
    version: inspection.version || '',
    results: JSON.stringify(inspection.results || []),
    corrections: JSON.stringify(inspection.corrections || []),
    createdAt: new Date().toISOString(),
  };
  const headers = sheet.getDataRange().getValues()[0] || [];
  const row = headers.map((header) => record[header] ?? '');

  const rows = sheet.getDataRange().getValues();
  let inserted = false;
  for (let index = 1; index < rows.length; index += 1) {
    if ((rows[index][0] || '').toString() === id) {
      sheet.getRange(index + 1, 1, 1, row.length).setValues([row]);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    sheet.appendRow(row);
  }

  return { ok: true, inspection: { ...inspection, id } };
}

function uploadEmployeePhoto(data) {
  const fileData = data && data.fileData ? data.fileData : null;
  const fileName = data && data.fileName ? data.fileName : 'photo.jpg';
  const employeeId = data && data.employeeId ? data.employeeId : null;
  const photoId = data && data.photoId ? data.photoId : Utilities.getUuid();

  if (!fileData || !employeeId) {
    return { ok: false, message: 'Missing photo content or employee ID.' };
  }

  const sheet = ensureSheet('Employees', EMPLOYEE_HEADERS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0] || [];
  const employeeIdColumn = headers.indexOf('id');
  const folderIdColumn = headers.indexOf('albumFolderId');
  const employeeNameColumn = headers.indexOf('name');
  let employeeRow = -1;
  let folder = null;

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    if ((rows[rowIndex][employeeIdColumn] || '').toString() !== employeeId) continue;
    employeeRow = rowIndex + 1;
    if (rows[rowIndex][folderIdColumn]) {
      try {
        folder = DriveApp.getFolderById(rows[rowIndex][folderIdColumn]);
      } catch (error) {
        folder = null;
      }
    }
    break;
  }

  const employeeName = data.employeeName || (employeeRow > 0 ? rows[employeeRow - 1][employeeNameColumn] : '') || employeeId;
  if (!folder) {
    folder = ensureEmployeeFolder(employeeId, employeeName);
    if (employeeRow > 0 && folderIdColumn >= 0) {
      sheet.getRange(employeeRow, folderIdColumn + 1).setValue(folder.getId());
    }
  }

  const blob = Utilities.newBlob(Utilities.base64Decode(fileData), data.mimeType || 'image/jpeg', fileName);
  const file = folder.createFile(blob);
  const metadata = data.metadata || {};
  file.setDescription(JSON.stringify(metadata));
  const uploadedAt = new Date().toISOString();
  const metadataSheet = ensureSheet('Photo_Metadata', [
    'photoId',
    'employeeId',
    'employeeName',
    'fileName',
    'mimeType',
    'driveFileId',
    'driveUrl',
    'folderId',
    'category',
    'issue',
    'itemId',
    'description',
    'responsibility',
    'date',
    'room',
    'uploadedAt',
    'metadataJson',
  ]);
  metadataSheet.appendRow([
    photoId,
    employeeId,
    employeeName,
    fileName,
    data.mimeType || 'image/jpeg',
    file.getId(),
    file.getUrl(),
    folder.getId(),
    metadata.category || '',
    metadata.issue || '',
    metadata.itemId || '',
    metadata.description || '',
    metadata.responsibility || '',
    metadata.date || '',
    metadata.room || '',
    uploadedAt,
    JSON.stringify(metadata),
  ]);

  return { ok: true, photoId, fileId: file.getId(), url: file.getUrl(), folderId: folder.getId(), uploadedAt, metadata };
}
