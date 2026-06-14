// js/storage.js

const DB_NAME = 'MusicPlayerDB';
const DB_VERSION = 1;

const S = {
  SONGS:     'songs',
  FILES:     'songFiles',
  THUMBS:    'thumbnails',
  PLAYLISTS: 'playlists',
  TAGS:      'tags',
  ARTISTS:   'artists',
  LOGS:      'playLogs',
  SETTINGS:  'settings'
};
export { S };

let _db = null;

export async function initDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      const storeNames = [S.SONGS, S.FILES, S.THUMBS, S.PLAYLISTS, S.TAGS, S.ARTISTS, S.LOGS, S.SETTINGS];
      for (const name of storeNames) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

function wrap(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

export const getAll = (store) => wrap(tx(store).getAll());
export const getById = (store, id) => wrap(tx(store).get(id));
export const putItem = (store, data) => wrap(tx(store, 'readwrite').put(data));
export const deleteItem = (store, id) => wrap(tx(store, 'readwrite').delete(id));
export const clearStore = (store) => wrap(tx(store, 'readwrite').clear());

// ===== Songs =====
export async function saveSong(song) { return putItem(S.SONGS, song); }
export async function getSong(id) { return getById(S.SONGS, id); }
export async function getAllSongs() { return getAll(S.SONGS); }
export async function deleteSongFull(id) {
  await deleteItem(S.SONGS, id);
  await deleteItem(S.FILES, id);
  await deleteItem(S.THUMBS, id);
}

// ===== Files =====
export async function saveSongFile(songId, arrayBuffer) {
  return putItem(S.FILES, { id: songId, data: arrayBuffer });
}
export async function getSongFile(songId) {
  const r = await getById(S.FILES, songId); return r?.data || null;
}

// ===== Thumbnails =====
export async function saveThumbnail(songId, blob) {
  return putItem(S.THUMBS, { id: songId, data: blob });
}
export async function getThumbnail(songId) {
  const r = await getById(S.THUMBS, songId); return r?.data || null;
}

// ===== Playlists =====
export async function savePlaylist(pl) { return putItem(S.PLAYLISTS, pl); }
export async function getPlaylist(id) { return getById(S.PLAYLISTS, id); }
export async function getAllPlaylists() { return getAll(S.PLAYLISTS); }
export async function deletePlaylist(id) { return deleteItem(S.PLAYLISTS, id); }

// ===== Tags =====
export async function saveTag(tag) { return putItem(S.TAGS, tag); }
export async function getAllTags() { return getAll(S.TAGS); }
export async function deleteTag(id) { return deleteItem(S.TAGS, id); }

// ===== Artists =====
export async function saveArtist(artist) { return putItem(S.ARTISTS, artist); }
export async function getAllArtists() { return getAll(S.ARTISTS); }
export async function deleteArtist(id) { return deleteItem(S.ARTISTS, id); }

// ===== Play Logs =====
export async function saveLog(log) { return putItem(S.LOGS, log); }
export async function getAllLogs() { return getAll(S.LOGS); }
export async function deleteLogsForSong(songId) {
  const all = await getAllLogs();
  for (const log of all) {
    if (log.songId === songId) await deleteItem(S.LOGS, log.id);
  }
}

// ===== Settings =====
export async function getSetting(key, def = null) {
  const r = await getById(S.SETTINGS, key); return r != null ? r.value : def;
}
export async function setSetting(key, value) {
  return putItem(S.SETTINGS, { id: key, value });
}

// ===== Bulk helpers =====
export async function loadAllData() {
  const [songs, playlists, tags, artists, logs] = await Promise.all([
    getAllSongs(), getAllPlaylists(), getAllTags(), getAllArtists(), getAllLogs()
  ]);
  return { songs, playlists, tags, artists, logs };
}

export async function clearAllData() {
  for (const store of Object.values(S)) await clearStore(store);
}

// ===== Storage estimate =====
export async function getStorageInfo() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try { return await navigator.storage.estimate(); } catch {}
  }
  return null;
}
