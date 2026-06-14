// js/player.js
import { state, on, emit, getSortedSongIds, getFilteredSongIds,
         createPlaylist, renamePlaylist, deletePlaylist,
         addSongsToPlaylist, removeSongsFromPlaylist, reorderPlaylistSong,
         setShuffle, setLoop, setRate, buildShuffleQueue,
         setCurrentSong, getInitialPlaylist,
         deleteSong, addSong, updateSong } from './state.js';
import { loadAndPlay, play, pause, togglePlay, playNext, playPrev,
         seekTo, setPlaybackRate, playSongInPlaylist, getAudioEl } from './audio.js';
import { VirtualList } from './virtual-scroll.js';
import { getThumbnail } from './storage.js';
import { generateId, formatTime, formatDate, showToast, debounce,
         sanitize, updateIcons, readFileAsArrayBuffer } from './utils.js';
import { extractMetadata, isAudioFile } from './metadata.js';
// ===== Thumb URL cache =====
const _thumbCache = new Map();
export async function getThumbURL(songId) {
  if (_thumbCache.has(songId)) return _thumbCache.get(songId);
  const blob = await getThumbnail(songId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  _thumbCache.set(songId, url);
  return url;
}
export function clearThumbCache(songId) {
  if (_thumbCache.has(songId)) { URL.revokeObjectURL(_thumbCache.get(songId)); _thumbCache.delete(songId); }
}
export function getThumbURLSync(songId) { return _thumbCache.get(songId) || null; }

let _vlist = null;

// ===== Init =====
export function initPlayer() {
  _vlist = new VirtualList(document.getElementById('player-song-list'), {
    itemHeight: 68,
    buffer: 8,
    renderItem: renderSongItem,
  });

  bindPlayerControls();
  bindPlaylistTabs();
  bindSearch();
  bindSortControls();
  bindFileUpload();
  bindSelectMode();
  bindMiniPlayer();

  on('songs-changed',    () => { _thumbCache.clear(); refreshAll(); });
  on('playlists-changed', () => refreshAll());
  on('tags-changed',     refreshList);
  on('artists-changed',  refreshList);
  on('playback-changed', updatePlayerWidget);
  on('song-changed',     updatePlayerWidget);
  on('time-update',      updateProgress);
}

function refreshAll() {
  renderPlaylistTabs();
  refreshList();
  updatePlayerWidget();
}

function refreshList() {
  const pl = state.playlists.get(state.viewPlaylistId);
  if (!pl) { _vlist.setItems([]); return; }
  const ids = getFilteredSongIds(state.viewPlaylistId);

  // Pre-load thumbs async, then render
  Promise.all(ids.slice(0, 40).map(id => getThumbURL(id))).then(() => {
    _vlist.setItems(ids);
    toggleSortHandles();
  });
  _vlist.setItems(ids);
  toggleSortHandles();
}

// ===== Player Widget =====
function updatePlayerWidget() {
  const song = state.currentSongId ? state.songs.get(state.currentSongId) : null;

  // Art
  const artWrap = document.getElementById('pw-art-wrap');
  const artEl   = document.getElementById('pw-art');
  const artBg   = document.getElementById('pw-art-bg');
  const artPh   = document.getElementById('pw-art-placeholder');

  if (song) {
    const url = _thumbCache.get(song.id);
    const applyThumb = (u) => {
      if (u) {
        if (artEl)  { artEl.src = u; artEl.style.display = 'block'; }
        if (artPh)  artPh.style.display = 'none';
        if (artBg)  artBg.style.backgroundImage = `url('${u}')`;
      } else {
        if (artEl)  artEl.style.display = 'none';
        if (artPh)  artPh.style.display = 'flex';
        if (artBg)  artBg.style.backgroundImage = '';
      }
    };
    applyThumb(url);
    if (!url) {
      getThumbURL(song.id).then(u => {
        if (state.currentSongId === song.id) applyThumb(u);
      });
    }

    const artists = (song.artistIds || []).map(id => state.artists.get(id)?.name).filter(Boolean).join(', ') || '不明のアーティスト';
    _setText('pw-title', song.title || '不明');
    _setText('pw-artist', artists);
    _setText('pw-idle', '');
  } else {
    if (artEl)  { artEl.src = ''; artEl.style.display = 'none'; }
    if (artPh)  artPh.style.display = 'flex';
    if (artBg)  artBg.style.backgroundImage = '';
    _setText('pw-title', '曲が選択されていません');
    _setText('pw-artist', '');
    _setText('pw-idle', 'ファイルを追加してください');
  }

  // Play/Pause buttons
  const isPlaying = state.isPlaying;
  _setIcon('pw-btn-play-pause', isPlaying ? 'pause' : 'play');
  _setIcon('mp-btn-play',       isPlaying ? 'pause' : 'play');

  // Shuffle/Loop/Rate
  _setActive('btn-shuffle', state.shuffle);
  const loopIcon = state.loop === 'one' ? 'repeat-1' : 'repeat';
  _setIcon('btn-loop', loopIcon);
  _setActive('btn-loop', state.loop !== 'none');
  _setText('btn-rate-label', `${state.playbackRate}x`);

  // Mini player
  if (song) {
    const mpUrl = _thumbCache.get(song.id);
    const mpThumb = document.getElementById('mp-thumb-wrap');
    const mpImg   = mpThumb?.querySelector('img');
    if (mpImg && mpUrl) { mpImg.src = mpUrl; mpThumb.classList.add('has-thumb'); }
    else if (mpThumb)   { mpThumb.classList.remove('has-thumb'); }
    _setText('mp-title',  song.title || '');
    _setText('mp-artist', (song.artistIds||[]).map(id=>state.artists.get(id)?.name).filter(Boolean).join(', ') || '不明のアーティスト');
  } else {
    _setText('mp-title',  '曲が選択されていません');
    _setText('mp-artist', '—');
  }
}

function updateProgress({ t, dur } = {}) {
  const current = t !== undefined ? t : (getAudioEl()?.currentTime || 0);
  const total   = dur !== undefined ? dur : (getAudioEl()?.duration || 0);
  const pct = total > 0 ? (current / total) * 100 : 0;

  const seek = document.getElementById('pw-seek');
  if (seek && !seek.matches(':active')) seek.value = pct;

  _setText('pw-time-current', formatTime(current));
  _setText('pw-time-total',   formatTime(total));

  // Mini player progress bar
  const mpBar = document.querySelector('.mp-progress');
  if (mpBar) mpBar.style.width = `${pct}%`;
}

// ===== Playlist Tabs =====
function renderPlaylistTabs() {
  const container = document.getElementById('playlist-tabs');
  if (!container) return;
  container.innerHTML = '';

  const playlists = [...state.playlists.values()].sort((a,b) => {
    if (a.isInitial) return -1;
    if (b.isInitial) return  1;
    return a.dateCreated - b.dateCreated;
  });

  for (const pl of playlists) {
    const tab = document.createElement('div');
    tab.className = 'playlist-tab' + (pl.id === state.viewPlaylistId ? ' active' : '');
    tab.dataset.plId = pl.id;

    const count = pl.songs.filter(s => state.songs.has(s.songId)).length;
    tab.innerHTML = `<span class="tab-name">${sanitize(pl.name)}</span><span style="font-size:0.72rem;color:var(--c-text-300);margin-left:3px">${count}</span>`;

    if (!pl.isInitial) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'tab-more';
      moreBtn.innerHTML = `<svg data-lucide="more-horizontal"></svg>`;
      moreBtn.addEventListener('click', e => { e.stopPropagation(); showTabMenu(pl, moreBtn); });
      tab.appendChild(moreBtn);
    }

    tab.addEventListener('click', () => {
      state.viewPlaylistId = pl.id;
      renderPlaylistTabs();
      refreshList();
    });

    container.appendChild(tab);
  }
  updateIcons(container);
}

function showTabMenu(pl, anchor) {
  document.querySelectorAll('.tab-context-menu').forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'tab-context-menu';
  menu.innerHTML = `
    <div class="tab-context-item" data-action="rename"><svg data-lucide="edit-2"></svg>名前を変更</div>
    <div class="tab-context-item danger" data-action="delete"><svg data-lucide="trash-2"></svg>削除</div>
  `;
  anchor.parentElement.style.position = 'relative';
  anchor.parentElement.appendChild(menu);
  updateIcons(menu);

  menu.querySelector('[data-action="rename"]').addEventListener('click', () => {
    menu.remove(); openRenamePlaylistModal(pl);
  });
  menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
    menu.remove(); openConfirmDeletePlaylist(pl);
  });

  const close = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 10);
}

// ===== Sort Controls =====
function bindSortControls() {
  const btnSort   = document.getElementById('btn-sort');
  const btnSortDir= document.getElementById('btn-sort-dir');

  btnSort?.addEventListener('click', e => {
    e.stopPropagation();
    showSortDropdown(btnSort);
  });

  btnSortDir?.addEventListener('click', () => {
    state.playerSortAsc = !state.playerSortAsc;
    _setIcon('btn-sort-dir', state.playerSortAsc ? 'arrow-up' : 'arrow-down');
    refreshList();
  });
}

const SORT_OPTIONS = [
  { key: 'manual',      label: '手動順' },
  { key: 'dateAdded',   label: '追加日順' },
  { key: 'title',       label: 'タイトル順' },
  { key: 'releaseDate', label: '投稿日順' },
];

function showSortDropdown(anchor) {
  document.querySelectorAll('.sort-dropdown').forEach(d => d.remove());
  const dd = document.createElement('div');
  dd.className = 'sort-dropdown';
  dd.style.cssText = 'position:absolute;z-index:var(--z-overlay);left:0;top:100%;margin-top:4px;';
  anchor.style.position = 'relative';

  dd.innerHTML = SORT_OPTIONS.map(o =>
    `<div class="sort-option${o.key===state.playerSort?' selected':''}" data-key="${o.key}">${sanitize(o.label)}</div>`
  ).join('');

  anchor.appendChild(dd);
  dd.querySelectorAll('.sort-option').forEach(el => {
    el.addEventListener('click', () => {
      state.playerSort = el.dataset.key;
      const label = SORT_OPTIONS.find(o => o.key === el.dataset.key)?.label || '';
      _setText('sort-label', label);
      dd.remove();
      toggleSortHandles();
      refreshList();
    });
  });

  const close = (e) => { if (!dd.contains(e.target) && e.target !== anchor) { dd.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 10);
}

function toggleSortHandles() {
  const list = document.getElementById('player-song-list');
  if (!list) return;
  if (state.playerSort === 'manual') {
    list.classList.add('sort-mode-manual');
  } else {
    list.classList.remove('sort-mode-manual');
  }
  _vlist.refresh();
}

// ===== Song List Item =====
function renderSongItem(songId, index) {
  const song = state.songs.get(songId);
  if (!song) return document.createElement('div');

  const el = document.createElement('div');
  el.className = 'song-item' +
    (songId === state.currentSongId ? ' playing' : '') +
    (state.selected.has(songId) ? ' selected' : '');
  el.dataset.songId = songId;

  const artists = (song.artistIds||[]).map(id => state.artists.get(id)?.name).filter(Boolean).join(', ') || '不明のアーティスト';

  const tags = (song.tagIds||[])
    .map(tid => state.tags.get(tid))
    .filter(Boolean)
    .sort((a,b) => (a.order||0)-(b.order||0))
    .slice(0, 4)
    .map(t => `<span class="tag-dot" style="background:${sanitize(t.color||'#ccc')}" title="${sanitize(t.name)}"></span>`)
    .join('');

  const isManual = state.playerSort === 'manual';

  el.innerHTML = `
    <div class="si-check"><input type="checkbox" ${state.selected.has(songId)?'checked':''}></div>
    <div class="si-thumb"><svg data-lucide="music" width="20" height="20"></svg></div>
    <div class="si-info">
      <div class="si-title">${sanitize(song.title||'不明')}</div>
      <div class="si-artist">${sanitize(artists)}</div>
      <div class="si-tags">${tags}</div>
    </div>
    <div class="now-playing-bar"><div class="np-bar"></div><div class="np-bar"></div><div class="np-bar"></div></div>
    <div class="si-duration">${formatTime(song.duration||0)}</div>
    <div class="si-actions">
      <button class="btn-icon" data-action="add-to-pl" data-tooltip="リストに追加"><svg data-lucide="list-plus"></svg></button>
      <button class="btn-icon" data-action="edit" data-tooltip="情報を編集"><svg data-lucide="edit-2"></svg></button>
      <button class="btn-icon danger" data-action="delete" data-tooltip="削除"><svg data-lucide="trash-2"></svg></button>
    </div>
    <div class="si-arrows${isManual?'':' hidden-handle'}">
      <button class="btn-icon si-arrow-up" data-tooltip="上へ"><svg data-lucide="chevron-up"></svg></button>
      <button class="btn-icon si-arrow-down" data-tooltip="下へ"><svg data-lucide="chevron-down"></svg></button>
    </div>
  `;

  // Load thumb
  const thumbDiv = el.querySelector('.si-thumb');
  const url = _thumbCache.get(songId);
  if (url) {
    thumbDiv.innerHTML = `<img src="${url}" alt="">`;
  } else {
    getThumbURL(songId).then(u => {
      if (u && el.isConnected) thumbDiv.innerHTML = `<img src="${u}" alt="">`;
    });
  }

  // Checkbox
  const cb = el.querySelector('input[type="checkbox"]');
  cb?.addEventListener('change', e => {
    e.stopPropagation();
    if (cb.checked) state.selected.add(songId); else state.selected.delete(songId);
    el.classList.toggle('selected', cb.checked);
    updateSelectToolbar();
  });

  // Click to play
  el.addEventListener('click', async (e) => {
    if (e.target.closest('.si-actions') || e.target.closest('.si-check') || e.target.closest('.si-arrows')) return;
    if (state.selectMode) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); return; }
    await playSongInPlaylist(songId, state.viewPlaylistId);
    state.activePlaylistId = state.viewPlaylistId;
    _vlist.refresh();
  });

  // Action buttons
  el.querySelector('[data-action="add-to-pl"]')?.addEventListener('click', e => {
    e.stopPropagation();
    openAddToPlaylistModal([songId]);
  });
  el.querySelector('[data-action="edit"]')?.addEventListener('click', e => {
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('app:edit-song', { detail: { songId } }));
  });
  el.querySelector('[data-action="delete"]')?.addEventListener('click', e => {
    e.stopPropagation();
    openConfirmDeleteSong(songId);
  });

  // Manual sort: arrow buttons
  el.querySelector('.si-arrow-up')?.addEventListener('click', async e => {
    e.stopPropagation();
    const pl = state.playlists.get(state.viewPlaylistId);
    if (!pl) return;
    const ids = getSortedSongIds(pl);
    const idx = ids.indexOf(songId);
    if (idx > 0) { await reorderPlaylistSong(state.viewPlaylistId, idx, idx - 1); }
  });
  el.querySelector('.si-arrow-down')?.addEventListener('click', async e => {
    e.stopPropagation();
    const pl = state.playlists.get(state.viewPlaylistId);
    if (!pl) return;
    const ids = getSortedSongIds(pl);
    const idx = ids.indexOf(songId);
    if (idx >= 0 && idx < ids.length - 1) { await reorderPlaylistSong(state.viewPlaylistId, idx, idx + 1); }
  });

  updateIcons(el);
  return el;
}

// ===== Player Controls =====
function bindPlayerControls() {
  document.getElementById('pw-btn-play-pause')?.addEventListener('click', togglePlay);
  document.getElementById('btn-prev')?.addEventListener('click', playPrev);
  document.getElementById('btn-next')?.addEventListener('click', playNext);

  document.getElementById('btn-shuffle')?.addEventListener('click', () => {
    setShuffle(!state.shuffle);
    _setActive('btn-shuffle', state.shuffle);
  });

  document.getElementById('btn-loop')?.addEventListener('click', () => {
    const modes = ['none','all','one'];
    const next = modes[(modes.indexOf(state.loop)+1) % modes.length];
    setLoop(next);
    _setIcon('btn-loop', next === 'one' ? 'repeat-1' : 'repeat');
    _setActive('btn-loop', next !== 'none');
  });

  document.getElementById('btn-rate')?.addEventListener('click', e => {
    e.stopPropagation(); showRatePicker(e.currentTarget);
  });

  // Seek
  const seek = document.getElementById('pw-seek');
  seek?.addEventListener('mousedown', () => { seek._dragging = true; });
  seek?.addEventListener('input',  () => { if (seek._dragging) { const d = getAudioEl()?.duration||0; updateProgress({ t: (seek.value/100)*d, dur: d }); } });
  seek?.addEventListener('change', () => { seek._dragging=false; const d=getAudioEl()?.duration||0; seekTo((seek.value/100)*d); });
}

function showRatePicker(anchor) {
  document.querySelectorAll('.rate-picker-popup').forEach(p => p.remove());
  const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const popup = document.createElement('div');
  popup.className = 'rate-picker-popup';
  popup.style.cssText = 'position:absolute;background:var(--c-bg-base);border:1px solid var(--c-border);border-radius:var(--r-lg);box-shadow:var(--shadow-lg);z-index:var(--z-overlay);padding:6px;display:flex;flex-wrap:wrap;gap:4px;width:180px;left:50%;transform:translateX(-50%);bottom:calc(100% + 8px);';
  rates.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'rate-option' + (r === state.playbackRate ? ' active' : '');
    btn.textContent = r + 'x';
    btn.addEventListener('click', () => {
      setRate(r); setPlaybackRate(r);
      _setText('btn-rate-label', r + 'x');
      popup.remove();
    });
    popup.appendChild(btn);
  });
  anchor.style.position = 'relative';
  anchor.appendChild(popup);
  const close = (e) => { if (!popup.contains(e.target) && e.target !== anchor) { popup.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 10);
}

// ===== Playlist Tab Bindings =====
function bindPlaylistTabs() {
  document.getElementById('btn-new-playlist')?.addEventListener('click', openNewPlaylistModal);
}

// ===== Search =====
function bindSearch() {
  const search = document.getElementById('player-search');
  if (!search) return;
  const handler = debounce(v => { state.playerSearch = v; refreshList(); }, 200);
  search.addEventListener('input', e => handler(e.target.value));
}

// ===== File Upload =====
function bindFileUpload() {
  document.getElementById('btn-add-files')?.addEventListener('click', openFileUploadModal);

  // Global drag-drop
  document.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); showGlobalDropOverlay(); } });
  document.addEventListener('dragleave', e => { if (!e.relatedTarget || e.relatedTarget === document.documentElement) hideGlobalDropOverlay(); });
  document.addEventListener('drop', async e => {
    e.preventDefault(); hideGlobalDropOverlay();
    const files = [...e.dataTransfer.files].filter(isAudioFile);
    if (files.length) openFileUploadModal(files);
  });
}
function showGlobalDropOverlay() {
  const el = document.getElementById('global-drop-overlay');
  if (el) el.classList.add('visible');
}
function hideGlobalDropOverlay() {
  const el = document.getElementById('global-drop-overlay');
  if (el) el.classList.remove('visible');
}

// ===== Select Mode =====
function bindSelectMode() {
  document.getElementById('btn-select-mode')?.addEventListener('click', () => {
    state.selectMode = !state.selectMode;
    state.selected.clear();
    const list = document.getElementById('player-song-list');
    list?.classList.toggle('select-mode', state.selectMode);
    _setActive('btn-select-mode', state.selectMode);
    updateSelectToolbar();
    _vlist.refresh();
  });
}

function updateSelectToolbar() {
  let tb = document.getElementById('select-toolbar');
  if (!state.selectMode) { tb?.remove(); return; }
  if (!tb) {
    tb = document.createElement('div');
    tb.id = 'select-toolbar';
    tb.className = 'select-toolbar';
    tb.innerHTML = `
      <span class="count">0件選択中</span>
      <div class="select-actions">
        <button class="btn-icon" id="btn-sel-all" data-tooltip="全選択"><svg data-lucide="check-square"></svg></button>
        <button class="btn-icon" id="btn-sel-none" data-tooltip="選択解除"><svg data-lucide="square"></svg></button>
        <button class="btn-icon" id="btn-sel-add-pl" data-tooltip="リストに追加"><svg data-lucide="list-plus"></svg></button>
        <button class="btn-icon danger" id="btn-sel-delete" data-tooltip="削除"><svg data-lucide="trash-2"></svg></button>
        <button class="btn-icon" id="btn-sel-close" data-tooltip="キャンセル"><svg data-lucide="x"></svg></button>
      </div>
    `;
    const sortRow = document.querySelector('.sort-row');
    if (sortRow?.parentNode) {
      sortRow.parentNode.insertBefore(tb, sortRow);
    } else {
      document.getElementById('playlist-area')?.prepend(tb);
    }
    updateIcons(tb);

    tb.querySelector('#btn-sel-all')?.addEventListener('click', () => {
      const ids = getFilteredSongIds(state.viewPlaylistId);
      ids.forEach(id => state.selected.add(id));
      updateSelectToolbar(); _vlist.refresh();
    });
    tb.querySelector('#btn-sel-none')?.addEventListener('click', () => {
      state.selected.clear(); updateSelectToolbar(); _vlist.refresh();
    });
    tb.querySelector('#btn-sel-add-pl')?.addEventListener('click', () => {
      if (state.selected.size) openAddToPlaylistModal([...state.selected]);
    });
    tb.querySelector('#btn-sel-delete')?.addEventListener('click', () => {
      if (state.selected.size) openConfirmBulkDelete([...state.selected]);
    });
    tb.querySelector('#btn-sel-close')?.addEventListener('click', () => {
      state.selectMode = false; state.selected.clear();
      const list = document.getElementById('player-song-list');
      list?.classList.remove('select-mode');
      _setActive('btn-select-mode', false);
      updateSelectToolbar(); _vlist.refresh();
    });
  }
  tb.querySelector('.count').textContent = `${state.selected.size}件選択中`;
}

// ===== Mini Player =====
function bindMiniPlayer() {
  const mp = document.getElementById('mini-player');
  const pw = document.getElementById('player-widget');
  const bd = document.getElementById('player-backdrop');

  mp?.addEventListener('click', e => {
    if (e.target.closest('.mp-controls')) return;
    if (window.matchMedia('(orientation:portrait)').matches) {
      pw?.classList.add('open'); bd?.classList.add('show');
    }
  });
  bd?.addEventListener('click', () => { pw?.classList.remove('open'); bd?.classList.remove('show'); });

  document.getElementById('mp-btn-prev')?.addEventListener('click', e => { e.stopPropagation(); playPrev(); });
  document.getElementById('mp-btn-play')?.addEventListener('click', e => { e.stopPropagation(); togglePlay(); });
  document.getElementById('mp-btn-next')?.addEventListener('click', e => { e.stopPropagation(); playNext(); });
}

// ===== Modals =====
export function openFileUploadModal(preloadedFiles) {
  let stagedFiles = Array.isArray(preloadedFiles) ? [...preloadedFiles] : [];

  const modalHtml = `
  <div class="modal-box modal-lg">
    <div class="modal-header">
      <span class="modal-title">ファイルを追加</span>
      <button class="btn-icon" id="modal-close"><svg data-lucide="x"></svg></button>
    </div>
    <div class="modal-body">
      <div id="upload-drop-zone" class="drop-zone">
        <svg data-lucide="upload-cloud" width="40" height="40"></svg>
        <strong>ファイルをドロップ</strong>
        <p>またはクリックしてファイルを選択</p>
        <input type="file" id="upload-file-input" multiple accept="audio/*,.mp3,.mp4,.m4a,.ogg,.flac,.wav,.aac" style="display:none">
      </div>
      <div id="upload-file-list" style="margin-top:12px;max-height:220px;overflow-y:auto;"></div>
      <div id="upload-progress-wrap" style="margin-top:8px;display:none">
        <div class="progress-bar"><div class="progress-bar-fill" id="upload-total-bar" style="width:0%"></div></div>
        <div style="font-size:0.75rem;color:var(--c-text-500);margin-top:4px" id="upload-status-text">処理中...</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
      <button class="btn btn-primary" id="btn-start-upload" disabled>
        <svg data-lucide="upload"></svg>追加する
      </button>
    </div>
  </div>`;

  const overlay = openModal(modalHtml);
  const listEl  = document.getElementById('upload-file-list');
  const startBtn= document.getElementById('btn-start-upload');

  const renderStaged = () => {
    listEl.innerHTML = '';
    if (!stagedFiles.length) { startBtn.disabled = true; return; }
    startBtn.disabled = false;
    stagedFiles.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'upload-progress-item';
      item.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="upi-name">${sanitize(f.name)}</div>
          <button class="btn-icon" data-idx="${i}" data-tooltip="削除"><svg data-lucide="x"></svg></button>
        </div>
        <div class="upi-status">${(f.size/1024/1024).toFixed(1)} MB</div>
      `;
      item.querySelector('.btn-icon').addEventListener('click', () => { stagedFiles.splice(i, 1); renderStaged(); });
      listEl.appendChild(item);
    });
    updateIcons(listEl);
  };

  const addFiles = (files) => {
    for (const f of files) { if (isAudioFile(f) && !stagedFiles.some(x => x.name === f.name && x.size === f.size)) stagedFiles.push(f); }
    renderStaged();
  };

  document.getElementById('upload-drop-zone')?.addEventListener('click', () => document.getElementById('upload-file-input')?.click());
  document.getElementById('upload-file-input')?.addEventListener('change', e => addFiles([...e.target.files]));
  const dz = document.getElementById('upload-drop-zone');
  dz?.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz?.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz?.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); addFiles([...e.dataTransfer.files]); });

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

  document.getElementById('btn-start-upload')?.addEventListener('click', async () => {
    if (!stagedFiles.length) return;
    startBtn.disabled = true;
    document.getElementById('upload-progress-wrap').style.display = 'block';
    dz.style.display = 'none';

    let done = 0;
    for (let i = 0; i < stagedFiles.length; i++) {
      const file = stagedFiles[i];
      const item = listEl.children[i];
      const statusEl = item?.querySelector('.upi-status');
      if (statusEl) statusEl.textContent = '読み込み中...';
      try {
        const ab = await readFileAsArrayBuffer(file, pct => {
          if (statusEl) statusEl.textContent = `読み込み中... ${Math.round(pct*100)}%`;
        });
        if (statusEl) statusEl.textContent = 'メタデータ解析中...';
        const meta = await extractMetadata(file, ab);
        const song = {
          id: generateId(), title: meta.title,
          artistIds: meta.artistIds, tagIds: [],
          releaseDate: meta.releaseDate,
          duration: meta.duration,
          mimeType: file.type || 'audio/mpeg',
          dateAdded: Date.now(), manualOrder: state.songs.size
        };
        await addSong(song, ab, meta.thumbBlob);
        if (meta.thumbBlob) { const u = URL.createObjectURL(meta.thumbBlob); _thumbCache.set(song.id, u); }
        if (statusEl) { statusEl.textContent = '完了'; item?.classList.add('done'); }
      } catch (err) {
        if (statusEl) { statusEl.textContent = `エラー: ${err.message}`; item?.classList.add('error'); }
      }
      done++;
      document.getElementById('upload-total-bar').style.width = `${(done/stagedFiles.length)*100}%`;
      document.getElementById('upload-status-text').textContent = `${done} / ${stagedFiles.length} 完了`;
    }
    showToast(`${done}曲を追加しました`, 'success');
    setTimeout(closeModal, 800);
  });

  renderStaged();
  if (stagedFiles.length) renderStaged();
}

function openNewPlaylistModal() {
  const html = `
  <div class="modal-box modal-sm">
    <div class="modal-header"><span class="modal-title">再生リストを作成</span><button class="btn-icon" id="modal-close"><svg data-lucide="x"></svg></button></div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">リスト名</label>
        <input class="form-input" id="new-pl-name" placeholder="例：お気に入り" maxlength="40">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
      <button class="btn btn-primary" id="btn-create-pl">作成</button>
    </div>
  </div>`;
  openModal(html);
  const input = document.getElementById('new-pl-name');
  input?.focus();
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('btn-create-pl')?.addEventListener('click', async () => {
    const name = input?.value.trim();
    if (!name) { showToast('名前を入力してください', 'warning'); return; }
    const pl = await createPlaylist(name);
    state.viewPlaylistId = pl.id;
    refreshAll();
    closeModal();
    showToast(`"${name}"を作成しました`, 'success');
  });
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-create-pl')?.click(); });
}

function openRenamePlaylistModal(pl) {
  const html = `
  <div class="modal-box modal-sm">
    <div class="modal-header"><span class="modal-title">リスト名を変更</span><button class="btn-icon" id="modal-close"><svg data-lucide="x"></svg></button></div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">リスト名</label>
        <input class="form-input" id="rename-pl-input" value="${sanitize(pl.name)}" maxlength="40">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
      <button class="btn btn-primary" id="btn-rename-pl">変更</button>
    </div>
  </div>`;
  openModal(html);
  const input = document.getElementById('rename-pl-input');
  input?.focus(); input?.select();
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('btn-rename-pl')?.addEventListener('click', async () => {
    const name = input?.value.trim();
    if (!name) { showToast('名前を入力してください', 'warning'); return; }
    await renamePlaylist(pl.id, name);
    refreshAll(); closeModal();
  });
}

function openConfirmDeletePlaylist(pl) {
  openConfirmModal(`"${pl.name}"を削除しますか？`, 'このリストに含まれる曲は削除されません。', async () => {
    await deletePlaylist(pl.id); refreshAll();
    showToast('削除しました', 'success');
  });
}

function openConfirmDeleteSong(songId) {
  const song = state.songs.get(songId);
  openConfirmModal(`"${song?.title||'曲'}"を削除しますか？`, '再生リストからも削除され、再生履歴も消去されます。', async () => {
    clearThumbCache(songId);
    await deleteSong(songId);
    refreshList(); updatePlayerWidget();
    showToast('削除しました', 'success');
  });
}

function openConfirmBulkDelete(ids) {
  openConfirmModal(`${ids.length}曲を削除しますか？`, 'この操作は取り消せません。', async () => {
    for (const id of ids) { clearThumbCache(id); await deleteSong(id); }
    state.selected.clear(); state.selectMode = false;
    const list = document.getElementById('player-song-list');
    list?.classList.remove('select-mode');
    updateSelectToolbar(); refreshAll();
    showToast(`${ids.length}曲を削除しました`, 'success');
  });
}

export function openAddToPlaylistModal(songIds) {
  const playlists = [...state.playlists.values()].filter(p => !p.isInitial).sort((a,b) => a.dateCreated - b.dateCreated);
  if (!playlists.length) {
    showToast('再生リストがありません。先にリストを作成してください', 'warning'); return;
  }
  const html = `
  <div class="modal-box modal-sm">
    <div class="modal-header"><span class="modal-title">再生リストに追加</span><button class="btn-icon" id="modal-close"><svg data-lucide="x"></svg></button></div>
    <div class="modal-body" style="padding:8px 12px">
      ${playlists.map(p =>
        `<div class="chips-dropdown-item" data-pl-id="${p.id}">
          <svg data-lucide="music" width="15" height="15"></svg>
          <span>${sanitize(p.name)}</span>
          <span style="margin-left:auto;font-size:0.72rem;color:var(--c-text-300)">${p.songs.length}曲</span>
        </div>`
      ).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
    </div>
  </div>`;
  openModal(html);
  updateIcons(document.querySelector('.modal-box'));
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.querySelectorAll('[data-pl-id]').forEach(el => {
    el.addEventListener('click', async () => {
      const plId = el.dataset.plId;
      await addSongsToPlaylist(plId, songIds);
      closeModal();
      showToast('再生リストに追加しました', 'success');
    });
  });
}

// ===== Modal helpers (shared) =====
export function openModal(html) {
  document.querySelectorAll('.modal-overlay-inst').forEach(o => o.remove());
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay modal-overlay-inst';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  updateIcons(overlay);
  return overlay;
}

export function closeModal() {
  const overlay = document.querySelector('.modal-overlay-inst');
  if (!overlay) return;
  overlay.classList.add('closing');
  overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
}

export function openConfirmModal(title, message, onConfirm) {
  const html = `
  <div class="modal-box modal-sm">
    <div class="modal-body" style="text-align:center;padding:24px 20px 16px">
      <div class="confirm-icon"><svg data-lucide="alert-triangle"></svg></div>
      <div class="confirm-title">${sanitize(title)}</div>
      <div class="confirm-message" style="margin-top:6px">${sanitize(message)}</div>
    </div>
    <div class="modal-footer" style="justify-content:center;gap:10px">
      <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
      <button class="btn btn-danger" id="modal-confirm">削除する</button>
    </div>
  </div>`;
  openModal(html);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-confirm')?.addEventListener('click', async () => { closeModal(); await onConfirm(); });
}

// ===== Helpers =====
function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function _setIcon(id, icon) {
  const el = document.getElementById(id);
  if (!el) return;
  const svg = el.querySelector('svg');
  if (svg) { svg.dataset.lucide = icon; lucide.createIcons({ nodes: [svg] }); }
}
function _setActive(id, active) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('active', active);
}
