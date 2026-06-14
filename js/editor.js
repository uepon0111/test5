// js/editor.js
import { state, on,
         createTag, updateTag, deleteTag, reorderTags,
         createArtist, updateArtist, deleteArtist,
         updateSong, setEditorColumns } from './state.js';
import { getThumbnail, saveThumbnail } from './storage.js';
import { VirtualGrid } from './virtual-scroll.js';
import { generateId, formatDate, parseDate, showToast, debounce, sanitize, updateIcons, TAG_COLORS, readFileAsDataURL } from './utils.js';
import { openModal, closeModal, openConfirmModal, getThumbURL, clearThumbCache } from './player.js';

// ===== Local thumb cache for editor =====
const _eThumbCache = new Map();
async function getEditorThumbURL(songId) {
  if (_eThumbCache.has(songId)) return _eThumbCache.get(songId);
  const url = await getThumbURL(songId);
  if (url) _eThumbCache.set(songId, url);
  return url;
}

let _vgrid = null;
let _tagSortable = null;
let _artistSortable = null;

// ===== Init =====
export function initEditor() {
  // Adjust column count to orientation defaults if needed
  const isPortrait = window.matchMedia('(orientation:portrait)').matches;
  if (isPortrait && state.editorColumns > 3) {
    state.editorColumns = 2;
    setEditorColumns(2);
  } else if (!isPortrait && state.editorColumns < 4) {
    state.editorColumns = 4;
    setEditorColumns(4);
  }
  // Update columns button label
  const span = document.querySelector('#editor-btn-columns span');
  if (span) span.textContent = `${state.editorColumns}列`;
  // Apply class
  const grid = document.getElementById('editor-song-grid');
  if (grid) { grid.className = grid.className.replace(/editor-col-\d/, ''); grid.classList.add(`editor-col-${state.editorColumns}`); }

  _vgrid = new VirtualGrid(document.getElementById('editor-song-grid'), {
    columns:  state.editorColumns,
    rowHeight: _calcRowHeight(),
    gap: 12, padding: 12,
    renderItem: renderSongCard,
  });

  bindSubTabs();
  bindEditorSearch();
  bindEditorSort();
  bindEditorColumns();
  bindTagActions();
  bindArtistActions();

  // Listen for edit-song event from player.js
  document.addEventListener('app:edit-song', e => openSongEditModal(e.detail?.songId));
  // Refresh when screen is switched to editor
  document.addEventListener('screen-changed', e => { if (e.detail === 'editor') refreshEditorAll(); });

  on('songs-changed',   () => { _eThumbCache.clear(); refreshEditorAll(); });
  on('tags-changed',    refreshEditorAll);
  on('artists-changed', refreshEditorAll);

  new ResizeObserver(() => {
    _vgrid.rowHeight = _calcRowHeight();
    refreshSongGrid();
  }).observe(document.getElementById('editor-song-grid'));
}

function _calcRowHeight() {
  const container = document.getElementById('editor-song-grid');
  const w = container ? container.clientWidth : 600;
  const cols = state.editorColumns;
  const gap = 12, pad = 12;
  const itemW = (w - pad*2 - gap*(cols-1)) / cols;
  return Math.max(160, Math.round(itemW + 82));
}

function refreshEditorAll() {
  if (state.editorTab === 'songs') refreshSongGrid();
  else if (state.editorTab === 'tags') renderTagList();
  else if (state.editorTab === 'artists') renderArtistList();
}

// ===== Sub-tabs =====
function bindSubTabs() {
  document.querySelectorAll('.editor-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.editorTab = btn.dataset.sub;
      document.querySelectorAll('.editor-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.editor-sub-screen').forEach(s => s.classList.toggle('active', s.id === `editor-${btn.dataset.sub}`));
      refreshEditorAll();
    });
  });
}

// ===== Search =====
function bindEditorSearch() {
  const input = document.getElementById('editor-search');
  if (!input) return;
  input.addEventListener('input', debounce(e => { state.editorSearch = e.target.value; refreshSongGrid(); }, 200));
}

// ===== Sort =====
const EDITOR_SORTS = [
  { key: 'dateAdded',   label: '追加日順' },
  { key: 'title',       label: 'タイトル順' },
  { key: 'releaseDate', label: '投稿日順' },
];
function bindEditorSort() {
  document.getElementById('editor-btn-sort')?.addEventListener('click', e => {
    e.stopPropagation(); showEditorSortDropdown(e.currentTarget);
  });
  document.getElementById('editor-btn-sort-dir')?.addEventListener('click', () => {
    state.editorSortAsc = !state.editorSortAsc;
    const icon = document.querySelector('#editor-btn-sort-dir svg');
    if (icon) { icon.dataset.lucide = state.editorSortAsc ? 'arrow-up' : 'arrow-down'; lucide.createIcons({ nodes: [icon] }); }
    refreshSongGrid();
  });
}
function showEditorSortDropdown(anchor) {
  document.querySelectorAll('.sort-dropdown').forEach(d => d.remove());
  const dd = document.createElement('div');
  dd.className = 'sort-dropdown';
  dd.style.cssText = 'position:absolute;z-index:var(--z-overlay);left:0;top:100%;margin-top:4px;';
  anchor.style.position = 'relative';
  dd.innerHTML = EDITOR_SORTS.map(o =>
    `<div class="sort-option${o.key===state.editorSort?' selected':''}" data-key="${o.key}">${sanitize(o.label)}</div>`
  ).join('');
  anchor.appendChild(dd);
  dd.querySelectorAll('.sort-option').forEach(el => {
    el.addEventListener('click', () => {
      state.editorSort = el.dataset.key;
      const lbl = EDITOR_SORTS.find(o => o.key === el.dataset.key)?.label || '';
      const span = document.querySelector('#editor-btn-sort span');
      if (span) span.textContent = lbl;
      dd.remove(); refreshSongGrid();
    });
  });
  const close = e => { if (!dd.contains(e.target) && e.target !== anchor) { dd.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 10);
}

// ===== Columns =====
function bindEditorColumns() {
  document.getElementById('editor-btn-columns')?.addEventListener('click', () => {
    const isPortrait = window.matchMedia('(orientation:portrait)').matches;
    const opts = isPortrait ? [2, 3] : [4, 6];
    const cur = state.editorColumns;
    const next = opts[(opts.indexOf(cur) + 1) % opts.length] || opts[0];
    state.editorColumns = next;
    setEditorColumns(next);
    const span = document.querySelector('#editor-btn-columns span');
    if (span) span.textContent = `${next}列`;
    const grid = document.getElementById('editor-song-grid');
    if (grid) {
      grid.className = grid.className.replace(/editor-col-\d/, '');
      grid.classList.add(`editor-col-${next}`);
    }
    _vgrid.rowHeight = _calcRowHeight();
    _vgrid.setCols(next);
  });
}

// ===== Song Grid =====
function getFilteredEditorSongs() {
  const q = state.editorSearch.toLowerCase().trim();
  let songs = [...state.songs.values()];
  if (q) {
    songs = songs.filter(s => {
      if (s.title?.toLowerCase().includes(q)) return true;
      if (s.releaseDate?.includes(q)) return true;
      const aNames = (s.artistIds||[]).map(id => state.artists.get(id)?.name||'').join(' ');
      if (aNames.toLowerCase().includes(q)) return true;
      const tNames = (s.tagIds||[]).map(id => state.tags.get(id)?.name||'').join(' ');
      if (tNames.toLowerCase().includes(q)) return true;
      return false;
    });
  }
  songs.sort((a, b) => {
    let va, vb;
    if (state.editorSort === 'dateAdded')   { va = a.dateAdded||0; vb = b.dateAdded||0; }
    else if (state.editorSort === 'title')  { va = (a.title||'').toLowerCase(); vb = (b.title||'').toLowerCase(); }
    else { va = a.releaseDate||''; vb = b.releaseDate||''; }
    const c = va < vb ? -1 : va > vb ? 1 : 0;
    return state.editorSortAsc ? c : -c;
  });
  return songs;
}

function refreshSongGrid() {
  if (state.editorTab !== 'songs') return;
  const songs = getFilteredEditorSongs();
  _vgrid.setItems(songs, state.editorColumns);
}

function renderSongCard(song, idx) {
  const el = document.createElement('div');
  el.className = 'song-card';
  el.dataset.songId = song.id;

  const artists = (song.artistIds||[]).map(id => state.artists.get(id)?.name).filter(Boolean).join(', ') || '不明のアーティスト';
  const tags = (song.tagIds||[])
    .map(tid => state.tags.get(tid)).filter(Boolean)
    .sort((a,b) => (a.order||0)-(b.order||0))
    .slice(0, 3)
    .map(t => `<span class="tag-chip" style="background:${t.color}22;color:${t.color}"><span class="tag-dot" style="background:${sanitize(t.color)}"></span>${sanitize(t.name)}</span>`)
    .join('');

  el.innerHTML = `
    <div class="sc-thumb"><svg data-lucide="music" width="32" height="32"></svg></div>
    <div class="sc-info">
      <div class="sc-title">${sanitize(song.title||'不明')}</div>
      <div class="sc-artist">${sanitize(artists)}</div>
      <div class="sc-date">${sanitize(formatDate(song.releaseDate)||'')}</div>
      <div class="sc-tags">${tags}</div>
    </div>`;

  const thumbDiv = el.querySelector('.sc-thumb');
  const cached = _eThumbCache.get(song.id);
  if (cached) {
    thumbDiv.innerHTML = `<img src="${cached}" alt="">`;
  } else {
    getEditorThumbURL(song.id).then(url => {
      if (url && el.isConnected) thumbDiv.innerHTML = `<img src="${url}" alt="">`;
    });
  }

  el.addEventListener('click', () => openSongEditModal(song.id));
  updateIcons(el);
  return el;
}

// ===== Song Edit Modal =====
export async function openSongEditModal(songId) {
  const song = state.songs.get(songId);
  if (!song) return;

  const thumbUrl = await getThumbURL(songId);
  const artists = (song.artistIds||[]).map(id => state.artists.get(id)).filter(Boolean);
  const tags    = (song.tagIds||[]).map(id => state.tags.get(id)).filter(Boolean).sort((a,b)=>(a.order||0)-(b.order||0));

  const html = `
  <div class="modal-box modal-lg">
    <div class="modal-header">
      <span class="modal-title">曲情報を編集</span>
      <button class="btn-icon" id="modal-close"><svg data-lucide="x"></svg></button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:14px">
        <div class="song-edit-modal-thumb" id="thumb-picker-btn" data-tooltip="クリックしてサムネイルを変更">
          ${thumbUrl ? `<img id="thumb-preview-img" src="${thumbUrl}" alt="">` : `<svg data-lucide="image" width="28" height="28"></svg>`}
        </div>
        <div style="flex:1;min-width:0">
          <div class="form-group">
            <label class="form-label">タイトル</label>
            <input class="form-input" id="edit-title" value="${sanitize(song.title||'')}" maxlength="100" placeholder="曲のタイトル">
          </div>
          <div class="form-group">
            <label class="form-label">投稿日</label>
            <input class="form-input" id="edit-date" value="${sanitize(song.releaseDate||'')}" placeholder="YYYY-MM-DD" maxlength="10">
            <div class="form-hint">例: 2024-03-15</div>
          </div>
        </div>
      </div>
      <input type="file" id="thumb-file-input" accept="image/*" style="display:none">
      <div class="form-group" style="position:relative">
        <label class="form-label">アーティスト</label>
        <div class="chips-input-wrap" id="artist-chips-wrap">
          ${artists.map(a => `
            <div class="chip-item" data-id="${a.id}">
              <span>${sanitize(a.name)}</span>
              <span class="chip-remove" data-id="${a.id}"><svg data-lucide="x" width="10" height="10"></svg></span>
            </div>`).join('')}
          <input type="text" id="artist-chip-input" placeholder="アーティストを追加..." autocomplete="off">
        </div>
        <div id="artist-dropdown" class="chips-dropdown" style="display:none"></div>
      </div>
      <div class="form-group" style="position:relative">
        <label class="form-label">タグ</label>
        <div class="chips-input-wrap" id="tag-chips-wrap">
          ${tags.map(t => `
            <div class="chip-item" data-id="${t.id}" style="background:${t.color}22;color:${t.color}">
              <span class="tag-dot" style="background:${sanitize(t.color)};width:8px;height:8px;border-radius:50%;display:inline-block"></span>
              <span>${sanitize(t.name)}</span>
              <span class="chip-remove" data-id="${t.id}"><svg data-lucide="x" width="10" height="10"></svg></span>
            </div>`).join('')}
          <input type="text" id="tag-chip-input" placeholder="タグを追加..." autocomplete="off">
        </div>
        <div id="tag-dropdown" class="chips-dropdown" style="display:none"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
      <button class="btn btn-primary" id="btn-save-song"><svg data-lucide="save"></svg>保存</button>
    </div>
  </div>`;

  openModal(html);

  // State for editing
  let selectedArtistIds = new Set(song.artistIds||[]);
  let selectedTagIds    = new Set((song.tagIds||[]).sort((a,b)=>(state.tags.get(a)?.order||0)-(state.tags.get(b)?.order||0)));
  let newThumbBlob = null;

  // Thumbnail
  document.getElementById('thumb-picker-btn')?.addEventListener('click', () => document.getElementById('thumb-file-input')?.click());
  document.getElementById('thumb-file-input')?.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    newThumbBlob = file;
    const dataUrl = await readFileAsDataURL(file);
    const btn = document.getElementById('thumb-picker-btn');
    if (btn) btn.innerHTML = `<img id="thumb-preview-img" src="${dataUrl}" alt="" style="width:100%;height:100%;object-fit:cover">`;
  });

  // Artist chips
  setupChipsInput({
    wrap: document.getElementById('artist-chips-wrap'),
    input: document.getElementById('artist-chip-input'),
    dropdown: document.getElementById('artist-dropdown'),
    selected: selectedArtistIds,
    getSuggestions: q => [...state.artists.values()].filter(a => a.name.toLowerCase().includes(q.toLowerCase()) && !selectedArtistIds.has(a.id)),
    renderSuggestion: a => `<span>${sanitize(a.name)}</span>`,
    getLabel: id => { const a = state.artists.get(id); return a ? `<span>${sanitize(a.name)}</span>` : ''; },
    onSelect: async (id, name) => {
      if (!id) {
        // Create new artist
        const artist = { id: generateId(), name: name.trim(), hasIcon: false };
        await createArtist(artist);
        return artist.id;
      }
      return id;
    }
  });

  // Tag chips
  setupChipsInput({
    wrap: document.getElementById('tag-chips-wrap'),
    input: document.getElementById('tag-chip-input'),
    dropdown: document.getElementById('tag-dropdown'),
    selected: selectedTagIds,
    getSuggestions: q => [...state.tags.values()].sort((a,b)=>(a.order||0)-(b.order||0)).filter(t => t.name.toLowerCase().includes(q.toLowerCase()) && !selectedTagIds.has(t.id)),
    renderSuggestion: t => `<span class="tag-dot" style="background:${sanitize(t.color)};width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:4px"></span><span>${sanitize(t.name)}</span>`,
    getLabel: id => {
      const t = state.tags.get(id);
      return t ? `<span class="tag-dot" style="background:${sanitize(t.color)};width:8px;height:8px;border-radius:50%;display:inline-block"></span><span>${sanitize(t.name)}</span>` : '';
    },
    getChipStyle: id => { const t = state.tags.get(id); return t ? `background:${t.color}22;color:${t.color}` : ''; },
    onSelect: async (id, name) => {
      if (!id) {
        showToast('タグ管理画面から新しいタグを作成してください', 'info'); return null;
      }
      return id;
    }
  });

  // Close handlers
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

  // Save
  document.getElementById('btn-save-song')?.addEventListener('click', async () => {
    const title = document.getElementById('edit-title')?.value.trim();
    const dateRaw = document.getElementById('edit-date')?.value.trim();
    const releaseDate = dateRaw ? (parseDate(dateRaw) || dateRaw) : null;

    if (!title) { showToast('タイトルを入力してください', 'warning'); return; }

    const changes = {
      title,
      releaseDate,
      artistIds: [...selectedArtistIds],
      tagIds:    [...selectedTagIds],
    };

    if (newThumbBlob) {
      const blob = newThumbBlob instanceof File ? newThumbBlob : new Blob([newThumbBlob], { type: 'image/jpeg' });
      await saveThumbnail(songId, blob);
      clearThumbCache(songId);
      _eThumbCache.delete(songId);
    }

    await updateSong(songId, changes);
    closeModal();
    showToast('保存しました', 'success');
    refreshEditorAll();
  });
}

// ===== Chips Input Helper =====
function setupChipsInput({ wrap, input, dropdown, selected, getSuggestions, renderSuggestion, getLabel, getChipStyle, onSelect }) {
  if (!wrap || !input || !dropdown) return;

  const renderChips = () => {
    // Remove existing chips
    wrap.querySelectorAll('.chip-item').forEach(c => c.remove());
    // Add chips for selected
    for (const id of selected) {
      const chip = document.createElement('div');
      chip.className = 'chip-item';
      chip.dataset.id = id;
      const style = getChipStyle ? getChipStyle(id) : '';
      chip.style.cssText = style;
      chip.innerHTML = (getLabel(id) || '') + `<span class="chip-remove" data-id="${id}"><svg data-lucide="x" width="10" height="10"></svg></span>`;
      chip.querySelector('.chip-remove')?.addEventListener('click', e => {
        e.stopPropagation(); selected.delete(id); renderChips();
      });
      wrap.insertBefore(chip, input);
    }
    updateIcons(wrap);
  };

  const showDropdown = q => {
    const suggestions = getSuggestions(q.trim());
    if (!suggestions.length && !q.trim()) { dropdown.style.display = 'none'; return; }
    dropdown.style.display = 'block';
    dropdown.innerHTML = suggestions.slice(0, 8).map(s =>
      `<div class="chips-dropdown-item" data-id="${s.id}">${renderSuggestion(s)}</div>`
    ).join('') + (q.trim() && suggestions.length === 0 ? `<div class="chips-dropdown-item" data-id="" data-name="${sanitize(q.trim())}"><svg data-lucide="plus" width="13" height="13"></svg><em>「${sanitize(q.trim())}」を追加</em></div>` : '');
    updateIcons(dropdown);

    dropdown.querySelectorAll('.chips-dropdown-item').forEach(item => {
      item.addEventListener('click', async e => {
        e.stopPropagation();
        const id = item.dataset.id;
        const name = item.dataset.name || (id ? '' : input.value.trim());
        const resolved = await onSelect(id || null, name || '');
        if (resolved) { selected.add(resolved); renderChips(); }
        input.value = ''; dropdown.style.display = 'none';
      });
    });
  };

  input.addEventListener('input', () => showDropdown(input.value));
  input.addEventListener('focus', () => showDropdown(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      const first = dropdown.querySelector('.chips-dropdown-item');
      if (first) first.click();
      e.preventDefault();
    }
    if (e.key === 'Backspace' && !input.value && selected.size) {
      const last = [...selected].pop(); selected.delete(last); renderChips();
    }
  });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) dropdown.style.display = 'none'; }, { capture: true });
  wrap.addEventListener('click', () => input.focus());
}

// ===== Tag List =====
function bindTagActions() {
  document.getElementById('btn-new-tag')?.addEventListener('click', openTagCreateModal);
}

function renderTagList() {
  const container = document.getElementById('tag-list');
  if (!container || state.editorTab !== 'tags') return;
  const tags = [...state.tags.values()].sort((a,b) => (a.order||0) - (b.order||0));
  container.innerHTML = '';

  if (!tags.length) {
    container.innerHTML = '<div class="empty-state"><svg data-lucide="tag" width="40" height="40"></svg><strong>タグがありません</strong><p>「タグを追加」ボタンから作成できます</p></div>';
    updateIcons(container); return;
  }

  for (const tag of tags) {
    const songCount = [...state.songs.values()].filter(s => s.tagIds?.includes(tag.id)).length;
    const item = document.createElement('div');
    item.className = 'tag-list-item';
    item.dataset.tagId = tag.id;
    item.innerHTML = `
      <div class="tli-icon" style="background:${sanitize(tag.color||'#ccc')}"></div>
      <span class="tli-name">${sanitize(tag.name)}</span>
      <span class="tli-count">${songCount}曲</span>
      <div class="list-item-actions">
        <button class="btn-icon" data-action="edit" data-tooltip="編集"><svg data-lucide="edit-2"></svg></button>
        <button class="btn-icon danger" data-action="delete" data-tooltip="削除"><svg data-lucide="trash-2"></svg></button>
      </div>
      <div class="drag-handle"><svg data-lucide="grip-vertical"></svg></div>`;

    item.querySelector('[data-action="edit"]')?.addEventListener('click', () => openTagEditModal(tag));
    item.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      openConfirmModal(`タグ「${tag.name}」を削除しますか？`, `${songCount}曲からこのタグが削除されます。`, async () => {
        await deleteTag(tag.id); renderTagList(); showToast('削除しました', 'success');
      });
    });
    container.appendChild(item);
  }

  updateIcons(container);

  if (_tagSortable) _tagSortable.destroy();
  if (window.Sortable) {
    _tagSortable = Sortable.create(container, {
      handle: '.drag-handle', animation: 150,
      ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen',
      onEnd() {
        const ordered = [...container.querySelectorAll('[data-tag-id]')].map(el => el.dataset.tagId);
        reorderTags(ordered);
      }
    });
  }
}

function openTagCreateModal() {
  openTagModal(null);
}
function openTagEditModal(tag) {
  openTagModal(tag);
}
function openTagModal(existingTag) {
  const isEdit = !!existingTag;
  const html = `
  <div class="modal-box modal-sm">
    <div class="modal-header">
      <span class="modal-title">${isEdit ? 'タグを編集' : 'タグを作成'}</span>
      <button class="btn-icon" id="modal-close"><svg data-lucide="x"></svg></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">タグ名</label>
        <input class="form-input" id="tag-name-input" value="${sanitize(existingTag?.name||'')}" maxlength="30" placeholder="タグ名">
      </div>
      <div class="form-group">
        <label class="form-label">カラー</label>
        <div class="color-picker-grid">
          ${TAG_COLORS.map(c => `<div class="color-swatch${existingTag?.color===c?' selected':''}" data-color="${c}" style="background:${c}" title="${c}"></div>`).join('')}
        </div>
        <div class="custom-color-row">
          <label class="form-label" style="margin:0;flex-shrink:0">カスタム:</label>
          <input type="color" id="tag-custom-color" value="${existingTag?.color||TAG_COLORS[6]}" style="width:40px;height:28px;padding:2px;border-radius:4px;border:1px solid var(--c-border);cursor:pointer">
          <div id="tag-color-preview" style="width:28px;height:28px;border-radius:50%;background:${existingTag?.color||TAG_COLORS[6]};border:2px solid rgba(0,0,0,0.1)"></div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
      <button class="btn btn-primary" id="btn-save-tag">${isEdit ? '保存' : '作成'}</button>
    </div>
  </div>`;

  openModal(html);
  let selectedColor = existingTag?.color || TAG_COLORS[6];
  const updateColorUI = (c) => {
    selectedColor = c;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === c));
    const preview = document.getElementById('tag-color-preview');
    if (preview) preview.style.background = c;
    const picker = document.getElementById('tag-custom-color');
    if (picker) picker.value = c;
  };

  document.querySelectorAll('.color-swatch').forEach(s => s.addEventListener('click', () => updateColorUI(s.dataset.color)));
  document.getElementById('tag-custom-color')?.addEventListener('input', e => updateColorUI(e.target.value));
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('btn-save-tag')?.addEventListener('click', async () => {
    const name = document.getElementById('tag-name-input')?.value.trim();
    if (!name) { showToast('タグ名を入力してください', 'warning'); return; }
    if (isEdit) {
      await updateTag(existingTag.id, { name, color: selectedColor });
    } else {
      const tag = { id: generateId(), name, color: selectedColor, order: state.tags.size };
      await createTag(tag);
    }
    closeModal(); renderTagList(); showToast(isEdit ? '更新しました' : '作成しました', 'success');
  });
  document.getElementById('tag-name-input')?.focus();
}

// ===== Artist List =====
function bindArtistActions() {
  document.getElementById('btn-new-artist')?.addEventListener('click', openArtistCreateModal);
}

function renderArtistList() {
  const container = document.getElementById('artist-list');
  if (!container || state.editorTab !== 'artists') return;
  const artists = [...state.artists.values()].sort((a,b) => (a.name||'').localeCompare(b.name||'', 'ja'));
  container.innerHTML = '';

  if (!artists.length) {
    container.innerHTML = '<div class="empty-state"><svg data-lucide="user" width="40" height="40"></svg><strong>アーティストがいません</strong><p>曲を追加すると自動で作成されます</p></div>';
    updateIcons(container); return;
  }

  for (const artist of artists) {
    const songCount = [...state.songs.values()].filter(s => s.artistIds?.includes(artist.id)).length;
    const item = document.createElement('div');
    item.className = 'artist-list-item';
    item.dataset.artistId = artist.id;
    item.innerHTML = `
      <div class="ali-icon"><svg data-lucide="user" width="18" height="18"></svg></div>
      <span class="ali-name">${sanitize(artist.name)}</span>
      <span class="ali-count">${songCount}曲</span>
      <div class="list-item-actions">
        <button class="btn-icon" data-action="edit" data-tooltip="編集"><svg data-lucide="edit-2"></svg></button>
        <button class="btn-icon danger" data-action="delete" data-tooltip="削除"><svg data-lucide="trash-2"></svg></button>
      </div>`;

    // Load artist icon
    const iconDiv = item.querySelector('.ali-icon');
    getThumbnail('artist_' + artist.id).then(blob => {
      if (blob && iconDiv.isConnected) {
        const url = URL.createObjectURL(blob);
        iconDiv.innerHTML = `<img src="${url}" alt="">`;
      }
    });

    item.querySelector('[data-action="edit"]')?.addEventListener('click', () => openArtistEditModal(artist));
    item.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      openConfirmModal(`アーティスト「${artist.name}」を削除しますか？`, `${songCount}曲からこのアーティストが削除されます。`, async () => {
        await deleteArtist(artist.id); renderArtistList(); showToast('削除しました', 'success');
      });
    });
    container.appendChild(item);
  }
  updateIcons(container);
}

function openArtistCreateModal() { openArtistModal(null); }
function openArtistEditModal(artist) { openArtistModal(artist); }

function openArtistModal(existingArtist) {
  const isEdit = !!existingArtist;
  const html = `
  <div class="modal-box modal-sm">
    <div class="modal-header">
      <span class="modal-title">${isEdit ? 'アーティストを編集' : 'アーティストを追加'}</span>
      <button class="btn-icon" id="modal-close"><svg data-lucide="x"></svg></button>
    </div>
    <div class="modal-body">
      <div class="artist-icon-picker" style="margin-bottom:14px">
        <div class="artist-icon-preview" id="artist-icon-preview-btn">
          <svg data-lucide="user" width="22" height="22"></svg>
        </div>
        <div>
          <div style="font-size:0.82rem;font-weight:600;margin-bottom:4px">アイコン画像</div>
          <button class="btn btn-secondary btn-sm" id="btn-pick-artist-icon"><svg data-lucide="upload"></svg>画像を選択</button>
          <input type="file" id="artist-icon-input" accept="image/*" style="display:none">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">アーティスト名</label>
        <input class="form-input" id="artist-name-input" value="${sanitize(existingArtist?.name||'')}" maxlength="60" placeholder="アーティスト名">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
      <button class="btn btn-primary" id="btn-save-artist">${isEdit ? '保存' : '作成'}</button>
    </div>
  </div>`;

  openModal(html);
  updateIcons(document.querySelector('.modal-box'));

  let iconBlob = null;

  // Load existing icon
  if (isEdit && existingArtist.hasIcon) {
    getThumbnail('artist_' + existingArtist.id).then(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const preview = document.getElementById('artist-icon-preview-btn');
        if (preview) preview.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover">`;
      }
    });
  }

  document.getElementById('btn-pick-artist-icon')?.addEventListener('click', () => document.getElementById('artist-icon-input')?.click());
  document.getElementById('artist-icon-preview-btn')?.addEventListener('click', () => document.getElementById('artist-icon-input')?.click());
  document.getElementById('artist-icon-input')?.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    iconBlob = file;
    const url = URL.createObjectURL(file);
    const preview = document.getElementById('artist-icon-preview-btn');
    if (preview) preview.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover">`;
  });

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('btn-save-artist')?.addEventListener('click', async () => {
    const name = document.getElementById('artist-name-input')?.value.trim();
    if (!name) { showToast('名前を入力してください', 'warning'); return; }

    if (isEdit) {
      const changes = { name, hasIcon: existingArtist.hasIcon || !!iconBlob };
      await updateArtist(existingArtist.id, changes, iconBlob);
    } else {
      const artist = { id: generateId(), name, hasIcon: !!iconBlob };
      await createArtist(artist);
      if (iconBlob) await saveThumbnail('artist_' + artist.id, iconBlob);
    }
    closeModal(); renderArtistList(); showToast(isEdit ? '更新しました' : '追加しました', 'success');
  });
  document.getElementById('artist-name-input')?.focus();
}
