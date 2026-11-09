function doGet() {
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
  try {
    const request = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = request.action || 'listEmployees';
    const data = request.payload || {};

    switch (action) {
      case 'listEmployees':
        return jsonResponse(listEmployees());
      case 'listRecords':
        return jsonResponse(listRecords());
      case 'saveEmployee':
        return jsonResponse(saveEmployee(data));
      case 'archiveEmployee':
        return jsonResponse(archiveEmployee(data.employeeId, data.isArchived));
      case 'deleteEmployee':
        return jsonResponse(deleteEmployee(data.employeeId));
      case 'saveInspection':
        return jsonResponse(saveInspection(data));
      case 'uploadPhoto':
        return jsonResponse(uploadEmployeePhoto(data));
      default:
        return jsonResponse({ ok: false, message: 'Unknown action: ' + action });
    }
  } catch (error) {
    return jsonResponse({ ok: false, message: error && error.message ? error.message : 'Request failed.' });
  }
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
  const sheet = ensureSheet('Employees', ['id', 'name', 'startDate', 'status', 'isArchived', 'albumFolderId', 'updatedAt']);
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

function saveEmployee(employee) {
  const sheet = ensureSheet('Employees', ['id', 'name', 'startDate', 'status', 'isArchived', 'albumFolderId', 'updatedAt']);
  const rows = sheet.getDataRange().getValues();
  const headerRow = rows[0] || [];
  const id = employee.id || Utilities.getUuid();
  const payload = {
    id,
    name: employee.name || 'Unnamed employee',
    startDate: employee.startDate || new Date().toISOString().slice(0, 10),
    status: employee.status || 'active',
    isArchived: employee.isArchived ? 'TRUE' : 'FALSE',
    albumFolderId: employee.albumFolderId || '',
    updatedAt: new Date().toISOString(),
  };

  let employeeRow = 0;
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if ((row[0] || '').toString() === id) {
      const updateRow = headerRow.map((header) => payload[header] ?? '');
      employeeRow = rowIndex + 1;
      sheet.getRange(employeeRow, 1, 1, updateRow.length).setValues([updateRow]);
      break;
    }
  }

  if (!employeeRow) {
    sheet.appendRow([payload.id, payload.name, payload.startDate, payload.status, payload.isArchived, payload.albumFolderId, payload.updatedAt]);
    employeeRow = sheet.getLastRow();
  }

  if (!payload.albumFolderId) {
    const folder = ensureEmployeeFolder(id, payload.name);
    const folderId = folder.getId();
    sheet.getRange(employeeRow, 6).setValue(folderId);
    payload.albumFolderId = folderId;
  }

  return { ok: true, employee: payload };
}

function archiveEmployee(employeeId, isArchived) {
  const sheet = ensureSheet('Employees', ['id', 'name', 'startDate', 'status', 'isArchived', 'albumFolderId', 'updatedAt']);
  const rows = sheet.getDataRange().getValues();
  const archived = isArchived !== false;

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    if ((rows[rowIndex][0] || '').toString() === employeeId) {
      sheet.getRange(rowIndex + 1, 5).setValue(archived ? 'TRUE' : 'FALSE');
      sheet.getRange(rowIndex + 1, 4).setValue(archived ? 'inactive' : 'active');
      sheet.getRange(rowIndex + 1, 7).setValue(new Date().toISOString());

      const folderId = rows[rowIndex][5];
      if (folderId) {
        const folder = DriveApp.getFolderById(folderId);
        const destination = archived
          ? getOrCreateFolder_(DriveApp.getRootFolder(), 'Archived Employee Photos')
          : ensureFolders().mainFolder;
        folder.moveTo(destination);
      }

      return { ok: true, archived };
    }
  }

  function getOrCreateFolder_(parent, name) {
    const folders = parent.getFoldersByName(name);
    return folders.hasNext() ? folders.next() : parent.createFolder(name);
  }

  return { ok: false, message: 'Employee not found' };
}

function deleteEmployee(employeeId) {
  const sheet = ensureSheet('Employees', ['id', 'name', 'startDate', 'status', 'isArchived', 'albumFolderId', 'updatedAt']);
  const rows = sheet.getDataRange().getValues();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    if ((rows[rowIndex][0] || '').toString() === employeeId) {
      sheet.deleteRow(rowIndex + 1);
      const folderId = rows[rowIndex][5];
      if (folderId) {
        try {
          DriveApp.getFolderById(folderId).setTrashed(true);
        } catch (error) {
          // Ignore if folder is not found.
        }
      }
      return { ok: true, deleted: true };
    }
  }

  return { ok: false, message: 'Employee not found' };
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

  const sheet = ensureSheet('Employees', ['id', 'name', 'startDate', 'status', 'isArchived', 'albumFolderId', 'updatedAt']);
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
