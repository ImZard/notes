// ===== Anti-Slop State & Local Storage Architecture =====
let notes = JSON.parse(localStorage.getItem('notes') || '[]');
let labels = JSON.parse(localStorage.getItem('labels') || '[]');
let currentFilter = 'all';
let currentLabelFilter = null;
let currentView = 'grid'; // grid | list
let editingNoteId = null;
let deleteNoteId = null;
let deferredInstallPrompt = null;

// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const sidebar = $('#sidebar');
const sidebarOverlay = $('#sidebarOverlay');
const notesGrid = $('#notesGrid');
const emptyState = $('#emptyState');
const noteModal = $('#noteModal');
const labelModal = $('#labelModal');
const deleteModal = $('#deleteModal');
const searchInput = $('#searchInput');
const sortSelect = $('#sortSelect');
const toastContainer = $('#toastContainer');
const reminderAlert = $('#reminderAlert');
const installBanner = $('#installBanner');
const offlineBanner = $('#offlineBanner');

// ===== Theme Engine (Light / Dark Mode) =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const themeIcon = $('#themeIcon');
    if (themeIcon) {
        themeIcon.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
    }

    const metaThemeColor = $('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#090d16' : '#0f172a');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
}

const DARK_MODE_NOTE_COLORS = {
    '#ffffff': '#111827',
    '#f8fafc': '#161e2e',
    '#fefce8': '#262210',
    '#f0fdf4': '#122619',
    '#eff6ff': '#13233a',
    '#fdf2f8': '#2a1624',
    '#faf5ff': '#241630',
    '#fff7ed': '#2a1c12'
};

// ===== SVG Icon Helpers (Monochrome, Crisp, Accessible) =====
const ICONS = {
    pin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5"/><path d="M9 2h6l-1 7h3l-5 8-5-8h3z"/></svg>`,
    pinFilled: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 17v5"/><path d="M9 2h6l-1 7h3l-5 8-5-8h3z"/></svg>`,
    archive: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>`,
    unarchive: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><polyline points="10 12 12 10 14 12"/></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
    clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
    check: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
    grid: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    list: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
};

// ===== Utilities =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function save() {
    try {
        localStorage.setItem('notes', JSON.stringify(notes));
        localStorage.setItem('labels', JSON.stringify(labels));
        updateStorageInfo();
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            showToast('Penyimpanan lokal penuh. Hapus beberapa catatan.');
        }
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins}m lalu`;
    if (hours < 24) return `${hours}j lalu`;
    if (days < 7) return `${days}h lalu`;

    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatReminder(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' ' +
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTimeLocal(d) {
    if (!d) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isOverdue(dateStr) {
    return new Date(dateStr) < new Date();
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 2800);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateStorageInfo() {
    const info = $('#storageInfo');
    if (!info) return;
    const dataSize = new Blob([localStorage.getItem('notes') || '', localStorage.getItem('labels') || '']).size;
    const sizeStr = dataSize < 1024 ? `${dataSize} B` : `${(dataSize / 1024).toFixed(1)} KB`;
    info.textContent = `Lokal: ${sizeStr} • ${notes.length} catatan`;
}

// ===== Filter & Search Engine =====
function getFilteredNotes() {
    let filtered = [...notes];

    // Filter by view tab
    if (currentFilter === 'reminder') {
        filtered = filtered.filter(n => n.reminder && !n.archived);
    } else if (currentFilter === 'pinned') {
        filtered = filtered.filter(n => n.pinned && !n.archived);
    } else if (currentFilter === 'archived') {
        filtered = filtered.filter(n => n.archived);
    } else {
        filtered = filtered.filter(n => !n.archived);
    }

    // Filter by label
    if (currentLabelFilter) {
        filtered = filtered.filter(n => n.labels && n.labels.includes(currentLabelFilter));
    }

    // Search query
    const query = searchInput.value.toLowerCase().trim();
    if (query) {
        filtered = filtered.filter(n =>
            (n.title || '').toLowerCase().includes(query) ||
            (n.content || '').toLowerCase().includes(query) ||
            (n.checklist || []).some(item => item.text.toLowerCase().includes(query))
        );
    }

    // Sort order
    const sort = sortSelect.value;
    if (sort === 'newest') {
        filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else if (sort === 'oldest') {
        filtered.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
    } else if (sort === 'alpha') {
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sort === 'reminder') {
        filtered.sort((a, b) => {
            if (!a.reminder) return 1;
            if (!b.reminder) return -1;
            return new Date(a.reminder) - new Date(b.reminder);
        });
    }

    // Pinning discipline
    if (currentFilter !== 'pinned') {
        const pinned = filtered.filter(n => n.pinned);
        const unpinned = filtered.filter(n => !n.pinned);
        filtered = [...pinned, ...unpinned];
    }

    return filtered;
}

// ===== Note Card Rendering =====
function renderNotes() {
    const filtered = getFilteredNotes();

    if (filtered.length === 0) {
        notesGrid.style.display = 'none';
        emptyState.style.display = 'block';

        const emptyTitle = $('#emptyTitle');
        const emptyDesc = $('#emptyDesc');

        if (searchInput.value.trim()) {
            emptyTitle.textContent = 'Tidak ada hasil';
            emptyDesc.textContent = 'Tidak ditemukan catatan yang cocok dengan kata kunci pencarian.';
        } else if (currentFilter === 'archived') {
            emptyTitle.textContent = 'Arsip kosong';
            emptyDesc.textContent = 'Catatan yang diarsipkan akan muncul pada halaman ini.';
        } else if (currentFilter === 'reminder') {
            emptyTitle.textContent = 'Tidak ada pengingat aktif';
            emptyDesc.textContent = 'Atur pengingat pada catatan untuk melihat daftarnya di sini.';
        } else if (currentFilter === 'pinned') {
            emptyTitle.textContent = 'Tidak ada catatan disematkan';
            emptyDesc.textContent = 'Sematkan catatan penting agar selalu tampil paling atas.';
        } else {
            emptyTitle.textContent = 'Belum ada catatan';
            emptyDesc.textContent = 'Mulai susun catatan ide, referensi, atau daftar tugas harian Anda.';
        }
        return;
    }

    notesGrid.style.display = '';
    emptyState.style.display = 'none';

    notesGrid.innerHTML = filtered.map((note, index) => {
        const noteLabels = (note.labels || []).map(lId => labels.find(l => l.id === lId)).filter(Boolean);
        const hasChecklist = note.checklist && note.checklist.length > 0;
        const checkedCount = hasChecklist ? note.checklist.filter(i => i.checked).length : 0;
        const noteColor = note.color || '#ffffff';
        const darkColor = DARK_MODE_NOTE_COLORS[noteColor] || '#111827';
        const hasCustomColor = noteColor !== '#ffffff';
        const delay = Math.min(index * 50, 400);

        return `
            <article class="note-card ${note.pinned ? 'is-pinned' : ''}" 
                     data-id="${note.id}" 
                     data-has-custom-color="${hasCustomColor ? 'true' : 'false'}"
                     style="--card-light-bg: ${noteColor}; --card-dark-bg: ${darkColor}; --enter-delay: ${delay}ms;" 
                     onclick="openEditNote('${note.id}')">
                <div class="note-card-header">
                    <h3 class="note-card-title">${escapeHtml(note.title || 'Tanpa Judul')}</h3>
                    <div class="note-card-actions">
                        <button class="card-action-btn ${note.pinned ? 'active' : ''}" onclick="event.stopPropagation(); togglePin('${note.id}')" title="${note.pinned ? 'Lepas sematan' : 'Sematkan'}" aria-label="Sematkan">
                            ${note.pinned ? ICONS.pinFilled : ICONS.pin}
                        </button>
                        <button class="card-action-btn" onclick="event.stopPropagation(); toggleArchive('${note.id}')" title="${note.archived ? 'Keluarkan dari arsip' : 'Arsipkan'}" aria-label="Arsipkan">
                            ${note.archived ? ICONS.unarchive : ICONS.archive}
                        </button>
                        <button class="card-action-btn danger" onclick="event.stopPropagation(); confirmDelete('${note.id}')" title="Hapus" aria-label="Hapus">
                            ${ICONS.trash}
                        </button>
                    </div>
                </div>

                ${note.content ? `<div class="note-card-content">${escapeHtml(note.content)}</div>` : ''}

                ${hasChecklist ? `
                    <div class="note-card-checklist">
                        ${note.checklist.slice(0, 3).map(item => `
                            <div class="checklist-preview-item ${item.checked ? 'checked' : ''}">
                                <span class="preview-checkbox">${item.checked ? ICONS.check : ''}</span>
                                <span>${escapeHtml(item.text)}</span>
                            </div>
                        `).join('')}
                        <div class="checklist-counter">${checkedCount} dari ${note.checklist.length} butir selesai</div>
                    </div>
                ` : ''}

                ${noteLabels.length > 0 ? `
                    <div class="note-card-labels">
                        ${noteLabels.map(l => `<span class="note-label-chip" style="background:${l.color}">${escapeHtml(l.name)}</span>`).join('')}
                    </div>
                ` : ''}

                <div class="note-card-footer">
                    <span class="note-card-date">${formatDate(note.updatedAt)}</span>
                    ${note.reminder ? `
                        <span class="note-card-reminder ${isOverdue(note.reminder) ? 'overdue' : ''}">
                            ${ICONS.clock}
                            <span>${formatReminder(note.reminder)}</span>
                        </span>
                    ` : ''}
                </div>
            </article>
        `;
    }).join('');

    updateBadges();
}

// ===== Badge Counter Update =====
function updateBadges() {
    const active = notes.filter(n => !n.archived);
    $('#badgeAll').textContent = active.length;
    $('#badgeReminder').textContent = active.filter(n => n.reminder).length;
    $('#badgePinned').textContent = active.filter(n => n.pinned).length;
    $('#badgeArchived').textContent = notes.filter(n => n.archived).length;
}

// ===== Labels Management =====
function renderLabels() {
    const labelList = $('#labelList');
    if (!labelList) return;

    if (labels.length === 0) {
        labelList.innerHTML = `<span style="font-size:0.75rem;color:var(--text-muted);padding:4px 8px;">Belum ada label</span>`;
        renderLabelSelector();
        return;
    }

    labelList.innerHTML = labels.map(l => `
        <button class="label-item ${currentLabelFilter === l.id ? 'active' : ''}" onclick="filterByLabel('${l.id}')">
            <span class="label-dot" style="background:${l.color}"></span>
            <span class="label-item-name">${escapeHtml(l.name)}</span>
            <span class="delete-label" onclick="event.stopPropagation(); deleteLabel('${l.id}')" title="Hapus label" role="button">×</span>
        </button>
    `).join('');

    renderLabelSelector();
}

function renderLabelSelector() {
    const selector = $('#labelSelector');
    if (!selector) return;

    if (labels.length === 0) {
        selector.innerHTML = `<span style="font-size:0.75rem;color:var(--text-muted)">Belum ada label. Tambahkan melalui menu samping.</span>`;
        return;
    }

    selector.innerHTML = labels.map(l => `
        <span class="label-chip" data-label-id="${l.id}" style="background:${l.color}" onclick="toggleLabelSelection(this)">${escapeHtml(l.name)}</span>
    `).join('');
}

function toggleLabelSelection(el) {
    el.classList.toggle('selected');
}

function filterByLabel(labelId) {
    if (currentLabelFilter === labelId) {
        currentLabelFilter = null;
    } else {
        currentLabelFilter = labelId;
    }
    renderLabels();
    renderNotes();

    const label = labels.find(l => l.id === labelId);
    if (currentLabelFilter && label) {
        $('#pageTitle').textContent = `Label: ${label.name}`;
    } else {
        updatePageTitle();
    }
    if (isMobileView()) closeSidebar();
}

function deleteLabel(labelId) {
    labels = labels.filter(l => l.id !== labelId);
    notes.forEach(n => {
        if (n.labels) n.labels = n.labels.filter(id => id !== labelId);
    });
    if (currentLabelFilter === labelId) currentLabelFilter = null;
    save();
    renderLabels();
    renderNotes();
    showToast('Label telah dihapus.');
}

// ===== Note CRUD Operations =====
function openNewNote() {
    editingNoteId = null;
    $('#modalTitle').textContent = 'Catatan Baru';
    $('#noteTitle').value = '';
    $('#noteContent').value = '';
    $('#enableChecklist').checked = false;
    $('#checklistContainer').style.display = 'none';
    $('#checklistItems').innerHTML = '';
    $('#enableReminder').checked = false;
    $('#reminderFields').style.display = 'none';
    $('#reminderDate').value = '';
    $('#reminderRepeat').value = 'none';

    // Reset color
    $$('#colorOptions .color-dot').forEach(d => d.classList.remove('active'));
    const defaultColorDot = $('#colorOptions .color-dot');
    if (defaultColorDot) defaultColorDot.classList.add('active');

    // Reset labels
    renderLabelSelector();

    noteModal.classList.add('active');
    setTimeout(() => $('#noteTitle').focus(), 150);
}

function openEditNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    editingNoteId = id;
    $('#modalTitle').textContent = 'Edit Catatan';
    $('#noteTitle').value = note.title || '';
    $('#noteContent').value = note.content || '';

    // Color active state
    $$('#colorOptions .color-dot').forEach(d => {
        d.classList.toggle('active', d.dataset.color === (note.color || '#ffffff'));
    });

    // Checklist state
    if (note.checklist && note.checklist.length > 0) {
        $('#enableChecklist').checked = true;
        $('#checklistContainer').style.display = 'block';
        renderChecklistItems(note.checklist);
    } else {
        $('#enableChecklist').checked = false;
        $('#checklistContainer').style.display = 'none';
        $('#checklistItems').innerHTML = '';
    }

    // Reminder state
    if (note.reminder) {
        $('#enableReminder').checked = true;
        $('#reminderFields').style.display = 'flex';
        $('#reminderDate').value = note.reminder;
        $('#reminderRepeat').value = note.reminderRepeat || 'none';
    } else {
        $('#enableReminder').checked = false;
        $('#reminderFields').style.display = 'none';
        $('#reminderDate').value = '';
        $('#reminderRepeat').value = 'none';
    }

    // Labels selection
    renderLabelSelector();
    if (note.labels) {
        note.labels.forEach(lId => {
            const chip = $(`#labelSelector [data-label-id="${lId}"]`);
            if (chip) chip.classList.add('selected');
        });
    }

    noteModal.classList.add('active');
    setTimeout(() => $('#noteTitle').focus(), 150);
}

function saveNote() {
    const title = $('#noteTitle').value.trim();
    const content = $('#noteContent').value.trim();
    const color = $('#colorOptions .color-dot.active')?.dataset.color || '#ffffff';

    // Checklist items
    let checklist = [];
    if ($('#enableChecklist').checked) {
        $$('#checklistItems .checklist-item').forEach(item => {
            const text = item.querySelector('.item-text').textContent;
            const checked = item.querySelector('input[type="checkbox"]').checked;
            checklist.push({ text, checked });
        });

        // Auto-save pending input item if user forgot to press 'Tambah'
        const pendingItemText = $('#checklistInput')?.value.trim();
        if (pendingItemText) {
            checklist.push({ text: pendingItemText, checked: false });
            $('#checklistInput').value = '';
        }
    }

    // Reminder setup
    let reminder = null;
    let reminderRepeat = 'none';
    if ($('#enableReminder').checked && $('#reminderDate').value) {
        reminder = $('#reminderDate').value;
        reminderRepeat = $('#reminderRepeat').value;
    }

    // Selected labels
    const selectedLabels = [];
    $$('#labelSelector .label-chip.selected').forEach(el => {
        selectedLabels.push(el.dataset.labelId);
    });

    if (!title && !content && checklist.length === 0) {
        showToast('Isi judul atau konten catatan.');
        return;
    }

    if (editingNoteId) {
        const note = notes.find(n => n.id === editingNoteId);
        if (note) {
            note.title = title;
            note.content = content;
            note.color = color;
            note.checklist = checklist;
            note.reminder = reminder;
            note.reminderRepeat = reminderRepeat;
            note.labels = selectedLabels;
            note._notified = false;
            note.updatedAt = new Date().toISOString();
        }
        showToast('Catatan diperbarui.');
    } else {
        const newNote = {
            id: generateId(),
            title: title || 'Tanpa Judul',
            content,
            color,
            checklist,
            reminder,
            reminderRepeat,
            labels: selectedLabels,
            pinned: false,
            archived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        notes.unshift(newNote);
        showToast('Catatan disimpan.');
    }

    save();
    renderNotes();
    closeNoteModal();
}

function closeNoteModal() {
    noteModal.classList.remove('active');
    editingNoteId = null;
}

function togglePin(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.pinned = !note.pinned;
        save();
        renderNotes();
        showToast(note.pinned ? 'Catatan disematkan.' : 'Sematan dilepas.');
    }
}

function toggleArchive(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.archived = !note.archived;
        if (note.archived) note.pinned = false;
        save();
        renderNotes();
        showToast(note.archived ? 'Catatan diarsipkan.' : 'Catatan dikembalikan.');
    }
}

function confirmDelete(id) {
    deleteNoteId = id;
    deleteModal.classList.add('active');
}

function deleteNote() {
    if (!deleteNoteId) return;
    notes = notes.filter(n => n.id !== deleteNoteId);
    save();
    renderNotes();
    deleteModal.classList.remove('active');
    deleteNoteId = null;
    showToast('Catatan telah dihapus.');
}

// ===== Checklist Builder =====
function renderChecklistItems(items) {
    const container = $('#checklistItems');
    container.innerHTML = items.map(item => `
        <div class="checklist-item">
            <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="this.nextElementSibling.classList.toggle('checked', this.checked)">
            <span class="item-text ${item.checked ? 'checked' : ''}">${escapeHtml(item.text)}</span>
            <button class="remove-item" onclick="this.parentElement.remove()" title="Hapus butir" type="button">×</button>
        </div>
    `).join('');
}

function addChecklistItem() {
    const input = $('#checklistInput');
    const text = input.value.trim();
    if (!text) return;

    const item = document.createElement('div');
    item.className = 'checklist-item';
    item.innerHTML = `
        <input type="checkbox" onchange="this.nextElementSibling.classList.toggle('checked', this.checked)">
        <span class="item-text">${escapeHtml(text)}</span>
        <button class="remove-item" onclick="this.parentElement.remove()" title="Hapus butir" type="button">×</button>
    `;
    $('#checklistItems').appendChild(item);
    input.value = '';
    input.focus();
}

// ===== Reminder Engine =====
function checkReminders() {
    const now = new Date();
    notes.forEach(note => {
        if (!note.reminder || note.archived) return;
        const reminderTime = new Date(note.reminder);
        const diff = reminderTime - now;

        if (diff <= 0 && diff > -120000 && !note._notified) {
            note._notified = true;
            showReminderAlert(note);

            if (note.reminderRepeat !== 'none') {
                const next = new Date(reminderTime);
                while (next <= now) {
                    if (note.reminderRepeat === 'daily') next.setDate(next.getDate() + 1);
                    else if (note.reminderRepeat === 'weekly') next.setDate(next.getDate() + 7);
                    else if (note.reminderRepeat === 'monthly') next.setMonth(next.getMonth() + 1);
                    else break;
                }
                note.reminder = formatDateTimeLocal(next);
                note._notified = false;
                save();
            }
        }

        if (diff > 30000) {
            note._notified = false;
        }
    });
}

function showReminderAlert(note) {
    $('#reminderAlertTitle').textContent = note.title || 'Pengingat Waktu';
    $('#reminderAlertText').textContent = note.content || 'Waktu untuk catatan ini telah tiba.';
    reminderAlert.style.display = 'flex';

    if ('vibrate' in navigator) {
        navigator.vibrate([150, 80, 150]);
    }

    if (Notification.permission === 'granted') {
        new Notification(note.title || 'Pengingat Waktu', {
            body: note.content || 'Waktu untuk catatan ini telah tiba.',
            badge: 'icons/icon-96.png',
            icon: 'icons/icon-192.png',
            tag: 'reminder-' + note.id,
            renotify: true
        });
    }
}

// ===== Data Portability (Export & Import) =====
function exportNotes() {
    const data = {
        app: 'Catatanku',
        version: 1,
        exportedAt: new Date().toISOString(),
        notes: notes,
        labels: labels
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catatanku-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data berhasil diekspor.');
}

function importNotes(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.notes || !Array.isArray(data.notes)) {
                showToast('Berkas JSON tidak sesuai struktur Catatanku.');
                return;
            }

            const existingIds = new Set(notes.map(n => n.id));
            let newCount = 0;
            data.notes.forEach(n => {
                if (!existingIds.has(n.id)) {
                    notes.push(n);
                    newCount++;
                }
            });

            if (data.labels && Array.isArray(data.labels)) {
                const existingLabelIds = new Set(labels.map(l => l.id));
                data.labels.forEach(l => {
                    if (!existingLabelIds.has(l.id)) {
                        labels.push(l);
                    }
                });
            }

            save();
            renderNotes();
            renderLabels();
            showToast(`${newCount} catatan berhasil diimpor.`);
        } catch (err) {
            showToast('Gagal memproses berkas JSON.');
        }
    };
    reader.readAsText(file);
}

// ===== PWA Offline Service Worker =====
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            showToast('Aplikasi telah diperbarui ke versi terbaru.');
                        }
                    });
                });
            })
            .catch(() => {});
    }
}

// ===== PWA Installation Prompt =====
function isRunningStandalone() {
    return (window.matchMedia('(display-mode: standalone)').matches) || 
           (window.navigator.standalone === true) || 
           document.referrer.includes('android-app://');
}

function updateInstallUI() {
    const sidebarInstallBtn = $('#sidebarInstallBtn');
    if (isRunningStandalone()) {
        if (sidebarInstallBtn) sidebarInstallBtn.style.display = 'none';
        if (installBanner) installBanner.style.display = 'none';
    } else {
        if (sidebarInstallBtn) sidebarInstallBtn.style.display = 'flex';
    }
}

async function triggerInstallPrompt() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const result = await deferredInstallPrompt.userChoice;
        if (result.outcome === 'accepted') {
            showToast('Aplikasi berhasil dipasang.');
            if (installBanner) installBanner.style.display = 'none';
        }
        deferredInstallPrompt = null;
        updateInstallUI();
    } else {
        openInstallHelp();
    }
}

function openInstallHelp() {
    const modal = $('#installHelpModal');
    const body = $('#installHelpBody');
    if (!modal || !body) return;

    if (isRunningStandalone()) {
        body.innerHTML = `
            <p><strong>Aplikasi sudah terpasang.</strong></p>
            <p style="margin-top:6px;font-size:0.84rem;color:var(--text-muted)">Catatanku saat ini sedang berjalan dalam mode aplikasi mandiri (PWA standalone).</p>
        `;
    } else if (window.location.protocol === 'file:') {
        body.innerHTML = `
            <p style="color:var(--warning);font-weight:600;margin-bottom:8px;">⚠️ Berjalan di Protokol file://</p>
            <p style="font-size:0.84rem;line-height:1.6">PWA (Progressive Web App) memerlukan web server lokal (origin http://) agar browser mengaktifkan fitur instalasi dan service worker.</p>
            <div class="install-note-box">
                <strong>Cara menjalankan:</strong>
                <ol style="margin-left:18px;margin-top:6px;line-height:1.6">
                    <li>Buka terminal/PowerShell di folder project</li>
                    <li>Jalankan perintah: <code>npx serve .</code></li>
                    <li>Buka alamat yang tampil (contoh: <code>http://localhost:3000</code>) di Chrome</li>
                </ol>
            </div>
        `;
    } else {
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);

        if (isIOS) {
            body.innerHTML = `
                <div class="install-guide-list">
                    <div class="install-guide-step">
                        <span class="install-step-num">1</span>
                        <span>Ketuk tombol <strong>Bagikan (Share)</strong> di bilah navigasi bawah Safari.</span>
                    </div>
                    <div class="install-guide-step">
                        <span class="install-step-num">2</span>
                        <span>Gulir ke bawah dan pilih <strong>'Tambahkan ke Layar Utama' (Add to Home Screen)</strong>.</span>
                    </div>
                    <div class="install-guide-step">
                        <span class="install-step-num">3</span>
                        <span>Ketuk <strong>Tambah</strong> di pojok kanan atas.</span>
                    </div>
                </div>
            `;
        } else if (isAndroid) {
            body.innerHTML = `
                <div class="install-guide-list">
                    <div class="install-guide-step">
                        <span class="install-step-num">1</span>
                        <span>Ketuk ikon <strong>Menu Titik Tiga (⋮)</strong> di pojok kanan atas Chrome.</span>
                    </div>
                    <div class="install-guide-step">
                        <span class="install-step-num">2</span>
                        <span>Pilih opsi <strong>'Pasang aplikasi'</strong> atau <strong>'Tambahkan ke Layar Utama'</strong>.</span>
                    </div>
                    <div class="install-guide-step">
                        <span class="install-step-num">3</span>
                        <span>Konfirmasi pemasangan dengan memilih <strong>Pasang</strong>.</span>
                    </div>
                </div>
                <div class="install-note-box">Ikon aplikasi akan otomatis tampil di daftar aplikasi dan layar utama HP Anda.</div>
            `;
        } else {
            body.innerHTML = `
                <div class="install-guide-list">
                    <div class="install-guide-step">
                        <span class="install-step-num">1</span>
                        <span>Klik ikon <strong>Pasang / Install</strong> di bilah alamat (URL bar) browser sebelah kanan.</span>
                    </div>
                    <div class="install-guide-step">
                        <span class="install-step-num">2</span>
                        <span>Atau buka <strong>Menu Titik Tiga (⋮)</strong> browser lalu pilih <strong>'Pasang Catatanku'</strong>.</span>
                    </div>
                </div>
                <div class="install-note-box">Aplikasi akan terpasang di komputer dan dapat dibuka langsung tanpa browser.</div>
            `;
        }
    }

    modal.classList.add('active');
}

function setupInstallPrompt() {
    updateInstallUI();

    // Hapus batasan dismiss lama agar banner bisa tampil kembali jika didukung
    localStorage.removeItem('installDismissed');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        updateInstallUI();

        if (!isRunningStandalone() && !sessionStorage.getItem('installBannerDismissed')) {
            installBanner.style.display = 'flex';
        }
    });

    $('#installBtn')?.addEventListener('click', triggerInstallPrompt);
    $('#sidebarInstallBtn')?.addEventListener('click', () => {
        triggerInstallPrompt();
        if (isMobileView()) closeSidebar();
    });

    $('#dismissInstall')?.addEventListener('click', () => {
        installBanner.style.display = 'none';
        sessionStorage.setItem('installBannerDismissed', 'true');
    });

    $$('.close-install-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            $('#installHelpModal')?.classList.remove('active');
        });
    });

    $('#installHelpModal')?.addEventListener('click', (e) => {
        if (e.target === $('#installHelpModal')) {
            $('#installHelpModal').classList.remove('active');
        }
    });

    window.addEventListener('appinstalled', () => {
        if (installBanner) installBanner.style.display = 'none';
        deferredInstallPrompt = null;
        updateInstallUI();
        showToast('Catatanku telah terpasang di perangkat.');
    });
}

// ===== Network State Tracking =====
function setupNetworkDetection() {
    function updateOnlineStatus() {
        if (!navigator.onLine) {
            offlineBanner.style.display = 'flex';
        } else {
            offlineBanner.style.display = 'none';
        }
    }

    window.addEventListener('online', () => {
        offlineBanner.style.display = 'none';
        showToast('Koneksi internet terhubung.');
    });

    window.addEventListener('offline', () => {
        offlineBanner.style.display = 'flex';
        showToast('Beralih ke mode offline.');
    });

    updateOnlineStatus();
}

// ===== Navigation State =====
function updatePageTitle() {
    const titles = {
        all: 'Semua Catatan',
        reminder: 'Pengingat Waktu',
        pinned: 'Catatan Disematkan',
        archived: 'Arsip Catatan'
    };
    $('#pageTitle').textContent = titles[currentFilter] || 'Semua Catatan';
}

function isMobileView() {
    return window.innerWidth <= 768;
}

function openSidebar() {
    if (isMobileView()) {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
    } else {
        sidebar.classList.remove('collapsed');
        document.body.classList.remove('sidebar-is-collapsed');
        localStorage.setItem('sidebarCollapsed', '0');
    }
}

function closeSidebar(isUserAction = false) {
    if (isMobileView()) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    } else if (isUserAction) {
        sidebar.classList.add('collapsed');
        document.body.classList.add('sidebar-is-collapsed');
        localStorage.setItem('sidebarCollapsed', '1');
    }
}

function toggleSidebar() {
    if (isMobileView()) {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    } else {
        if (sidebar.classList.contains('collapsed')) {
            openSidebar();
        } else {
            closeSidebar(true);
        }
    }
}

// ===== Event Listeners Initializer =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    registerServiceWorker();
    setupInstallPrompt();
    setupNetworkDetection();

    // Browser Notification permission request
    if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
            Notification.requestPermission();
        }, 4000);
    }

    renderNotes();
    renderLabels();
    updateStorageInfo();

    // Restore desktop collapsed sidebar state if saved
    if (!isMobileView() && localStorage.getItem('sidebarCollapsed') === '1') {
        sidebar.classList.add('collapsed');
        document.body.classList.add('sidebar-is-collapsed');
    }

    // Check reminders periodically
    setInterval(checkReminders, 10000);
    checkReminders();

    // Navigation filter tabs
    $$('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            currentLabelFilter = null;
            renderLabels();
            updatePageTitle();
            renderNotes();
            if (isMobileView()) closeSidebar();
        });
    });

    // Action Triggers
    $('#topbarNewNote')?.addEventListener('click', openNewNote);
    $('#fabAdd')?.addEventListener('click', openNewNote);

    // Modal Events
    $('#closeModal')?.addEventListener('click', closeNoteModal);
    $('#cancelNote')?.addEventListener('click', closeNoteModal);
    $('#saveNote')?.addEventListener('click', saveNote);

    noteModal.addEventListener('click', (e) => {
        if (e.target === noteModal) closeNoteModal();
    });

    // Checklist Toggle
    $('#enableChecklist').addEventListener('change', (e) => {
        $('#checklistContainer').style.display = e.target.checked ? 'block' : 'none';
    });

    $('#addChecklistItem').addEventListener('click', addChecklistItem);
    $('#checklistInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addChecklistItem();
        }
    });

    // Reminder Toggle
    $('#enableReminder').addEventListener('change', (e) => {
        $('#reminderFields').style.display = e.target.checked ? 'flex' : 'none';
        if (e.target.checked && !$('#reminderDate').value) {
            const d = new Date();
            d.setHours(d.getHours() + 1);
            d.setMinutes(0);
            $('#reminderDate').value = formatDateTimeLocal(d);
        }
    });

    // Color Selector
    $$('#colorOptions .color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            $$('#colorOptions .color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
        });
    });

    // Search and Sort
    searchInput.addEventListener('input', renderNotes);
    sortSelect.addEventListener('change', renderNotes);

    // Theme Toggle
    $('#themeToggle')?.addEventListener('click', toggleTheme);

    // Grid / List View Toggle
    $('#toggleView').addEventListener('click', () => {
        currentView = currentView === 'grid' ? 'list' : 'grid';
        notesGrid.classList.toggle('list-view', currentView === 'list');
        $('#viewIcon').innerHTML = currentView === 'grid' ? ICONS.grid : ICONS.list;
    });

    // Sidebar Toggle (Mobile & Desktop Collapsible)
    $('#openSidebar')?.addEventListener('click', openSidebar);
    $('#closeSidebar')?.addEventListener('click', () => closeSidebar(true));
    sidebarOverlay?.addEventListener('click', () => closeSidebar(true));

    // Label Modal
    $('#addLabelBtn').addEventListener('click', () => {
        $('#labelName').value = '';
        $$('#labelColorOptions .color-dot').forEach(d => d.classList.remove('active'));
        $('#labelColorOptions .color-dot')?.classList.add('active');
        labelModal.classList.add('active');
    });

    $$('.close-label-modal').forEach(btn => {
        btn.addEventListener('click', () => labelModal.classList.remove('active'));
    });

    labelModal.addEventListener('click', (e) => {
        if (e.target === labelModal) labelModal.classList.remove('active');
    });

    $$('#labelColorOptions .color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            $$('#labelColorOptions .color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
        });
    });

    $('#saveLabel').addEventListener('click', () => {
        const name = $('#labelName').value.trim();
        const color = $('#labelColorOptions .color-dot.active')?.dataset.color || '#dc2626';
        if (!name) {
            showToast('Tuliskan nama label.');
            return;
        }
        labels.push({ id: generateId(), name, color });
        save();
        renderLabels();
        labelModal.classList.remove('active');
        showToast('Label ditambahkan.');
    });

    // Delete Modal
    $$('.close-delete-modal').forEach(btn => {
        btn.addEventListener('click', () => deleteModal.classList.remove('active'));
    });

    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) deleteModal.classList.remove('active');
    });

    $('#confirmDelete').addEventListener('click', deleteNote);

    // Dismiss Reminder
    $('#dismissReminder').addEventListener('click', () => {
        reminderAlert.style.display = 'none';
    });

    // Export / Import
    $('#exportBtn').addEventListener('click', () => {
        exportNotes();
        closeSidebar();
    });

    const importFile = $('#importFile');
    $('#importBtn').addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importNotes(e.target.files[0]);
            e.target.value = '';
            closeSidebar();
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (noteModal.classList.contains('active')) closeNoteModal();
            if (labelModal.classList.contains('active')) labelModal.classList.remove('active');
            if (deleteModal.classList.contains('active')) deleteModal.classList.remove('active');
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openNewNote();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            toggleSidebar();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            toggleTheme();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !noteModal.classList.contains('active')) {
            e.preventDefault();
            searchInput.focus();
        }
    });

    noteModal.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            saveNote();
        }
    });

    // Initialize Card Tilt & Scroll Parallax
    initParallaxEffects();

    // Handle PWA shortcut action (?action=new)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new') {
        setTimeout(openNewNote, 250);
    }
});

// ===== Parallax & Motion Engine =====
function initParallaxEffects() {
    const container = $('#notesContainer');
    if (!container) return;

    // Scroll Parallax for ambient background
    container.addEventListener('scroll', () => {
        const scrolled = container.scrollTop;
        container.style.setProperty('--scroll-y', `${scrolled}px`);
    }, { passive: true });

    // Interactive 3D Card Parallax on pointer move
    container.addEventListener('mousemove', (e) => {
        const card = e.target.closest('.note-card');
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(700px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px)`;
    });

    container.addEventListener('mouseout', (e) => {
        const card = e.target.closest('.note-card');
        if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
            card.style.transform = '';
        }
    });
}

// Global functions for inline HTML calls
window.openEditNote = openEditNote;
window.openNewNote = openNewNote;
window.togglePin = togglePin;
window.toggleArchive = toggleArchive;
window.confirmDelete = confirmDelete;
window.filterByLabel = filterByLabel;
window.deleteLabel = deleteLabel;
window.toggleLabelSelection = toggleLabelSelection;
