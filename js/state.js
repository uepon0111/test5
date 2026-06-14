// js/state.js
import { generateId } from './utils.js';
import * as DB from './storage.js';

// ===== Event Emitter =====
const _listeners = {};
export function on(event, cb) {
  (_listeners[event] = _listeners[event] || []).push(cb);
  return () => { _listeners[event] = (_listeners[event] || []).filter(f => f !== cb); };
}
export function emit(event, data) {
  (_listeners[event] || []).forEach(cb => { try { cb(data); } catch(e) { console.error(e); } });
}

// ===== State =====
export const state = {
  // Data maps
  songs:     new Map(),
  playlists: new Map(),
  tags:      new Map(),
  artists:   new Map(),
  logs:      [],

  // Player playback
  currentSongId:     null,
  activePlaylistId:  null,  // which playlist is playing
  isPlaying:         false,
  currentTime:       0,
  duration:          0,
  shuffle:           false,
  loop:              'none',  // 'none' | 'one' | 'all'
  playbackRate:      1.0,
  shuffleQueue:      [],
  shuffleIndex:      0,

  // Player UI
  viewPlaylistId:    null,   // which playlist tab is selected
  playerSort:        'manual',
  playerSortAsc:     true,
  playerSearch:      '',
  selectMode:        false,
  selected:          new Set(),

  // Editor UI
  editorTab:         'songs',
  editorSort:        'dateAdded',
  editorSortAsc:     false,
  editorSearch:      '',
  editorColumns:     4,

  // Log UI
  logPeriod:         'month',

  // Settings
  eqEnabled:         false,
  eqBands:           [0,0,0,0,0,0,0,0,0,0],
  eqPreset:          'normal',
  eqMode:            'simple',

  // Navigation
  screen: 'player',
};

// ===== Load from DB =====
export async function loadAll() {
  const { songs, playlists, tags, artists, logs } = await DB.loadAllData();

  state.songs     = new Map(songs.map(s => [s.id, s]));
  state.playlists = new Map(playlists.map(p => [p.id, p]));
  state.tags      = new Map(tags.map(t => [t.id, t]));
  state.artists   = new Map(artists.map(a => [a.id, a]));
  state.logs      = logs;

  // Restore settings
  state.shuffle       = await DB.getSetting('shuffle', false);
  state.loop          = await DB.getSetting('loop', 'none');
  state.playbackRate  = await DB.getSetting('playbackRate', 1.0);
  state.eqEnabled     = await DB.getSetting('eqEnabled', false);
  state.eqBands       = await DB.getSetting('eqBands', new Array(10).fill(0));
  state.eqPreset      = await DB.getSetting('eqPreset', 'normal');
  state.eqMode        = await DB.getSetting('eqMode', 'simple');
  state.currentSongId = await DB.getSetting('lastSongId', null);
  state.activePlaylistId = await DB.getSetting('lastPlaylistId', null);
  state.viewPlaylistId   = state.activePlaylistId;
  state.editorColumns = await DB.getSetting('editorColumns', 4);

  // Ensure initial playlist exists
  await ensureInitialPlaylist();

  if (!state.viewPlaylistId) {
    const initial = getInitialPlaylist();
    if (initial) { state.viewPlaylistId = initial.id; state.activePlaylistId = initial.id; }
  }
}

async function ensureInitialPlaylist() {
  const existing = [...state.playlists.values()].find(p => p.isInitial);
  if (!existing) {
    const pl = {
      id: generateId(),
      name: '全曲',
      isInitial: true,
      dateCreated: Date.now(),
      songs: [...state.songs.keys()].map((id, i) => ({ songId: id, manualOrder: i, addedAt: Date.now() }))
    };
    state.playlists.set(pl.id, pl);
    await DB.savePlaylist(pl);
  } else {
    // Sync: add any songs missing from initial playlist
    const currentIds = new Set(existing.songs.map(s => s.songId));
    let changed = false;
    for (const songId of state.songs.keys()) {
      if (!currentIds.has(songId)) {
        existing.songs.push({ songId, manualOrder: existing.songs.length, addedAt: Date.now() });
        changed = true;
      }
    }
    if (changed) await DB.savePlaylist(existing);
  }
}

export function getInitialPlaylist() {
  return [...state.playlists.values()].find(p => p.isInitial) || null;
}

// ===== Song Actions =====
export async function addSong(song, fileAB, thumbBlob) {
  state.songs.set(song.id, song);
  await DB.saveSong(song);
  await DB.saveSongFile(song.id, fileAB);
  if (thumbBlob) await DB.saveThumbnail(song.id, thumbBlob);

  // Add to initial playlist
  const initial = getInitialPlaylist();
  if (initial) {
    initial.songs.push({ songId: song.id, manualOrder: initial.songs.length, addedAt: Date.now() });
    await DB.savePlaylist(initial);
  }
  emit('songs-changed');
  emit('playlists-changed');
}

export async function updateSong(id, changes) {
  const song = state.songs.get(id);
  if (!song) return;
  Object.assign(song, changes);
  await DB.saveSong(song);
  emit('songs-changed', { id });
}

export async function deleteSong(id) {
  state.songs.delete(id);
  await DB.deleteSongFull(id);
  await DB.deleteLogsForSong(id);
  state.logs = state.logs.filter(l => l.songId !== id);

  // Remove from all playlists
  for (const [plId, pl] of state.playlists) {
    const before = pl.songs.length;
    pl.songs = pl.songs.filter(s => s.songId !== id);
    if (pl.songs.length !== before) await DB.savePlaylist(pl);
  }

  if (state.currentSongId === id) { state.currentSongId = null; emit('playback-changed'); }
  emit('songs-changed');
  emit('playlists-changed');
}

// ===== Playlist Actions =====
export async function createPlaylist(name) {
  const pl = { id: generateId(), name, isInitial: false, dateCreated: Date.now(), songs: [] };
  state.playlists.set(pl.id, pl);
  await DB.savePlaylist(pl);
  emit('playlists-changed');
  return pl;
}

export async function renamePlaylist(id, name) {
  const pl = state.playlists.get(id);
  if (!pl || pl.isInitial) return;
  pl.name = name;
  await DB.savePlaylist(pl);
  emit('playlists-changed');
}

export async function deletePlaylist(id) {
  const pl = state.playlists.get(id);
  if (!pl || pl.isInitial) return;
  state.playlists.delete(id);
  await DB.deletePlaylist(id);
  if (state.activePlaylistId === id || state.viewPlaylistId === id) {
    const init = getInitialPlaylist();
    state.activePlaylistId = init?.id || null;
    state.viewPlaylistId = state.activePlaylistId;
    emit('playback-changed');
  }
  emit('playlists-changed');
}

export async function addSongsToPlaylist(playlistId, songIds) {
  const pl = state.playlists.get(playlistId);
  if (!pl) return;
  const existing = new Set(pl.songs.map(s => s.songId));
  for (const sid of songIds) {
    if (!existing.has(sid)) {
      pl.songs.push({ songId: sid, manualOrder: pl.songs.length, addedAt: Date.now() });
    }
  }
  await DB.savePlaylist(pl);
  emit('playlists-changed', { id: playlistId });
}

export async function removeSongsFromPlaylist(playlistId, songIds) {
  const pl = state.playlists.get(playlistId);
  if (!pl) return;
  const remove = new Set(songIds);
  pl.songs = pl.songs.filter(s => !remove.has(s.songId));
  await DB.savePlaylist(pl);
  emit('playlists-changed', { id: playlistId });
}

export async function reorderPlaylistSong(playlistId, oldIdx, newIdx) {
  const pl = state.playlists.get(playlistId);
  if (!pl) return;
  const [item] = pl.songs.splice(oldIdx, 1);
  pl.songs.splice(newIdx, 0, item);
  pl.songs.forEach((s, i) => s.manualOrder = i);
  await DB.savePlaylist(pl);
  emit('playlists-changed', { id: playlistId });
}

// ===== Tag Actions =====
export async function createTag(tag) {
  state.tags.set(tag.id, tag);
  await DB.saveTag(tag);
  emit('tags-changed');
  return tag;
}
export async function updateTag(id, changes) {
  const tag = state.tags.get(id);
  if (!tag) return;
  Object.assign(tag, changes);
  await DB.saveTag(tag);
  emit('tags-changed', { id });
}
export async function deleteTag(id) {
  state.tags.delete(id);
  await DB.deleteTag(id);
  // Remove from all songs
  for (const [sid, song] of state.songs) {
    if (song.tagIds?.includes(id)) {
      song.tagIds = song.tagIds.filter(t => t !== id);
      await DB.saveSong(song);
    }
  }
  emit('tags-changed');
  emit('songs-changed');
}
export async function reorderTags(orderedIds) {
  orderedIds.forEach((id, i) => {
    const tag = state.tags.get(id);
    if (tag) { tag.order = i; DB.saveTag(tag); }
  });
  emit('tags-changed');
}

// ===== Artist Actions =====
export async function createArtist(artist) {
  state.artists.set(artist.id, artist);
  await DB.saveArtist(artist);
  emit('artists-changed');
  return artist;
}
export async function updateArtist(id, changes, iconBlob) {
  const artist = state.artists.get(id);
  if (!artist) return;
  Object.assign(artist, changes);
  await DB.saveArtist(artist);
  if (iconBlob) await DB.saveThumbnail('artist_' + id, iconBlob);
  emit('artists-changed', { id });
}
export async function deleteArtist(id) {
  state.artists.delete(id);
  await DB.deleteArtist(id);
  for (const [sid, song] of state.songs) {
    if (song.artistIds?.includes(id)) {
      song.artistIds = song.artistIds.filter(a => a !== id);
      await DB.saveSong(song);
    }
  }
  emit('artists-changed');
  emit('songs-changed');
}

// ===== Log Actions =====
export async function logPlay(songId, durationPlayed) {
  const log = { id: generateId(), songId, startTime: Date.now() - durationPlayed*1000, endTime: Date.now(), duration: durationPlayed };
  state.logs.push(log);
  await DB.saveLog(log);
}

// ===== Playback State =====
export function setCurrentSong(songId, playlistId) {
  state.currentSongId = songId;
  if (playlistId) state.activePlaylistId = playlistId;
  DB.setSetting('lastSongId', songId);
  DB.setSetting('lastPlaylistId', state.activePlaylistId);
  emit('song-changed', { songId });
}

export function setPlaying(v) { state.isPlaying = v; emit('playback-changed'); }
export function setTime(t, dur) { state.currentTime = t; state.duration = dur; emit('time-update', { t, dur }); }

export function setShuffle(v) {
  state.shuffle = v;
  if (v) buildShuffleQueue();
  DB.setSetting('shuffle', v);
  emit('playback-changed');
}
export function setLoop(v) { state.loop = v; DB.setSetting('loop', v); emit('playback-changed'); }
export function setRate(v) { state.playbackRate = v; DB.setSetting('playbackRate', v); emit('playback-changed'); }

export function buildShuffleQueue() {
  const pl = state.playlists.get(state.activePlaylistId);
  if (!pl) return;
  const ids = pl.songs.map(s => s.songId).filter(id => state.songs.has(id));
  // Fisher-Yates shuffle
  const q = [...ids];
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  // Put current song first if playing
  if (state.currentSongId) {
    const idx = q.indexOf(state.currentSongId);
    if (idx > 0) { const [cur] = q.splice(idx, 1); q.unshift(cur); }
  }
  state.shuffleQueue = q;
  state.shuffleIndex = 0;
}

export function getNextSongId() {
  const pl = state.playlists.get(state.activePlaylistId);
  if (!pl) return null;
  if (state.shuffle) {
    if (!state.shuffleQueue.length) buildShuffleQueue();
    state.shuffleIndex = (state.shuffleIndex + 1) % state.shuffleQueue.length;
    return state.shuffleQueue[state.shuffleIndex] || null;
  }

  const sortedIds = getSortedSongIds(pl);
  const cur = sortedIds.indexOf(state.currentSongId);
  if (cur < 0) return sortedIds[0] || null;
  if (cur < sortedIds.length - 1) return sortedIds[cur + 1];
  if (state.loop === 'all') return sortedIds[0];
  return null;
}

export function getPrevSongId() {
  const pl = state.playlists.get(state.activePlaylistId);
  if (!pl) return null;

  if (state.shuffle) {
    state.shuffleIndex = (state.shuffleIndex - 1 + state.shuffleQueue.length) % state.shuffleQueue.length;
    return state.shuffleQueue[state.shuffleIndex] || null;
  }

  const sortedIds = getSortedSongIds(pl);
  const cur = sortedIds.indexOf(state.currentSongId);
  if (cur > 0) return sortedIds[cur - 1];
  if (state.loop === 'all') return sortedIds[sortedIds.length - 1];
  return null;
}

export function getSortedSongIds(pl) {
  if (!pl) return [];
  const entries = pl.songs.filter(s => state.songs.has(s.songId));
  const sort = state.playerSort;
  const asc = state.playerSortAsc;

  entries.sort((a, b) => {
    let va, vb;
    if (sort === 'manual')     { va = a.manualOrder; vb = b.manualOrder; }
    else if (sort === 'dateAdded') { va = a.addedAt; vb = b.addedAt; }
    else if (sort === 'title') {
      va = (state.songs.get(a.songId)?.title || '').toLowerCase();
      vb = (state.songs.get(b.songId)?.title || '').toLowerCase();
    }
    else if (sort === 'releaseDate') {
      va = state.songs.get(a.songId)?.releaseDate || '';
      vb = state.songs.get(b.songId)?.releaseDate || '';
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return asc ? cmp : -cmp;
  });

  return entries.map(e => e.songId);
}

export function getFilteredSongIds(playlistId) {
  const pl = state.playlists.get(playlistId);
  if (!pl) return [];
  const q = state.playerSearch.toLowerCase().trim();
  let ids = getSortedSongIds(pl);
  if (!q) return ids;
  return ids.filter(id => {
    const s = state.songs.get(id);
    if (!s) return false;
    if (s.title?.toLowerCase().includes(q)) return true;
    if (s.releaseDate?.includes(q)) return true;
    const artistNames = (s.artistIds || []).map(aid => state.artists.get(aid)?.name || '').join(' ');
    if (artistNames.toLowerCase().includes(q)) return true;
    const tagNames = (s.tagIds || []).map(tid => state.tags.get(tid)?.name || '').join(' ');
    if (tagNames.toLowerCase().includes(q)) return true;
    return false;
  });
}

// ===== Settings =====
export async function setEqBands(bands) {
  state.eqBands = bands;
  await DB.setSetting('eqBands', bands);
}
export async function setEqEnabled(v) {
  state.eqEnabled = v;
  await DB.setSetting('eqEnabled', v);
  emit('eq-changed');
}
export async function setEqPreset(preset) {
  state.eqPreset = preset;
  await DB.setSetting('eqPreset', preset);
}
export async function setEqMode(mode) {
  state.eqMode = mode;
  await DB.setSetting('eqMode', mode);
}
export async function setEditorColumns(n) {
  state.editorColumns = n;
  await DB.setSetting('editorColumns', n);
}
