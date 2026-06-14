// js/metadata.js
import { generateId } from './utils.js';
import { parseDate } from './utils.js';
import { state, createArtist } from './state.js';
import { saveArtist } from './storage.js';

// Supported audio MIME types
export const SUPPORTED_MIME = [
  'audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/flac',
  'audio/wav','audio/x-wav','audio/webm','audio/x-flac','audio/m4a'
];
export const SUPPORTED_EXT = ['.mp3','.mp4','.m4a','.aac','.ogg','.opus','.flac','.wav','.webm'];

export function isAudioFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return SUPPORTED_EXT.includes(ext) || SUPPORTED_MIME.some(m => file.type.startsWith(m.split('/')[0]) && file.type.includes(m.split('/')[1]));
}

// Extract duration from ArrayBuffer via AudioContext
export function extractDuration(arrayBuffer) {
  return new Promise(resolve => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
      ctx.decodeAudioData(arrayBuffer.slice(0), buf => {
        ctx.close();
        resolve(buf.duration);
      }, () => { ctx.close(); resolve(0); });
    } catch { resolve(0); }
  });
}

// Read ID3 tags using jsmediatags
function readTags(file) {
  return new Promise(resolve => {
    if (!window.jsmediatags) { resolve({}); return; }
    try {
      window.jsmediatags.read(file, {
        onSuccess(tag) { resolve(tag.tags || {}); },
        onError()      { resolve({}); }
      });
    } catch { resolve({}); }
  });
}

// Parse artist string → array of names
function parseArtistNames(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const cleaned = raw.trim();
  if (!cleaned) return [];
  // Split on common delimiters: comma, slash, semicolon, full-width variants
  const parts = cleaned.split(/[,/;、・×]/);
  return parts.map(p => p.trim()).filter(Boolean);
}

// Find or create artist by name, return ID
async function findOrCreateArtist(name) {
  const trimmed = name.trim();
  // Check existing
  for (const [id, artist] of state.artists) {
    if (artist.name === trimmed) return id;
  }
  // Create new
  const artist = { id: generateId(), name: trimmed, hasIcon: false };
  state.artists.set(artist.id, artist);
  await saveArtist(artist);
  return artist.id;
}

// Main: extract metadata from a File object
export async function extractMetadata(file, arrayBuffer) {
  const tags = await readTags(file);

  // --- Title ---
  const rawTitle = tags.title;
  const title = rawTitle && rawTitle.trim()
    ? rawTitle.trim()
    : file.name.replace(/\.[^/.]+$/, '');

  // --- Artists ---
  const rawArtist = tags.artist || tags.TPE1 || '';
  const artistNames = parseArtistNames(rawArtist);
  const unknownName = '不明のアーティスト';

  let artistIds = [];
  if (artistNames.length > 0) {
    for (const name of artistNames) {
      const id = await findOrCreateArtist(name);
      artistIds.push(id);
    }
  } else {
    const id = await findOrCreateArtist(unknownName);
    artistIds = [id];
  }

  // --- Release Date ---
  const rawYear = tags.year || tags.TDRC || tags.TYER || '';
  const releaseDate = parseDate(String(rawYear).trim()) || null;

  // --- Thumbnail ---
  let thumbBlob = null;
  const pic = tags.picture;
  if (pic && pic.data && pic.format) {
    try {
      const uint8 = new Uint8Array(pic.data);
      const mimeType = pic.format.includes('/') ? pic.format : `image/${pic.format.replace('.','') || 'jpeg'}`;
      thumbBlob = new Blob([uint8], { type: mimeType });
    } catch {}
  }

  // --- Duration ---
  const duration = await extractDuration(arrayBuffer.slice(0));

  return { title, artistIds, releaseDate, thumbBlob, duration };
}
