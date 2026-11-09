import { registerGoogleSync, saveEmployeeToGoogle, saveInspectionToGoogle, archiveEmployeeInGoogle, deleteEmployeeInGoogle, uploadEmployeePhoto } from './googleIntegration.js';
import { googleScriptConfig } from './config.js';

const app = document.getElementById('app');
let googleSyncError = '';
let localSaveError = '';

const todayISO = () => new Date().toISOString().slice(0, 10);
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString + 'T12:00:00');
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const baseSections = [
  {
    name: 'Bedroom and Bed Presentation',
    items: [
      { id: 'bed-1', label: 'Bed correctly made and presented', points: 5 },
      { id: 'bed-2', label: 'Bed linen clean, fresh and without stains or damage', points: 5 },
      { id: 'bed-3', label: 'Pillows correctly positioned', points: 3 },
      { id: 'bed-4', label: 'Mattress and bed protection properly presented', points: 2 },
      { id: 'bed-5', label: 'Bedside tables and furniture clean', points: 2 },
      { id: 'bed-6', label: 'Wardrobe and hangers clean and correctly arranged', points: 1 },
      { id: 'bed-7', label: 'Curtains correctly arranged', points: 1 },
      { id: 'bed-8', label: 'Room has a fresh, neutral smell', points: 1 },
    ],
  },
  {
    name: 'Bathroom',
    items: [
      { id: 'bath-1', label: 'Toilet thoroughly cleaned and disinfected', points: 4 },
      { id: 'bath-2', label: 'Shower or bathtub completely clean', points: 5 },
      { id: 'bath-3', label: 'Shower glass and mirrors spotless', points: 3 },
      { id: 'bath-4', label: 'Sink, taps and fixtures clean', points: 3 },
      { id: 'bath-5', label: 'No hairs anywhere in the bathroom', points: 4 },
      { id: 'bath-6', label: 'Towels clean, undamaged and correctly folded', points: 3 },
      { id: 'bath-7', label: 'Bathrobes present and correctly presented', points: 2 },
      { id: 'bath-8', label: 'Bathroom floor and drain clean', points: 1 },
    ],
  },
  {
    name: 'Dusting and Surfaces',
    items: [
      { id: 'dust-1', label: 'All visible surfaces dust-free', points: 5 },
      { id: 'dust-2', label: 'Skirting boards and edges clean', points: 3 },
      { id: 'dust-3', label: 'Lamps and light fixtures dust-free', points: 2 },
      { id: 'dust-4', label: 'Doors, handles and frames clean', points: 2 },
      { id: 'dust-5', label: 'Switches and frequently touched surfaces clean', points: 3 },
    ],
  },
  {
    name: 'Amenities and Guest Supplies',
    items: [
      { id: 'amenity-1', label: 'Bathroom amenities complete and correctly presented', points: 4 },
      { id: 'amenity-2', label: 'Toilet paper and tissues replenished', points: 3 },
      { id: 'amenity-3', label: 'Guest amenities correctly positioned', points: 3 },
      { id: 'amenity-4', label: 'DND and HFT door hangers present', points: 2 },
      { id: 'amenity-5', label: 'Guest information and stationery correctly presented', points: 1 },
      { id: 'amenity-6', label: 'Waste bins empty and clean', points: 2 },
    ],
  },
  {
    name: 'Minibar and Coffee Facilities',
    items: [
      { id: 'minibar-1', label: 'Minibar correctly stocked', points: 3 },
      { id: 'minibar-2', label: 'Minibar products checked for expiry dates', points: 2 },
      { id: 'minibar-3', label: 'Nespresso machine clean and ready', points: 2 },
      { id: 'minibar-4', label: 'Kettle clean and ready', points: 1 },
      { id: 'minibar-5', label: 'Cups and coffee accessories complete and clean', points: 2 },
    ],
  },
  {
    name: 'Floors and Final Presentation',
    items: [
      { id: 'final-1', label: 'Floor properly vacuumed and mopped', points: 5 },
      { id: 'final-2', label: 'Room furniture and accessories correctly arranged', points: 3 },
      { id: 'final-3', label: 'Final visual presentation meets hotel standard', points: 3 },
      { id: 'final-4', label: 'Lights and room equipment checked', points: 2 },
      { id: 'final-5', label: 'Maintenance or cleanliness issues identified and reported', points: 2 },
    ],
  },
];

const defaultEmployees = [
  { id: 'emp-1', name: 'Noor van Dijk', startDate: '2024-01-15', active: true, status: 'active', isArchived: false, albumFolderId: '', photos: [] },
  { id: 'emp-2', name: 'Samira El Amrani', startDate: '2024-03-04', active: true, status: 'active', isArchived: false, albumFolderId: '', photos: [] },
  { id: 'emp-3', name: 'Luca de Vries', startDate: '2024-06-10', active: true, status: 'active', isArchived: false, albumFolderId: '', photos: [] },
  { id: 'emp-4', name: 'Ari Hassan', startDate: '2024-08-12', active: false, status: 'inactive', isArchived: true, albumFolderId: '', photos: [] },
];

const rooms = [
  ...Array.from({ length: 15 }, (_, i) => ({ number: String(101 + i), floor: 1, category: i % 4 === 0 ? 'Premium' : 'Standard' })),
  ...Array.from({ length: 15 }, (_, i) => ({ number: String(201 + i), floor: 2, category: i % 3 === 0 ? 'Suite' : 'Standard' })),
  ...Array.from({ length: 13 }, (_, i) => ({ number: String(301 + i), floor: 3, category: i % 5 === 0 ? 'Premium' : 'Standard' })),
];

const supervisors = ['Ava Jansen', 'Milan de Boer', 'Sophie Vermeer'];

const defaultState = {
  currentView: 'dashboard',
  workingDate: todayISO(),
  employees: defaultEmployees,
  inspections: [],
  version: 'HVN-100-v1',
  sections: JSON.parse(JSON.stringify(baseSections)),
  activeSection: 0,
  draftSections: JSON.parse(JSON.stringify(baseSections)),
};

const loadState = () => {
  const raw = localStorage.getItem('hotel-v-state');
  if (!raw) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      currentView: parsed.currentView === 'rooms' ? 'dashboard' : parsed.currentView,
      employees: parsed.employees?.length ? parsed.employees : defaultEmployees,
      sections: parsed.sections?.length ? parsed.sections : JSON.parse(JSON.stringify(baseSections)),
      draftSections: parsed.draftSections?.length ? parsed.draftSections : JSON.parse(JSON.stringify(baseSections)),
    };
  } catch {
    return structuredClone(defaultState);
  }
};

let state = loadState();
const viewHistory = [];

const saveState = () => {
  try {
    localStorage.setItem('hotel-v-state', JSON.stringify(state));
    localSaveError = '';
    const status = document.querySelector('.google-sync-status');
    if (status) {
      status.textContent = googleSyncError || (googleScriptConfig.enabled ? 'Google sync enabled' : 'Google sync not configured');
      status.classList.remove('storage-error');
    }
    return true;
  } catch (error) {
    localSaveError = error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      ? 'Browser storage is full. Remove some saved photos to continue saving.'
      : 'Could not save changes in this browser.';
    console.error(localSaveError, error);
    const status = document.querySelector('.google-sync-status');
    if (status) {
      status.textContent = localSaveError;
      status.classList.add('storage-error');
    }
    return false;
  }
};

const normalizeEmployee = (employee) => ({
  ...employee,
  id: employee.id || crypto.randomUUID(),
  name: employee.name || 'Unnamed employee',
  startDate: employee.startDate || todayISO(),
  active: employee.active !== false && employee.status !== 'inactive',
  status: employee.status || (employee.active === false ? 'inactive' : 'active'),
  isArchived: Boolean(employee.isArchived),
  albumFolderId: employee.albumFolderId || '',
  photos: Array.isArray(employee.photos) ? employee.photos : [],
});

const getEmployee = (id) => state.employees.find((employee) => employee.id === id);

const getEmployeeAlbum = (employee) => Array.isArray(employee?.photos) ? employee.photos : [];

const compressPhoto = async (file) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('The selected photo could not be opened.'));
      image.src = objectUrl;
    });

    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.76);
    return {
      dataUrl,
      fileData: dataUrl.split(',')[1],
      mimeType: 'image/jpeg',
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const reportGoogleSyncError = (context, error) => {
  googleSyncError = `${context}: ${error.message || 'Google request failed.'}`;
  console.error(googleSyncError, error);
  const status = document.querySelector('.google-sync-status');
  if (status) {
    status.textContent = localSaveError || googleSyncError;
    status.classList.toggle('storage-error', Boolean(localSaveError));
  }
};

const clearGoogleSyncError = () => {
  googleSyncError = '';
  const status = document.querySelector('.google-sync-status');
  if (status) {
    status.textContent = localSaveError || (googleScriptConfig.enabled ? 'Google sync enabled' : 'Google sync not configured');
    status.classList.toggle('storage-error', Boolean(localSaveError));
  }
};

const syncEmployeeToGoogle = async (employee) => {
  if (!googleScriptConfig.enabled || !employee) return false;

  try {
    const payload = normalizeEmployee(employee);
    delete payload.photos;
    const result = await saveEmployeeToGoogle(payload);
    if (!result?.ok) throw new Error(result?.message || 'Employee sync failed.');
    const albumFolderId = result.employee?.albumFolderId;
    if (albumFolderId && employee.albumFolderId !== albumFolderId) {
      state.employees = state.employees.map((current) => current.id === employee.id
        ? normalizeEmployee({ ...current, albumFolderId })
        : current);
      saveState();
    }
    clearGoogleSyncError();
    return true;
  } catch (error) {
    reportGoogleSyncError('Employee sync failed', error);
    return false;
  }
};

const syncInspectionToGoogle = async (inspection) => {
  if (!googleScriptConfig.enabled || !inspection) return;

  try {
    const cloudInspection = {
      ...inspection,
      results: inspection.results.map((result) => ({
        ...result,
        correction: result.correction ? {
          ...result.correction,
          photos: result.correction.photos.map(({ id, name, driveUrl }) => ({
            id,
            name,
            url: driveUrl || '',
          })),
        } : null,
      })),
      corrections: inspection.corrections.map((correction) => ({
        ...correction,
        photos: correction.photos.map(({ id, name, driveUrl }) => ({
          id,
          name,
          url: driveUrl || '',
        })),
      })),
    };
    const result = await saveInspectionToGoogle(cloudInspection);
    if (!result?.ok) throw new Error(result?.message || 'Inspection sync failed.');
    clearGoogleSyncError();
  } catch (error) {
    reportGoogleSyncError('Inspection sync failed', error);
  }
};

const getSectionTotal = (section) => section.items.reduce((sum, item) => sum + item.points, 0);

const getInspectionResults = (inspectionId) => {
  const result = {};
  const form = document.querySelector(`[data-inspection-id="${inspectionId}"]`);
  if (!form) return result;
  form.querySelectorAll('input[type="radio"]').forEach((input) => {
    const name = input.name.replace('result-', '');
    if (input.checked) result[name] = input.value;
  });
  return result;
};

const renderNavigation = () => {
  const navItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'inspections', label: 'Inspections' },
    { key: 'employees', label: 'Employees' },
    { key: 'history', label: 'Inspection History' },
    { key: 'reports', label: 'Reports' },
    { key: 'settings', label: 'Settings' },
  ];
  const currentLabel = navItems.find((item) => item.key === state.currentView)?.label || 'Dashboard';

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div>
          <div class="brand">HOTEL V<span class="dot">.</span></div>
          <p class="sidebar-caption">Nesplein · Housekeeping performance</p>
          <div class="tag" style="margin-top: 16px;">Housekeeping</div>
        </div>
        <nav class="desktop-nav" aria-label="Main navigation" style="margin-top: 24px; display:grid; gap:10px;">
          ${navItems.map((item) => `
            <button
              class="btn secondary ${state.currentView === item.key ? 'active' : ''}"
              type="button"
              data-go="${item.key}"
              style="text-align:left; border-radius:10px; background:${state.currentView === item.key ? '#454640' : 'transparent'}; color:${state.currentView === item.key ? '#fff' : '#d6d3ce'}; border:none; min-height:42px;"
            >
              ${item.label}
            </button>
          `).join('')}
        </nav>
        <p class="sidebar-footnote">Housekeeping quality and employee records.</p>
      </aside>

      <div class="app-main">
        <header class="topbar">
          ${state.currentView !== 'dashboard' ? '<button class="btn secondary back-button" type="button" data-back aria-label="Go back" title="Go back">←</button>' : ''}
          <details class="mobile-nav">
            <summary aria-label="Open page navigation">${currentLabel}</summary>
            <nav class="mobile-nav-menu" aria-label="Main navigation">
              ${navItems.map((item) => `
                <button class="mobile-nav-item ${state.currentView === item.key ? 'active' : ''}" type="button" data-go="${item.key}">
                  ${item.label}
                </button>
              `).join('')}
            </nav>
          </details>
          <div class="google-sync-status ${localSaveError ? 'storage-error' : ''}" role="status" aria-live="polite">${localSaveError || googleSyncError || (googleScriptConfig.enabled ? 'Google sync enabled' : 'Google sync not configured')}</div>
          <div class="tag">Housekeeping</div>
        </header>
        <main class="page">
          ${renderCurrentView()}
        </main>
      </div>
    </div>
  `;
};

const renderCurrentView = () => {
  switch (state.currentView) {
    case 'dashboard':
      return renderDashboard();
    case 'inspections':
      return renderInspections();
    case 'employees':
      return renderEmployees();
    case 'history':
      return renderHistory();
    case 'reports':
      return renderReports();
    case 'settings':
      return renderSettings();
    default:
      return renderDashboard();
  }
};

const renderDashboard = () => {
  const inspectionsForDate = state.inspections.filter((item) => item.date === state.workingDate);
  const avg = inspectionsForDate.length
    ? `${Math.round(inspectionsForDate.reduce((total, item) => total + item.percent, 0) / inspectionsForDate.length)}%`
    : '—';
  const roomsInspected = new Set(inspectionsForDate.map((inspection) => inspection.room)).size;

  return `
    <section class="section active">
      <p class="dashboard-brand">V&amp;HIS Supervising App</p>
      <p class="eyebrow">Quality overview</p>
      <div class="dashboard-header">
        <div>
          <div class="muted" style="margin-top:10px;">${formatDate(state.workingDate)}</div>
        </div>
        <button type="button" class="btn primary" data-go="inspections">Start inspection</button>
      </div>

      <div class="metric-grid">
        ${[
          ['Inspections', String(inspectionsForDate.length)],
          ['Average quality', avg],
          ['Failed items', String(inspectionsForDate.reduce((total, item) => total + item.failed, 0))],
          ['Rooms inspected', String(roomsInspected)],
        ].map(([label, value]) => `
          <article class="surface metric">
            <div class="label">${label}</div>
            <div class="value">${value}</div>
          </article>
        `).join('')}
      </div>

      <div class="surface panel">
        <h2>Quality records</h2>
        <p class="muted" style="margin:10px 0 0; line-height:1.6;">
          ${state.inspections.length} completed inspection${state.inspections.length === 1 ? '' : 's'} recorded across all dates. Open Room History to review results by room.
        </p>
      </div>
    </section>
  `;
};

const renderInspections = () => {
  const currentRoom = document.querySelector('#inspection-room')?.value || rooms[0].number;
  const currentDate = document.querySelector('#inspection-date')?.value || state.workingDate;
  const currentStatus = document.querySelector('#inspection-status')?.value || '';
  const currentEmployeeId = document.querySelector('#inspection-assignee')?.value || '';
  const currentInspector = document.querySelector('#inspector-name')?.value || '';
  const roomOptions = rooms.map((room) => `<option value="${room.number}" ${room.number === currentRoom ? 'selected' : ''}>${room.number}</option>`).join('');
  const assigneeOptions = state.employees.filter((employee) => employee.active).map((employee) => `
    <option value="${employee.id}" ${currentEmployeeId === employee.id ? 'selected' : ''}>${employee.name}</option>
  `).join('');

  return `
    <section class="section active">
      <div class="section-header">
        <div>
          <p class="eyebrow">Quality control</p>
          <h1>Room inspection</h1>
        </div>
      </div>

      <div class="score-bar">
        <div class="score-box">
          <div class="label">Points achieved / applicable</div>
          <div class="value" id="score-points">0 / 100</div>
        </div>
        <div class="score-box">
          <div class="label">Final percentage</div>
          <div class="value" id="score-percent">0%</div>
        </div>
        <div class="score-box">
          <div class="label">Failed items</div>
          <div class="value" id="score-fails">0</div>
        </div>
      </div>

      <form id="inspection-form">
        <div class="surface panel" style="margin-bottom:18px;">
          <h2>01 / Inspection details</h2>
          <div class="field-grid" style="margin-top:18px;">
            <div class="field">
              <label for="inspection-room">Room</label>
              <select id="inspection-room">${roomOptions}</select>
            </div>
            <div class="field">
              <label for="inspection-date">Inspection date</label>
              <input id="inspection-date" type="date" value="${currentDate || state.workingDate}" />
            </div>
            <div class="field">
              <label for="inspection-status">Room status</label>
              <select id="inspection-status" required>
                <option value="" ${currentStatus ? '' : 'selected'}>Select room status</option>
                <option value="Departure" ${currentStatus === 'Departure' ? 'selected' : ''}>Departure</option>
                <option value="Stayover" ${currentStatus === 'Stayover' ? 'selected' : ''}>Stayover</option>
                <option value="No Service" ${currentStatus === 'No Service' ? 'selected' : ''}>No Service</option>
              </select>
            </div>
            <div class="field">
              <label for="inspection-assignee">Housekeeper inspected</label>
              <select id="inspection-assignee" required>
                <option value="">Select housekeeper</option>
                ${assigneeOptions}
              </select>
            </div>
            <div class="field">
              <label for="inspector-name">Inspector name</label>
              <select id="inspector-name" required>
                <option value="">Select supervisor</option>
                ${supervisors.map((name) => `<option value="${name}">${name}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="surface panel" style="margin-bottom:18px;">
          <div style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:12px; align-items:center; margin-bottom:12px;">
            <h2>02 / Official cleaning standard</h2>
            <span class="tag">${state.version}</span>
          </div>

          <p class="muted" style="margin:0 0 14px; line-height:1.6;">Answer every item. PASS earns all points; FAIL earns zero; NOT APPLICABLE removes the item from the possible score.</p>

          <div class="section-tabs">
            ${state.sections.map((section, index) => `
              <button type="button" class="tab-btn ${index === state.activeSection ? 'active' : ''}" data-section-index="${index}">
                ${index + 1}. ${section.name}
              </button>
            `).join('')}
          </div>

          <div id="checklist-panels">
            ${state.sections.map((section, sectionIndex) => `
              <div class="checklist-section ${sectionIndex === state.activeSection ? '' : 'hidden'}" data-section-panel="${sectionIndex}">
                <h3>${sectionIndex + 1}. ${section.name}</h3>
                <div class="fine-print" style="margin:8px 0 10px;">${getSectionTotal(section)} points · ${section.items.length} items</div>
                ${section.items.map((item, itemIndex) => `
                  <div class="inspect-item" data-item-id="${item.id}">
                    <div class="inspect-top">
                      <strong>${itemIndex + 1}. ${item.label}</strong>
                      <span class="tag" style="padding:4px 8px; text-transform:none; letter-spacing:0; font-size:0.72rem;">${item.points} pts</span>
                    </div>
                    <div class="choice-grid">
                      ${['pass', 'fail', 'na'].map((value) => `
                        <label class="choice ${value}">
                          <input type="radio" name="result-${item.id}" value="${value}" data-item-id="${item.id}" />
                          <span class="choice-symbol">${value === 'pass' ? '✓' : value === 'fail' ? '×' : 'N/A'}</span>
                        </label>
                      `).join('')}
                    </div>
                    <div class="failure-box hidden">
                      <strong>Correction needed · failed item</strong>
                      <div class="failure-field">
                        <label class="field" for="issue-${item.id}"><span>Problem description</span></label>
                        <textarea id="issue-${item.id}" class="issue-field" placeholder="Describe what needs attention"></textarea>
                      </div>
                      <div class="failure-field">
                        <label class="field" for="responsibility-${item.id}"><span>Correction responsibility</span></label>
                        <select id="responsibility-${item.id}" class="responsibility-field">
                          <option value="">Select responsibility</option>
                          <option value="Housekeeper">Housekeeper</option>
                          <option value="Supervisor">Supervisor</option>
                          <option value="Maintenance">Maintenance</option>
                        </select>
                      </div>
                      <div class="failure-field">
                        <label class="btn small secondary file-button failure-photo-button">
                          Take or attach photo
                          <input id="failure-photo-${item.id}" type="file" accept="image/*" capture="environment" data-failure-photo="${item.id}" hidden />
                        </label>
                        <div id="failure-photo-preview-${item.id}" class="failure-photo-preview" aria-live="polite"></div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>

          <div class="form-actions">
            <button type="button" class="btn secondary" id="previous-section">← Previous section</button>
            <button type="button" class="btn secondary" id="next-section">Next section →</button>
          </div>
        </div>

        <div class="surface panel" style="margin-bottom:18px;">
          <h2>03 / Feedback and development</h2>
          <div class="field" style="margin-top:14px;">
            <label for="positive-feedback">Positive feedback and good performance</label>
            <textarea id="positive-feedback" placeholder="What went well?"></textarea>
          </div>
          <div class="field" style="margin-top:12px;">
            <label for="development-feedback">Coaching and development notes</label>
            <textarea id="development-feedback" placeholder="What should improve?"></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn primary">Complete inspection</button>
        </div>
      </form>
    </section>
  `;
};

const renderEmployees = () => {
  const metrics = state.employees.map((employee) => {
    const records = state.inspections.filter((inspection) => inspection.employeeId === employee.id);
    const avg = records.length ? Math.round(records.reduce((sum, item) => sum + item.percent, 0) / records.length) : 0;
    const failures = records.reduce((sum, item) => sum + item.failed, 0);
    const album = getEmployeeAlbum(employee);
    return { employee, records, avg, failures, album };
  });

  return `
    <section class="section active">
      <div class="section-header">
        <div>
          <p class="eyebrow">The team</p>
          <h1>Employee profiles</h1>
        </div>
      </div>

      <div class="profile-list">
        ${metrics.map(({ employee, records, avg, failures, album }) => `
          <article class="surface profile-card">
            <div class="employee-row">
              <div>
                <h3>${employee.name}</h3>
                <div class="muted">Joined ${formatDate(employee.startDate)} · ${employee.active ? 'Active' : 'Inactive'}</div>
              </div>
              <span class="tag">${records.length} inspections</span>
            </div>

            <div class="metric-row">
              <div class="surface metric">
                <div class="label">Average score</div>
                <div class="value">${avg}%</div>
              </div>
              <div class="surface metric">
                <div class="label">Failed items</div>
                <div class="value">${failures}</div>
              </div>
              <div class="surface metric">
                <div class="label">Evidence photos</div>
                <div class="value">${album.length}</div>
              </div>
            </div>

            <div class="album-panel">
              <div class="album-controls">
                <label class="btn small secondary file-button">
                  Upload photo
                  <input type="file" accept="image/*" data-upload-employee="${employee.id}" hidden />
                </label>
                <button type="button" class="btn small secondary archive-employee" data-employee-id="${employee.id}">
                  ${employee.active ? 'Archive' : 'Restore'}
                </button>
                <button type="button" class="btn small danger delete-employee" data-employee-id="${employee.id}">
                  Delete
                </button>
              </div>

              <div class="album-grid">
                ${album.length ? album.map((photo) => `
                  <div class="photo-card">
                    <img src="${photo.url}" alt="${photo.name}" />
                    <div class="photo-meta">
                      <span>${photo.name}</span>
                      ${photo.category ? `<small>${photo.category}${photo.issue ? ` · ${photo.issue}` : ''}</small>` : ''}
                      <small>${photo.room ? `Room ${photo.room} · ` : ''}${photo.date ? formatDate(photo.date) : photo.uploadedAt ? formatDate(photo.uploadedAt.slice(0, 10)) : 'Stored'}</small>
                    </div>
                  </div>
                `).join('') : '<div class="fine-print">No photo album yet for this employee.</div>'}
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
};

const renderHistory = () => {
  const selectedRoom = document.querySelector('#history-room')?.value || '101';
  const roomInspections = state.inspections.filter((inspection) => inspection.room === selectedRoom);

  return `
    <section class="section active">
      <div class="section-header">
        <div>
          <p class="eyebrow">Quality records</p>
          <h1>Inspection history</h1>
        </div>
      </div>

      <div class="field" style="max-width: 240px; margin-bottom: 18px;">
        <label for="history-room">Filter by room</label>
        <select id="history-room">
          ${rooms.map((room) => `<option value="${room.number}" ${room.number === selectedRoom ? 'selected' : ''}>Room ${room.number}</option>`).join('')}
        </select>
      </div>

      <div class="history-list">
        ${roomInspections.length ? roomInspections.map((inspection) => `
          <article class="surface history-card">
            <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items: center; margin-bottom:10px;">
              <h3>${formatDate(inspection.date)}</h3>
              <span class="tag">${inspection.percent}%</span>
            </div>
            <div class="muted">Room status: ${inspection.status || 'Not specified'} · Inspector: ${inspection.inspector} · Housekeeper: ${getEmployee(inspection.employeeId)?.name || 'Unknown'}</div>
            <div class="fine-print" style="margin-top:8px;">Failed items: ${inspection.failed} · Strengths: ${inspection.positive || 'None recorded'}</div>
            ${inspection.results?.length ? `
              <details class="record-details">
                <summary>Checklist results · ${inspection.version || 'Standard'}</summary>
                <div class="record-result-list">
                  ${inspection.results.map((result) => `
                    <div class="record-result ${result.value}">
                      <strong>${result.label}</strong>
                      <span>${result.category || ''} · ${result.value.toUpperCase()} · ${result.points} pts</span>
                      ${result.correction ? `<small>${result.correction.description || 'No description'} · ${result.correction.responsibility || 'No responsibility selected'}</small>` : ''}
                    </div>
                  `).join('')}
                </div>
              </details>
            ` : ''}
          </article>
        `).join('') : '<div class="surface panel">No inspection history for this room yet.</div>'}
      </div>
    </section>
  `;
};

const renderReports = () => {
  const employeeOptions = state.employees.map((employee) => `<option value="${employee.id}">${employee.name}</option>`).join('');
  const employeeId = document.querySelector('#report-employee')?.value || state.employees[0]?.id;
  const records = state.inspections.filter((inspection) => inspection.employeeId === employeeId);

  return `
    <section class="section active">
      <div class="section-header">
        <div>
          <p class="eyebrow">Factual insights</p>
          <h1>Reports</h1>
        </div>
      </div>

      <div class="surface panel" style="margin-bottom:18px;">
        <div class="field-grid">
          <div class="field">
            <label for="report-employee">Employee</label>
            <select id="report-employee">${employeeOptions}</select>
          </div>
          <div class="field">
            <label for="report-start">From</label>
            <input id="report-start" type="date" value="${state.workingDate}" />
          </div>
          <div class="field">
            <label for="report-end">To</label>
            <input id="report-end" type="date" value="${state.workingDate}" />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn primary" id="generate-report">Generate report</button>
          <button type="button" class="btn secondary" id="export-report">Export PDF / Print</button>
        </div>
      </div>

      <div class="report-list">
        ${records.length ? records.map((inspection) => `
          <article class="surface report-card">
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
              <h3>Room ${inspection.room}</h3>
              <span class="tag">${inspection.percent}%</span>
            </div>
            <div class="fine-print" style="margin-top:8px;">${formatDate(inspection.date)} · ${inspection.status || 'Status not specified'} · Inspector: ${inspection.inspector}</div>
          </article>
        `).join('') : '<div class="surface panel">No inspection data for this employee in the selected range.</div>'}
      </div>
    </section>
  `;
};

const renderSettings = () => {
  const totalMasterPoints = state.sections.reduce((sum, section) => sum + getSectionTotal(section), 0);
  return `
    <section class="section active">
      <div class="section-header">
        <div>
          <p class="eyebrow">Workspace configuration</p>
          <h1>Settings</h1>
        </div>
      </div>

      <div class="surface panel" style="margin-bottom:18px;">
        <h2>Master inspection standard</h2>
        <div class="tag" style="margin:12px 0 10px;">${state.version}</div>
        <div class="fine-print">Every completed inspection keeps a snapshot of its checklist version and item allocations. Historical records remain unchanged.</div>
        <div style="margin-top:16px; display:grid; gap:12px;">
          ${state.sections.map((section, index) => `
            <div class="surface metric" style="padding:12px 14px;">
              <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                <strong>${index + 1}. ${section.name}</strong>
                <span class="tag" style="padding:4px 8px; font-size:0.7rem; letter-spacing:0;">${getSectionTotal(section)} pts</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="fine-print" style="margin-top:12px;">Total master score: ${totalMasterPoints} points</div>
      </div>

      <div class="surface panel">
        <h2>Draft a future version</h2>
        <div style="margin-top:14px; display:grid; gap:12px;">
          ${state.draftSections.map((section, sectionIndex) => `
            <div class="surface" style="padding:12px;">
              <strong>${sectionIndex + 1}. ${section.name}</strong>
              ${section.items.map((item, itemIndex) => `
                <div style="display:grid; grid-template-columns:1fr 90px; gap:8px; align-items:center; margin-top:10px;">
                  <input type="text" value="${item.label}" data-draft-label="${sectionIndex}-${itemIndex}" />
                  <input type="number" min="1" max="20" value="${item.points}" data-draft-points="${sectionIndex}-${itemIndex}" />
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        <div class="form-actions" style="margin-top:16px;">
          <button type="button" class="btn primary" id="publish-version">Publish new version</button>
          <button type="button" class="btn secondary" id="reset-draft">Reset draft</button>
        </div>
      </div>
    </section>
  `;
};

const attachEventHandlers = () => {
  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.id === 'inspection-date') {
      state.workingDate = target.value || todayISO();
      saveState();
    }
  });

  document.addEventListener('change', async (event) => {
    const target = event.target;

    if (target.id === 'history-room') {
      renderNavigation();
      return;
    }

    if (target.matches('input[type="radio"]')) {
      const itemId = target.dataset.itemId;
      const itemBox = document.querySelector(`[data-item-id="${itemId}"] .failure-box`);
      if (itemBox) {
        itemBox.classList.toggle('hidden', target.value !== 'fail');
      }
      updateInspectionScore();
    }

    if (target.matches('input[type="file"][data-failure-photo]')) {
      const file = target.files?.[0];
      if (!file) return;

      const itemId = target.dataset.failurePhoto;
      const section = state.sections.find((currentSection) => currentSection.items.some((item) => item.id === itemId));
      const item = section?.items.find((currentItem) => currentItem.id === itemId);
      const date = document.getElementById('inspection-date')?.value || state.workingDate;
      const room = document.getElementById('inspection-room')?.value || rooms[0].number;
      const employeeId = document.getElementById('inspection-assignee')?.value;
      const employee = getEmployee(employeeId);
      if (!section || !item || !employee) return;

      const description = document.getElementById(`issue-${itemId}`)?.value || '';
      const responsibility = document.getElementById(`responsibility-${itemId}`)?.value || '';
      const reader = new FileReader();

      reader.onload = async () => {
        let compressedPhoto;
        try {
          compressedPhoto = await compressPhoto(file);
        } catch (error) {
          console.error('Could not process inspection photo.', error);
          window.alert(error.message || 'Could not process the selected photo.');
          return;
        }

        const categorySlug = section.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
        let photo = {
          id: crypto.randomUUID(),
          name: `Room-${room}_${date}_${categorySlug}_${file.name}`,
          uploadedAt: new Date().toISOString(),
          url: compressedPhoto.dataUrl,
          category: section.name,
          issue: item.label,
          itemId,
          description,
          responsibility,
          date,
          room,
          employeeId,
        };
        let uploadNote = `Saved to ${employee.name}'s profile album on this device.`;

        if (googleScriptConfig.enabled && await syncEmployeeToGoogle(employee)) {
          try {
            const result = await uploadEmployeePhoto({
              photoId: photo.id,
              employeeId,
              employeeName: employee.name,
              fileName: photo.name,
              mimeType: compressedPhoto.mimeType,
              fileData: compressedPhoto.fileData,
              metadata: {
                category: photo.category,
                issue: photo.issue,
                itemId: photo.itemId,
                description: photo.description,
                responsibility: photo.responsibility,
                date: photo.date,
                room: photo.room,
                employeeId: photo.employeeId,
              },
            });
            if (!result?.ok || !result.url) throw new Error(result?.message || 'Google Drive upload failed.');
            photo = { ...photo, driveUrl: result.url, storedInGoogle: true, googleId: result.fileId };
            uploadNote = `Saved to ${employee.name}'s profile album on this device and Google Drive.`;
            clearGoogleSyncError();
          } catch (error) {
            reportGoogleSyncError('Photo upload failed', error);
          }
        }

        state.employees = state.employees.map((currentEmployee) => currentEmployee.id === employeeId
          ? normalizeEmployee({ ...currentEmployee, photos: [...getEmployeeAlbum(currentEmployee), photo] })
          : currentEmployee);
        saveState();
        await syncEmployeeToGoogle(getEmployee(employeeId));

        const preview = document.getElementById(`failure-photo-preview-${itemId}`);
        if (preview) {
          preview.replaceChildren();
          const image = document.createElement('img');
          image.src = photo.url;
          image.alt = `Evidence for Room ${room}, ${item.label}`;
          const note = document.createElement('span');
          note.textContent = uploadNote;
          preview.append(image, note);
        }
        target.value = '';
      };

      reader.readAsDataURL(file);
    }

    if (target.matches('input[type="file"][data-upload-employee]')) {
      const file = target.files?.[0];
      if (!file) return;

      const employeeId = target.dataset.uploadEmployee;
      const employee = getEmployee(employeeId);
      const reader = new FileReader();

      reader.onload = async () => {
        let compressedPhoto;
        try {
          compressedPhoto = await compressPhoto(file);
        } catch (error) {
          console.error('Could not process employee photo.', error);
          window.alert(error.message || 'Could not process the selected photo.');
          return;
        }

        let photo = {
          id: crypto.randomUUID(),
          name: file.name,
          uploadedAt: new Date().toISOString(),
          url: compressedPhoto.dataUrl,
        };
        if (googleScriptConfig.enabled && employee && await syncEmployeeToGoogle(employee)) {
          try {
            const result = await uploadEmployeePhoto({
              photoId: photo.id,
              employeeId,
              employeeName: employee.name,
              fileName: file.name,
              mimeType: compressedPhoto.mimeType,
              fileData: compressedPhoto.fileData,
              metadata: { employeeId, category: 'Employee profile', date: todayISO() },
            });
            if (!result?.ok || !result.url) throw new Error(result?.message || 'Google Drive upload failed.');
            photo = { ...photo, driveUrl: result.url, storedInGoogle: true, googleId: result.fileId };
            clearGoogleSyncError();
          } catch (error) {
            reportGoogleSyncError('Photo upload failed', error);
          }
        }

        state.employees = state.employees.map((current) => {
          if (current.id !== employeeId) return current;
          const nextEmployee = normalizeEmployee({
            ...current,
            photos: [...getEmployeeAlbum(current), photo],
          });
          return nextEmployee;
        });

        saveState();
        await syncEmployeeToGoogle(getEmployee(employeeId));
        renderNavigation();
      };

      reader.readAsDataURL(file);
    }
  });

  document.addEventListener('click', async (event) => {
    const target = event.target;

    if (target.closest('[data-back]')) {
      state.currentView = viewHistory.pop() || 'dashboard';
      saveState();
      renderNavigation();
      return;
    }

    if (target.matches('[data-go]')) {
      if (state.currentView !== target.dataset.go) viewHistory.push(state.currentView);
      state.currentView = target.dataset.go;
      saveState();
      renderNavigation();
      return;
    }

    if (target.matches('.room-history')) {
      const roomNumber = target.dataset.room;
      state.currentView = 'history';
      saveState();
      renderNavigation();
      requestAnimationFrame(() => {
        const roomSelect = document.getElementById('history-room');
        if (roomSelect) roomSelect.value = roomNumber;
      });
    }

    if (target.matches('.tab-btn')) {
      setActiveSection(Number(target.dataset.sectionIndex));
    }

    if (target.id === 'next-section') {
      setActiveSection(state.activeSection + 1);
    }

    if (target.id === 'previous-section') {
      setActiveSection(state.activeSection - 1);
    }

    if (target.id === 'publish-version') {
      const nextSections = state.draftSections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item }))
      }));
      state.sections = nextSections;
      state.version = `HVN-100-v${Math.floor(Math.random() * 1000) + 1}`;
      saveState();
      renderNavigation();
    }

    if (target.id === 'reset-draft') {
      state.draftSections = JSON.parse(JSON.stringify(baseSections));
      saveState();
      renderNavigation();
    }

    if (target.id === 'generate-report') {
      const employeeId = document.getElementById('report-employee')?.value;
      const start = document.getElementById('report-start')?.value;
      const end = document.getElementById('report-end')?.value;
      const filtered = state.inspections.filter((inspection) => inspection.employeeId === employeeId && inspection.date >= start && inspection.date <= end);
      const reportList = document.querySelector('.report-list');
      if (reportList) {
        reportList.innerHTML = filtered.length ? filtered.map((inspection) => `
          <article class="surface report-card">
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
              <h3>Room ${inspection.room}</h3>
              <span class="tag">${inspection.percent}%</span>
            </div>
            <div class="fine-print" style="margin-top:8px;">${formatDate(inspection.date)} · ${inspection.status} · ${inspection.inspector}</div>
          </article>
        `).join('') : '<div class="surface panel">No inspection data for this employee in the selected range.</div>';
      }
    }

    if (target.classList.contains('archive-employee')) {
      const employeeId = target.dataset.employeeId;
      const employee = getEmployee(employeeId);
      if (!employee) return;

      const nextState = {
        ...employee,
        active: !employee.active,
        status: employee.active ? 'inactive' : 'active',
        isArchived: !employee.active,
      };

      state.employees = state.employees.map((current) => current.id === employeeId ? normalizeEmployee(nextState) : current);
      if (googleScriptConfig.enabled) {
        try {
          const employeeResult = await saveEmployeeToGoogle(nextState);
          if (!employeeResult?.ok) throw new Error(employeeResult?.message || 'Employee sync failed.');
          const result = await archiveEmployeeInGoogle(employeeId, nextState.isArchived);
          if (!result?.ok) throw new Error(result?.message || 'Employee archive sync failed.');
          clearGoogleSyncError();
        } catch (error) {
          reportGoogleSyncError('Employee archive sync failed', error);
        }
      }

      saveState();
      renderNavigation();
    }

    if (target.classList.contains('delete-employee')) {
      const employeeId = target.dataset.employeeId;
      const employee = getEmployee(employeeId);
      if (!employee) return;

      const confirmed = window.confirm(`Delete ${employee.name} and all local references?`);
      if (!confirmed) return;

      if (googleScriptConfig.enabled) {
        try {
          const result = await deleteEmployeeInGoogle(employeeId);
          if (!result?.ok && result?.message !== 'Employee not found') {
            throw new Error(result?.message || 'Employee delete sync failed.');
          }
          clearGoogleSyncError();
        } catch (error) {
          reportGoogleSyncError('Employee delete sync failed', error);
        }
      }

      state.employees = state.employees.filter((current) => current.id !== employeeId);
      saveState();
      renderNavigation();
    }

    if (target.id === 'export-report') {
      window.print();
    }
  });

  document.addEventListener('submit', (event) => {
    const target = event.target;
    if (target.id === 'inspection-form') {
      event.preventDefault();

      const room = document.getElementById('inspection-room')?.value;
      const date = document.getElementById('inspection-date')?.value || state.workingDate;
      const status = document.getElementById('inspection-status')?.value;
      const employeeId = document.getElementById('inspection-assignee')?.value;
      const inspector = document.getElementById('inspector-name')?.value;
      const positive = document.getElementById('positive-feedback')?.value || '';
      const development = document.getElementById('development-feedback')?.value || '';

      const results = [];
      let totalPossible = 0;
      let earned = 0;
      let failed = 0;

      state.sections.forEach((section) => {
        section.items.forEach((item) => {
          totalPossible += item.points;
          const selected = document.querySelector(`input[name="result-${item.id}"]:checked`);
          const value = selected?.value || 'fail';
          if (value === 'pass') {
            earned += item.points;
          } else if (value === 'fail') {
            failed += 1;
          }
          const correction = value === 'fail' ? {
            description: document.getElementById(`issue-${item.id}`)?.value || '',
            responsibility: document.getElementById(`responsibility-${item.id}`)?.value || '',
            photos: getEmployeeAlbum(getEmployee(employeeId))
              .filter((photo) => photo.itemId === item.id && photo.date === date && photo.room === room)
                .map((photo) => ({ id: photo.id, name: photo.name, url: photo.url, driveUrl: photo.driveUrl })),
          } : null;
          results.push({ itemId: item.id, category: section.name, value, label: item.label, points: item.points, correction });
        });
      });

      const percent = Math.round((earned / totalPossible) * 100);
      const inspection = {
        id: crypto.randomUUID(),
        date,
        room,
        status,
        employeeId,
        inspector,
        positive,
        development,
        percent,
        failed,
        scored: earned,
        possible: totalPossible,
        version: state.version,
        results,
        corrections: results.filter((result) => result.correction).map((result) => ({
          itemId: result.itemId,
          category: result.category,
          label: result.label,
          ...result.correction,
        })),
      };

      state.inspections.push(inspection);
      saveState();
      syncInspectionToGoogle(inspection);
      renderNavigation();
    }
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.matches('[data-draft-label]') || target.matches('[data-draft-points]')) {
      const [sectionIndex, itemIndex] = target.dataset.draftLabel ? target.dataset.draftLabel.split('-') : target.dataset.draftPoints.split('-');
      const section = state.draftSections[Number(sectionIndex)];
      const item = section.items[Number(itemIndex)];
      if (target.dataset.draftLabel) item.label = target.value;
      if (target.dataset.draftPoints) item.points = Number(target.value || 1);
      saveState();
    }
  });

  updateInspectionScore();
};

const updateInspectionScore = () => {
  let points = 0;
  let possible = 0;
  let failed = 0;

  state.sections.forEach((section) => {
    section.items.forEach((item) => {
      possible += item.points;
      const checked = document.querySelector(`input[name="result-${item.id}"]:checked`);
      if (!checked) return;
      const value = checked.value;
      if (value === 'pass') points += item.points;
      if (value === 'fail') failed += 1;
    });
  });

  const scorePoints = document.getElementById('score-points');
  const scorePercent = document.getElementById('score-percent');
  const scoreFails = document.getElementById('score-fails');

  if (scorePoints) scorePoints.textContent = `${points} / ${possible}`;
  if (scorePercent) scorePercent.textContent = `${Math.round((points / Math.max(possible, 1)) * 100)}%`;
  if (scoreFails) scoreFails.textContent = String(failed);
};

const setActiveSection = (sectionIndex) => {
  state.activeSection = Math.max(0, Math.min(sectionIndex, state.sections.length - 1));
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.sectionIndex) === state.activeSection);
  });
  document.querySelectorAll('[data-section-panel]').forEach((panel) => {
    panel.classList.toggle('hidden', Number(panel.dataset.sectionPanel) !== state.activeSection);
  });
  saveState();
};

registerGoogleSync();
renderNavigation();
attachEventHandlers();
