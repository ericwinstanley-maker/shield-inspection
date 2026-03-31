// ============================================================
// Shield Inspection Services — Main App Controller
// Handles routing, state, navigation, and page rendering
// ============================================================

import '../index.css';
import { INSPECTION_SECTIONS, A_CODES, createNewInspection } from './models.js';
import { saveInspection, getInspection, getAllInspections, deleteInspection, savePhoto, getPhoto, deletePhoto, compressImage, blobToDataURL, getSetting, setSetting, pullFromCloud, pushToCloud } from './db.js';
import { signIn, signOut, getSession, isAuthConfigured } from './auth.js';

// ============================================================
// APP STATE
// ============================================================

const state = {
  currentPage: 'dashboard',
  currentInspection: null,
  currentSectionIndex: -1,
  autoSaveTimer: null
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  initAuth();
  initNavigation();
  initACodeModal();

  // Check auth
  if (isAuthConfigured()) {
    const session = await getSession();
    if (session) {
      showApp();
    } else {
      showLogin();
    }
  } else {
    // Auth not configured — show app directly (dev mode)
    console.warn('Supabase auth not configured. Running without authentication.');
    showApp();
  }
});

// ============================================================
// AUTHENTICATION
// ============================================================

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-screen').style.display = '';
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');
  navigate('dashboard');

  // Cloud sync after showing app
  syncWithCloud();
}

async function syncWithCloud() {
  if (!isAuthConfigured()) return;

  const syncBtn = document.getElementById('btn-logout');
  const origText = syncBtn.textContent;
  syncBtn.textContent = '↻ Syncing...';
  syncBtn.style.color = 'var(--blue)';

  try {
    // Pull remote data first, then push local data
    const { pulled } = await pullFromCloud();
    const { pushed } = await pushToCloud();

    if (pulled > 0) {
      // Refresh dashboard to show pulled data
      if (state.currentPage === 'dashboard') {
        navigate('dashboard');
      }
      showToast(`Synced ${pulled} inspection${pulled > 1 ? 's' : ''} from cloud`, 'success');
    }

    syncBtn.textContent = 'Logout';
    syncBtn.style.color = '';
  } catch (e) {
    console.warn('Cloud sync error:', e);
    syncBtn.textContent = 'Logout';
    syncBtn.style.color = '';
    showToast('Offline — data saved locally', 'error');
  }
}

function initAuth() {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');

    if (!email || !password) return;

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.classList.remove('visible');

    try {
      await signIn(email, password);
      showApp();
    } catch (err) {
      errorEl.textContent = err.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please try again.'
        : err.message || 'Login failed. Please try again.';
      errorEl.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // Logout button
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await signOut();
    } catch { /* ignore */ }
    showLogin();
  });
}

// ============================================================
// NAVIGATION
// ============================================================

function initNavigation() {
  document.getElementById('btn-menu').addEventListener('click', toggleSideNav);
  document.getElementById('nav-overlay').addEventListener('click', closeSideNav);
  document.getElementById('btn-settings').addEventListener('click', () => navigate('settings'));
}

function toggleSideNav() {
  document.getElementById('side-nav').classList.toggle('open');
}

function closeSideNav() {
  document.getElementById('side-nav').classList.remove('open');
}

function buildSectionNav() {
  const ul = document.getElementById('nav-sections');
  ul.innerHTML = '';

  // Dashboard link
  const dashLi = document.createElement('li');
  dashLi.innerHTML = `<a href="#" data-page="dashboard"><span class="nav-icon">🏠</span> Dashboard</a>`;
  dashLi.querySelector('a').addEventListener('click', (e) => { e.preventDefault(); navigate('dashboard'); closeSideNav(); });
  ul.appendChild(dashLi);

  if (!state.currentInspection) return;

  // Cover/General
  const coverLi = document.createElement('li');
  coverLi.innerHTML = `<a href="#" data-page="cover"><span class="nav-icon">📝</span> Cover & General</a>`;
  coverLi.querySelector('a').addEventListener('click', (e) => { e.preventDefault(); navigate('cover'); closeSideNav(); });
  ul.appendChild(coverLi);

  // Inspection sections
  INSPECTION_SECTIONS.forEach((sec, idx) => {
    const li = document.createElement('li');
    const status = getSectionStatus(sec.id);
    li.innerHTML = `<a href="#" data-page="section-${idx}"><span class="nav-icon">${sec.icon}</span> ${sec.title.replace(' INSPECTION', '').replace(' & SOLID FUEL-BURNING APPLIANCES', '')}<span class="nav-status ${status}"></span></a>`;
    li.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault();
      navigate('section', idx);
      closeSideNav();
    });
    ul.appendChild(li);
  });

  // Summary
  const sumLi = document.createElement('li');
  sumLi.innerHTML = `<a href="#" data-page="summary"><span class="nav-icon">📊</span> Summary & Submit</a>`;
  sumLi.querySelector('a').addEventListener('click', (e) => { e.preventDefault(); navigate('summary'); closeSideNav(); });
  ul.appendChild(sumLi);
}

function getSectionStatus(sectionId) {
  if (!state.currentInspection) return '';
  const section = state.currentInspection.sections[sectionId];
  if (!section) return '';
  const rated = section.items.filter(i => i.rating !== null).length;
  if (rated === 0) return '';
  if (rated === section.items.length) return 'complete';
  return 'partial';
}

function updateActiveNav(page) {
  document.querySelectorAll('.nav-sections a').forEach(a => a.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-sections a[data-page="${page}"]`);
  if (activeLink) activeLink.classList.add('active');
}

// ============================================================
// PAGE ROUTER
// ============================================================

function navigate(page, param) {
  state.currentPage = page;

  switch (page) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'cover':
      renderCoverForm();
      break;
    case 'section':
      state.currentSectionIndex = param;
      renderSectionForm(param);
      break;
    case 'summary':
      renderSummary();
      break;
    case 'settings':
      renderSettings();
      break;
  }

  buildSectionNav();
  updateActiveNav(page === 'section' ? `section-${param}` : page);
  window.scrollTo(0, 0);
}

// ============================================================
// DASHBOARD
// ============================================================

async function renderDashboard() {
  state.currentInspection = null;
  const main = document.getElementById('main-content');
  const inspections = await getAllInspections();

  main.innerHTML = `
    <div class="dashboard-hero">
      <img src="/assets/logo.png" alt="Shield Inspection" class="hero-logo" />
      <h1>Shield Inspection</h1>
      <p>Professional Home Inspection Reports</p>
    </div>
    <button class="btn btn-primary btn-lg new-inspection-btn" id="btn-new">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      New Inspection
    </button>
    <div class="past-inspections">
      <h2>Past Inspections</h2>
      <div class="inspection-list" id="inspection-list">
        ${inspections.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p class="empty-state-text">No inspections yet. Start your first one!</p>
          </div>
        ` : inspections.map(insp => `
          <div class="inspection-card" data-id="${insp.id}">
            <div class="inspection-card-icon">🏠</div>
            <div class="inspection-card-info">
              <div class="inspection-card-address">${insp.cover.street || 'Untitled Inspection'}</div>
              <div class="inspection-card-meta">${insp.cover.clientName ? insp.cover.clientName + ' · ' : ''}${new Date(insp.updatedAt).toLocaleDateString()}</div>
            </div>
            <span class="inspection-card-status ${insp.status === 'completed' ? 'status-completed' : 'status-in-progress'}">
              ${insp.status === 'completed' ? 'Complete' : 'In Progress'}
            </span>
            <div class="inspection-card-actions">
              <button class="btn btn-sm btn-ghost btn-delete-insp" data-id="${insp.id}" title="Delete">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('btn-new').addEventListener('click', startNewInspection);

  // Click to resume
  main.querySelectorAll('.inspection-card[data-id]').forEach(card => {
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.btn-delete-insp')) return;
      const id = card.dataset.id;
      state.currentInspection = await getInspection(id);
      navigate('cover');
    });
  });

  // Delete buttons
  main.querySelectorAll('.btn-delete-insp').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this inspection? This cannot be undone.')) {
        await deleteInspection(btn.dataset.id);
        showToast('Inspection deleted', 'success');
        renderDashboard();
      }
    });
  });
}

async function startNewInspection() {
  const inspection = createNewInspection();
  // Load saved email from settings
  const email = await getSetting('inspectorEmail');
  if (email) inspection.settings.inspectorEmail = email;
  await saveInspection(inspection);
  state.currentInspection = inspection;
  navigate('cover');
  showToast('New inspection started', 'success');
}

// ============================================================
// COVER & GENERAL INFORMATION FORM
// ============================================================

function renderCoverForm() {
  const insp = state.currentInspection;
  if (!insp) return navigate('dashboard');
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="section-header">
      <div class="section-title">Inspection Details</div>
      <div class="section-subtitle">Cover page and general property information</div>
    </div>

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Property Address</span></div>
      <div class="form-group">
        <label class="form-label">Street Address</label>
        <input type="text" class="form-input" id="cover-street" value="${esc(insp.cover.street)}" placeholder="123 Main St" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">City</label>
          <input type="text" class="form-input" id="cover-city" value="${esc(insp.cover.city)}" placeholder="Lewiston" />
        </div>
        <div class="form-group">
          <label class="form-label">State</label>
          <input type="text" class="form-input" id="cover-state" value="${esc(insp.cover.state)}" placeholder="NY" />
        </div>
        <div class="form-group">
          <label class="form-label">ZIP</label>
          <input type="text" class="form-input" id="cover-zip" value="${esc(insp.cover.zip)}" placeholder="14092" />
        </div>
      </div>
    </div>

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Client & Date</span></div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Client Name</label>
          <input type="text" class="form-input" id="cover-client" value="${esc(insp.cover.clientName)}" placeholder="Mr. Smith" />
        </div>
        <div class="form-group">
          <label class="form-label">Inspection Date</label>
          <input type="text" class="form-input" id="cover-date" value="${esc(insp.cover.inspectionDate)}" placeholder="March 30, 2026" />
        </div>
      </div>
    </div>

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">General Information</span></div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Time Started</label>
          <input type="time" class="form-input" id="gen-timestart" value="${esc(insp.general.timeStarted)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Time Completed</label>
          <input type="time" class="form-input" id="gen-timeend" value="${esc(insp.general.timeCompleted)}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Property Type</label>
          <select class="form-select" id="gen-proptype">
            <option value="">— Select —</option>
            ${['Ranch','Colonial','Cape Cod','Split-Level','Bi-Level','Raised Ranch','Two Story','Tri-Level','Bungalow','Cottage','Victorian','Tudor','Other'].map(t => `<option value="${t}" ${insp.general.propertyType === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Garage</label>
          <select class="form-select" id="gen-garage">
            <option value="">— Select —</option>
            ${['None','1 Car','2 Car','3 Car','Carport','Other'].map(t => `<option value="${t}" ${insp.general.garageType === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Driveway</label>
          <select class="form-select" id="gen-driveway">
            <option value="">— Select —</option>
            ${['Asphalt','Concrete','Gravel','Dirt','Brick/Paver','Other','N/A'].map(t => `<option value="${t}" ${insp.general.driveway === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Weather</label>
          <input type="text" class="form-input" id="gen-weather" value="${esc(insp.general.weather)}" placeholder="Clear, Partly Cloudy..." />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Temperature</label>
          <input type="text" class="form-input" id="gen-temp" value="${esc(insp.general.temperature)}" placeholder="65°F" />
        </div>
        <div class="form-group">
          <label class="form-label">Approximate Age (years)</label>
          <input type="text" class="form-input" id="gen-age" value="${esc(insp.general.approximateAge)}" placeholder="1954. 72 yr" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Structure Type</label>
          <select class="form-select" id="gen-structure">
            <option value="">— Select —</option>
            ${['Detached','Attached','Built-in','N/A'].map(t => `<option value="${t}" ${insp.general.structureType === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Occupancy</label>
          <select class="form-select" id="gen-occupancy">
            <option value="">— Select —</option>
            ${['Owner-occupied','Vacant','N/A'].map(t => `<option value="${t}" ${insp.general.occupancy === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Attending / Present</label>
        <div class="checkbox-group" id="gen-attendees">
          ${['Client','Real Estate Agent for Buyer','Real Estate Agent for Seller','Owner','Tenant','No one'].map(att => `
            <label class="checkbox-pill ${insp.general.attendees.includes(att) ? 'checked' : ''}">
              <input type="checkbox" value="${att}" ${insp.general.attendees.includes(att) ? 'checked' : ''} />
              ${att}
            </label>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="page-nav">
      <button class="btn btn-outline" id="btn-back-dash">← Dashboard</button>
      <button class="btn btn-primary" id="btn-next-section">Begin Inspection →</button>
    </div>
  `;

  // Auto-save on change
  const fields = {
    'cover-street': (v) => insp.cover.street = v,
    'cover-city': (v) => insp.cover.city = v,
    'cover-state': (v) => insp.cover.state = v,
    'cover-zip': (v) => insp.cover.zip = v,
    'cover-client': (v) => insp.cover.clientName = v,
    'cover-date': (v) => insp.cover.inspectionDate = v,
    'gen-timestart': (v) => insp.general.timeStarted = v,
    'gen-timeend': (v) => insp.general.timeCompleted = v,
    'gen-proptype': (v) => insp.general.propertyType = v,
    'gen-garage': (v) => insp.general.garageType = v,
    'gen-driveway': (v) => insp.general.driveway = v,
    'gen-weather': (v) => insp.general.weather = v,
    'gen-temp': (v) => insp.general.temperature = v,
    'gen-age': (v) => insp.general.approximateAge = v,
    'gen-structure': (v) => insp.general.structureType = v,
    'gen-occupancy': (v) => insp.general.occupancy = v
  };

  Object.entries(fields).forEach(([id, setter]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => { setter(el.value); autoSave(); });
      el.addEventListener('change', () => { setter(el.value); autoSave(); });
    }
  });

  // Attendee checkboxes
  main.querySelectorAll('#gen-attendees .checkbox-pill').forEach(pill => {
    const cb = pill.querySelector('input');
    pill.addEventListener('click', (e) => {
      if (e.target === cb) return;
      cb.checked = !cb.checked;
      pill.classList.toggle('checked', cb.checked);
      insp.general.attendees = Array.from(main.querySelectorAll('#gen-attendees input:checked')).map(c => c.value);
      autoSave();
    });
  });

  document.getElementById('btn-back-dash').addEventListener('click', () => navigate('dashboard'));
  document.getElementById('btn-next-section').addEventListener('click', () => navigate('section', 0));
}

// ============================================================
// SECTION FORM (reusable for all 10 sections)
// ============================================================

async function renderSectionForm(sectionIndex) {
  const insp = state.currentInspection;
  if (!insp) return navigate('dashboard');

  const sectionDef = INSPECTION_SECTIONS[sectionIndex];
  const sectionData = insp.sections[sectionDef.id];
  const main = document.getElementById('main-content');

  const totalItems = sectionDef.items.length;
  const ratedItems = sectionData.items.filter(i => i.rating !== null).length;
  const progressPct = totalItems > 0 ? Math.round((ratedItems / totalItems) * 100) : 0;

  main.innerHTML = `
    <div class="section-header">
      <div class="section-title">${sectionDef.icon} ${sectionDef.title}</div>
      <div class="section-progress">
        <div class="progress-bar"><div class="progress-fill" style="width: ${progressPct}%"></div></div>
        <span class="progress-text">${ratedItems}/${totalItems}</span>
      </div>
    </div>
    <div id="section-items"></div>
    <div class="page-nav">
      <button class="btn btn-outline" id="btn-prev">${sectionIndex > 0 ? '← ' + INSPECTION_SECTIONS[sectionIndex - 1].title.replace(' INSPECTION', '').replace(' & SOLID FUEL-BURNING APPLIANCES', '') : '← Cover'}</button>
      <button class="btn btn-primary" id="btn-next">${sectionIndex < INSPECTION_SECTIONS.length - 1 ? INSPECTION_SECTIONS[sectionIndex + 1].title.replace(' INSPECTION', '').replace(' & SOLID FUEL-BURNING APPLIANCES', '') + ' →' : 'Summary →'}</button>
    </div>
  `;

  const itemsContainer = document.getElementById('section-items');

  for (let i = 0; i < sectionDef.items.length; i++) {
    const itemDef = sectionDef.items[i];
    const itemData = sectionData.items[i];

    const div = document.createElement('div');
    div.className = 'inspection-item';
    div.id = `item-${itemDef.id}`;

    // Build options checkboxes if this item has them
    let optionsHtml = '';
    if (itemDef.options) {
      optionsHtml = `
        <div class="checkbox-group mt-md">
          ${itemDef.options.map(opt => {
            const key = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
            const checked = itemData.selectedOptions && itemData.selectedOptions[key];
            return `<label class="checkbox-pill ${checked ? 'checked' : ''}" data-opt="${key}">
              <input type="checkbox" ${checked ? 'checked' : ''} />
              ${opt}
            </label>`;
          }).join('')}
        </div>
      `;
    }

    // Build photo thumbnails
    let photosHtml = '';
    if (itemData.photos && itemData.photos.length > 0) {
      const photoThumbs = [];
      for (const photoId of itemData.photos) {
        const photo = await getPhoto(photoId);
        if (photo) {
          const url = await blobToDataURL(photo.thumbnail || photo.blob);
          photoThumbs.push(`<div class="photo-thumb" data-photo-id="${photoId}">
            <img src="${url}" alt="Photo" />
            <button class="photo-delete" data-photo-id="${photoId}">&times;</button>
          </div>`);
        }
      }
      photosHtml = `<div class="photo-strip">${photoThumbs.join('')}</div>`;
    }

    div.innerHTML = `
      <div class="inspection-item-number">Item ${itemDef.num}</div>
      <div class="inspection-item-desc">${itemDef.desc}</div>
      ${optionsHtml}
      <div class="rating-bar" data-item-idx="${i}">
        ${['S','M','P','U','NA','D'].map(r => `
          <div class="rating-pill ${itemData.rating === r ? 'selected-' + r : ''}" data-rating="${r}">${r}</div>
        `).join('')}
      </div>
      <div class="comment-row">
        <textarea class="form-textarea" placeholder="Comments..." data-item-idx="${i}">${esc(itemData.comments)}</textarea>
        <div class="comment-actions">
          <button class="btn btn-icon" title="Insert A-Code" data-item-idx="${i}" data-action="acode">A+</button>
          <button class="btn btn-icon" title="Take Photo" data-item-idx="${i}" data-action="photo">📷</button>
        </div>
      </div>
      ${photosHtml}
      <input type="file" accept="image/*" capture="environment" class="hidden" data-file-input="${i}" />
    `;

    itemsContainer.appendChild(div);
  }

  // --- EVENT HANDLERS ---

  // Rating clicks
  itemsContainer.querySelectorAll('.rating-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const bar = pill.closest('.rating-bar');
      const idx = parseInt(bar.dataset.itemIdx);
      const rating = pill.dataset.rating;

      // Toggle: clicking same rating clears it
      if (sectionData.items[idx].rating === rating) {
        sectionData.items[idx].rating = null;
      } else {
        sectionData.items[idx].rating = rating;
      }

      // Update UI
      bar.querySelectorAll('.rating-pill').forEach(p => {
        p.className = 'rating-pill' + (sectionData.items[idx].rating === p.dataset.rating ? ' selected-' + p.dataset.rating : '');
      });

      // Update progress
      const ratedNow = sectionData.items.filter(i => i.rating !== null).length;
      const pct = Math.round((ratedNow / totalItems) * 100);
      main.querySelector('.progress-fill').style.width = pct + '%';
      main.querySelector('.progress-text').textContent = `${ratedNow}/${totalItems}`;

      autoSave();
    });
  });

  // Comments
  itemsContainer.querySelectorAll('.comment-row textarea').forEach(ta => {
    ta.addEventListener('input', () => {
      const idx = parseInt(ta.dataset.itemIdx);
      sectionData.items[idx].comments = ta.value;
      autoSave();
    });
  });

  // Options checkboxes
  itemsContainer.querySelectorAll('.checkbox-pill[data-opt]').forEach(pill => {
    pill.addEventListener('click', (e) => {
      const cb = pill.querySelector('input');
      if (e.target !== cb) cb.checked = !cb.checked;
      pill.classList.toggle('checked', cb.checked);

      const itemEl = pill.closest('.inspection-item');
      const idx = sectionDef.items.findIndex(it => 'item-' + it.id === itemEl.id);
      if (idx >= 0) {
        if (!sectionData.items[idx].selectedOptions) sectionData.items[idx].selectedOptions = {};
        sectionData.items[idx].selectedOptions[pill.dataset.opt] = cb.checked;
        autoSave();
      }
    });
  });

  // A-Code button
  itemsContainer.querySelectorAll('[data-action="acode"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.itemIdx);
      openACodeModal((code) => {
        const ta = itemsContainer.querySelector(`textarea[data-item-idx="${idx}"]`);
        ta.value += (ta.value ? '  ' : '') + code;
        sectionData.items[idx].comments = ta.value;
        autoSave();
      });
    });
  });

  // Photo button
  itemsContainer.querySelectorAll('[data-action="photo"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.itemIdx);
      const fileInput = itemsContainer.querySelector(`[data-file-input="${idx}"]`);
      fileInput.click();
    });
  });

  // File input change
  itemsContainer.querySelectorAll('[data-file-input]').forEach(input => {
    input.addEventListener('change', async (e) => {
      const idx = parseInt(input.dataset.fileInput);
      const file = e.target.files[0];
      if (!file) return;

      try {
        const blob = await compressImage(file, 1200, 0.8);
        const thumbnail = await compressImage(file, 150, 0.6);
        const photoId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);

        await savePhoto({
          id: photoId,
          inspectionId: insp.id,
          itemId: sectionDef.items[idx].id,
          sectionId: sectionDef.id,
          blob: blob,
          thumbnail: thumbnail,
          label: '',
          timestamp: new Date().toISOString()
        });

        if (!sectionData.items[idx].photos) sectionData.items[idx].photos = [];
        sectionData.items[idx].photos.push(photoId);
        await saveInspection(insp);

        showToast('Photo saved', 'success');
        // Re-render section to show new photo
        renderSectionForm(sectionIndex);
      } catch (err) {
        showToast('Failed to save photo', 'error');
        console.error(err);
      }

      input.value = '';
    });
  });

  // Photo delete
  itemsContainer.querySelectorAll('.photo-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const photoId = btn.dataset.photoId;
      await deletePhoto(photoId);

      // Remove from item data
      for (const item of sectionData.items) {
        if (item.photos) {
          item.photos = item.photos.filter(pid => pid !== photoId);
        }
      }
      await saveInspection(insp);
      showToast('Photo deleted', 'success');
      renderSectionForm(sectionIndex);
    });
  });

  // Navigation
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (sectionIndex > 0) navigate('section', sectionIndex - 1);
    else navigate('cover');
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    if (sectionIndex < INSPECTION_SECTIONS.length - 1) navigate('section', sectionIndex + 1);
    else navigate('summary');
  });
}

// ============================================================
// SUMMARY & SUBMIT
// ============================================================

async function renderSummary() {
  const insp = state.currentInspection;
  if (!insp) return navigate('dashboard');
  const main = document.getElementById('main-content');

  // Gather all P and U rated items
  const concerns = [];
  let summaryNum = 1;
  for (const sec of INSPECTION_SECTIONS) {
    const sectionData = insp.sections[sec.id];
    if (!sectionData) continue;

    for (let i = 0; i < sectionData.items.length; i++) {
      const item = sectionData.items[i];
      if (item.rating === 'P' || item.rating === 'U') {
        concerns.push({
          sNum: `S${summaryNum}`,
          section: sec.title,
          sectionIcon: sec.icon,
          itemDesc: sec.items[i].desc,
          rating: item.rating,
          comments: item.comments,
          photos: item.photos || []
        });
        summaryNum++;
      }
    }
  }

  // Auto-detect A-codes from comments
  const detectedACodes = new Set(insp.addendumCodes || []);
  for (const concern of concerns) {
    const matches = concern.comments.match(/A\d+[a-z]?/g);
    if (matches) {
      matches.forEach(m => detectedACodes.add(m.toUpperCase()));
    }
  }
  // Also scan all comments across all sections
  for (const sec of INSPECTION_SECTIONS) {
    const sectionData = insp.sections[sec.id];
    if (!sectionData) continue;
    for (const item of sectionData.items) {
      const matches = (item.comments || '').match(/A\d+[a-z]?/gi);
      if (matches) matches.forEach(m => detectedACodes.add(m.toUpperCase()));
    }
  }

  main.innerHTML = `
    <div class="section-header">
      <div class="section-title">📊 Summary of Concerns</div>
      <div class="section-subtitle">All items rated Poor (P) or Unsafe (U)</div>
    </div>

    ${concerns.length === 0 ? `
      <div class="card mb-lg">
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <p class="empty-state-text">No Poor or Unsafe items found. Great inspection!</p>
        </div>
      </div>
    ` : concerns.map(c => `
      <div class="concern-item ${c.rating === 'U' ? 'unsafe' : ''}">
        <div class="concern-code">${c.sNum} — ${c.sectionIcon} ${c.section} — ${c.rating === 'U' ? '⚠️ UNSAFE' : '❌ POOR'}</div>
        <div class="concern-text">${c.itemDesc}</div>
        ${c.comments ? `<div class="concern-text mt-md" style="color: var(--text-secondary); font-style: italic;">${esc(c.comments)}</div>` : ''}
      </div>
    `).join('')}

    <div class="card mb-lg mt-xl">
      <div class="card-header"><span class="card-title">Custom Summary Notes</span></div>
      <textarea class="form-textarea" id="summary-text" rows="6" placeholder="Add any additional summary notes here...">${esc(insp.summary.concerns)}</textarea>
    </div>

    <div class="card mb-lg">
      <div class="card-header"><span class="card-title">Addendum Codes (Auto-detected + Manual)</span></div>
      <div class="section-subtitle mb-md">Codes referenced in your comments are auto-checked. You can manually add or remove codes below.</div>
      <div class="addendum-list" id="addendum-list">
        ${A_CODES.map(ac => {
          const isChecked = detectedACodes.has(ac.code.toUpperCase());
          return `
            <div class="addendum-item ${isChecked ? 'checked' : ''}" data-code="${ac.code}">
              <div class="addendum-check">${isChecked ? '✓' : ''}</div>
              <div>
                <div class="addendum-code">${ac.code} (Addendum ${ac.category})</div>
                <div class="addendum-text">${ac.text.substring(0, 150)}...</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <button class="btn btn-primary btn-lg btn-full mt-lg" id="btn-download" style="background: linear-gradient(135deg, var(--blue), var(--blue-dark)); box-shadow: 0 4px 20px rgba(65, 101, 245, 0.4);">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Download Report PDF
    </button>

    <div class="card mb-lg mt-lg">
      <div class="card-header" style="cursor: pointer;" id="email-toggle">
        <span class="card-title">📧 Also Email Report <span style="font-weight:400; color: var(--text-muted); font-size: var(--font-size-sm);">(optional)</span></span>
        <span id="email-toggle-icon" style="color: var(--text-muted); font-size: 20px;">▸</span>
      </div>
      <div id="email-section" class="hidden">
        <div class="form-group mt-md">
          <label class="form-label">Email address</label>
          <input type="email" class="form-input" id="email-address" value="${esc(insp.settings.inspectorEmail)}" placeholder="you@email.com" />
        </div>
        <button class="btn btn-outline btn-full mt-md" id="btn-email">
          📧 Generate & Email PDF
        </button>
      </div>
    </div>

    <div class="page-nav mt-lg">
      <button class="btn btn-outline" id="btn-back-section">← ${INSPECTION_SECTIONS[INSPECTION_SECTIONS.length - 1].title.replace(' INSPECTION', '').replace(' & SOLID FUEL-BURNING APPLIANCES', '')}</button>
      <button class="btn btn-outline" id="btn-back-dash2">Dashboard</button>
    </div>
  `;

  // Summary text
  document.getElementById('summary-text').addEventListener('input', (e) => {
    insp.summary.concerns = e.target.value;
    autoSave();
  });

  // Email field
  document.getElementById('email-address').addEventListener('input', (e) => {
    insp.settings.inspectorEmail = e.target.value;
    setSetting('inspectorEmail', e.target.value);
    autoSave();
  });

  // Email toggle
  document.getElementById('email-toggle').addEventListener('click', () => {
    const section = document.getElementById('email-section');
    const icon = document.getElementById('email-toggle-icon');
    section.classList.toggle('hidden');
    icon.textContent = section.classList.contains('hidden') ? '▸' : '▾';
  });

  // Addendum toggles
  main.querySelectorAll('.addendum-item').forEach(item => {
    item.addEventListener('click', () => {
      const code = item.dataset.code;
      item.classList.toggle('checked');
      const isChecked = item.classList.contains('checked');
      item.querySelector('.addendum-check').textContent = isChecked ? '✓' : '';

      if (isChecked) {
        if (!insp.addendumCodes.includes(code)) insp.addendumCodes.push(code);
      } else {
        insp.addendumCodes = insp.addendumCodes.filter(c => c !== code);
      }
      autoSave();
    });
  });

  // Download PDF (primary action)
  document.getElementById('btn-download').addEventListener('click', handleDownload);

  // Email PDF (secondary action)
  document.getElementById('btn-email').addEventListener('click', handleEmailSubmit);

  // Navigation
  document.getElementById('btn-back-section').addEventListener('click', () => navigate('section', INSPECTION_SECTIONS.length - 1));
  document.getElementById('btn-back-dash2').addEventListener('click', () => navigate('dashboard'));
}

async function handleDownload() {
  const insp = state.currentInspection;
  const btn = document.getElementById('btn-download');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Generating PDF...';

  try {
    const { generatePDF } = await import('./pdf-generator.js');
    const pdfBytes = await generatePDF(insp);

    downloadPDF(pdfBytes, insp);
    showToast('PDF downloaded to your device!', 'success');

    // Mark as completed
    insp.status = 'completed';
    await saveInspection(insp);

    btn.innerHTML = '✅ Downloaded!';
    btn.style.background = 'linear-gradient(135deg, var(--green), #16a34a)';

    // Re-enable after 3 seconds for re-download
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = origHtml;
      btn.style.background = '';
    }, 3000);
  } catch (err) {
    console.error('Download error:', err);
    showToast('Error generating PDF: ' + err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
}

async function handleEmailSubmit() {
  const insp = state.currentInspection;
  const btn = document.getElementById('btn-email');
  const email = insp.settings.inspectorEmail;

  if (!email) {
    showToast('Please enter an email address first', 'error');
    document.getElementById('email-address').focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Generating PDF...';

  try {
    const { generatePDF } = await import('./pdf-generator.js');
    const pdfBytes = await generatePDF(insp);

    btn.textContent = '📧 Sending email...';

    const { sendInspectionEmail } = await import('./email.js');
    await sendInspectionEmail(insp, pdfBytes, email);

    showToast('PDF emailed successfully!', 'success');
    insp.status = 'completed';
    await saveInspection(insp);

    btn.textContent = '✅ Sent!';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '📧 Generate & Email PDF';
    }, 3000);
  } catch (err) {
    console.error('Email error:', err);
    showToast('Email failed: ' + err.message + ' — use Download instead', 'error');
    btn.disabled = false;
    btn.textContent = '📧 Generate & Email PDF';
  }
}

function downloadPDF(pdfBytes, insp) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Inspection_${insp.cover.street || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// SETTINGS
// ============================================================

async function renderSettings() {
  const main = document.getElementById('main-content');
  const email = await getSetting('inspectorEmail') || '';

  main.innerHTML = `
    <div class="section-header">
      <div class="section-title">⚙️ Settings</div>
      <div class="section-subtitle">Configure your inspection app</div>
    </div>

    <div class="card mb-lg settings-section">
      <h3>Inspector Information</h3>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" class="form-input" id="settings-email" value="${esc(email)}" placeholder="your@email.com" />
        <div class="card-subtitle mt-md">Completed inspection PDFs will be sent to this address.</div>
      </div>
    </div>

    <div class="card mb-lg settings-section">
      <h3>EmailJS Configuration</h3>
      <div class="card-subtitle mb-md">Required for direct email sending. Get your keys at <a href="https://www.emailjs.com/" target="_blank" style="color: var(--blue);">emailjs.com</a></div>
      <div class="form-group">
        <label class="form-label">Service ID</label>
        <input type="text" class="form-input" id="settings-ejs-service" value="${esc(await getSetting('emailjs_service') || '')}" placeholder="service_xxxxxxx" />
      </div>
      <div class="form-group">
        <label class="form-label">Template ID</label>
        <input type="text" class="form-input" id="settings-ejs-template" value="${esc(await getSetting('emailjs_template') || '')}" placeholder="template_xxxxxxx" />
      </div>
      <div class="form-group">
        <label class="form-label">Public Key</label>
        <input type="text" class="form-input" id="settings-ejs-key" value="${esc(await getSetting('emailjs_publickey') || '')}" placeholder="xxxxxxxxxxxx" />
      </div>
    </div>

    <div class="card mb-lg settings-section">
      <h3>About</h3>
      <p style="color: var(--text-secondary);">Shield Inspection Services, Inc.</p>
      <p style="color: var(--text-muted);">P.O. Box 205, Lewiston NY 14092</p>
      <p style="color: var(--text-muted);">(716) 807-7813</p>
      <p style="color: var(--text-muted);">License# 16000058435</p>
      <p style="color: var(--text-muted); margin-top: var(--space-md);">App Version 1.0.0</p>
    </div>

    <button class="btn btn-outline btn-full" id="btn-back-dash3">← Back to Dashboard</button>
  `;

  // Save settings
  const settingsFields = {
    'settings-email': 'inspectorEmail',
    'settings-ejs-service': 'emailjs_service',
    'settings-ejs-template': 'emailjs_template',
    'settings-ejs-key': 'emailjs_publickey'
  };

  Object.entries(settingsFields).forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (el) {
      el.addEventListener('input', () => {
        setSetting(key, el.value);
      });
    }
  });

  document.getElementById('btn-back-dash3').addEventListener('click', () => navigate('dashboard'));
}

// ============================================================
// A-CODE MODAL
// ============================================================

let acodeCallback = null;

function initACodeModal() {
  const modal = document.getElementById('acode-modal');
  const search = document.getElementById('acode-search');
  const list = document.getElementById('acode-list');
  const close = document.getElementById('acode-close');
  const backdrop = modal.querySelector('.modal-backdrop');

  close.addEventListener('click', closeACodeModal);
  backdrop.addEventListener('click', closeACodeModal);

  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    list.querySelectorAll('.acode-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

function openACodeModal(callback) {
  acodeCallback = callback;
  const modal = document.getElementById('acode-modal');
  const list = document.getElementById('acode-list');
  const search = document.getElementById('acode-search');

  list.innerHTML = A_CODES.map(ac => `
    <div class="acode-item" data-code="${ac.code}">
      <div class="acode-item-code">${ac.code} — Addendum ${ac.category}</div>
      <div class="acode-item-text">${ac.text}</div>
    </div>
  `).join('');

  list.querySelectorAll('.acode-item').forEach(item => {
    item.addEventListener('click', () => {
      if (acodeCallback) acodeCallback(item.dataset.code);
      closeACodeModal();
    });
  });

  search.value = '';
  modal.classList.remove('hidden');
}

function closeACodeModal() {
  document.getElementById('acode-modal').classList.add('hidden');
  acodeCallback = null;
}

// ============================================================
// AUTO-SAVE
// ============================================================

function autoSave() {
  if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = setTimeout(async () => {
    if (state.currentInspection) {
      await saveInspection(state.currentInspection);
    }
  }, 500);
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// UTILITIES
// ============================================================

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
