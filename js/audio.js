// js/audio.js
import { state, setPlaying, setTime, setCurrentSong,
         getNextSongId, getPrevSongId, buildShuffleQueue, logPlay, emit } from './state.js';
import { getSongFile } from './storage.js';

let audioEl = null;
let audioCtx = null;
let sourceNode = null;
let gainNode = null;
let _eqChain = null;
let _currentSongUrl = null;
let _currentSongId = null;
let _playStartTime = 0;
let _playedDuration = 0;
let _seeking = false;

export function getAudioEl() { return audioEl; }
export function getAudioCtx() { return audioCtx; }
export function getGainNode() { return gainNode; }

export function initAudio(eqChain) {
  audioEl = new Audio();
  audioEl.crossOrigin = 'anonymous';
  audioEl.preload = 'metadata';
  _eqChain = eqChain;

  audioEl.addEventListener('timeupdate', () => {
    if (!_seeking) setTime(audioEl.currentTime, audioEl.duration || 0);
  });

  audioEl.addEventListener('ended', handleEnded);
  audioEl.addEventListener('play',  () => {
    setPlaying(true);
    _playStartTime = Date.now();
  });
  audioEl.addEventListener('pause', () => {
    setPlaying(false);
    _accumulateDuration();
  });
  audioEl.addEventListener('error', (e) => {
    console.error('Audio error', e);
    setPlaying(false);
  });
}

function _accumulateDuration() {
  if (_playStartTime > 0) {
    _playedDuration += (Date.now() - _playStartTime) / 1000;
    _playStartTime = 0;
  }
}

async function handleEnded() {
  _accumulateDuration();
  // Log play
  if (_currentSongId && _playedDuration > 2) {
    await logPlay(_currentSongId, _playedDuration);
  }
  _playedDuration = 0;

  if (state.loop === 'one') {
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
    return;
  }
  const next = getNextSongId();
  if (next) {
    await loadAndPlay(next, state.activePlaylistId, true);
  } else {
    setPlaying(false);
    emit('song-ended');
  }
}

// ===== AudioContext init (requires user gesture) =====
async function ensureContext() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    return;
  }

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = audioCtx.createMediaElementSource(audioEl);
  gainNode   = audioCtx.createGain();

  if (_eqChain && _eqChain.getFilterChain) {
    const { input, output } = _eqChain.getFilterChain(audioCtx);
    sourceNode.connect(input);
    output.connect(gainNode);
  } else {
    sourceNode.connect(gainNode);
  }
  gainNode.connect(audioCtx.destination);
}

// ===== Load and play a song =====
export async function loadAndPlay(songId, playlistId, autoplay = true) {
  if (!audioEl) return;

  // Log previous song's play duration before switching
  _accumulateDuration();
  if (_currentSongId && _playedDuration > 2) {
    await logPlay(_currentSongId, _playedDuration);
  }
  _playedDuration = 0;
  _playStartTime = 0;

  try {
    const ab = await getSongFile(songId);
    if (!ab) { console.warn('No audio file for', songId); return; }

    // Revoke previous URL
    if (_currentSongUrl) { URL.revokeObjectURL(_currentSongUrl); _currentSongUrl = null; }

    const mimeType = guessMime(songId);
    const blob = new Blob([ab], { type: mimeType });
    _currentSongUrl = URL.createObjectURL(blob);
    _currentSongId = songId;

    audioEl.src = _currentSongUrl;
    audioEl.load();
    audioEl.playbackRate = state.playbackRate;

    setCurrentSong(songId, playlistId);

    if (autoplay) {
      await ensureContext();
      audioEl.play().catch(err => console.warn('Play prevented:', err));
    }
  } catch (err) {
    console.error('loadAndPlay error:', err);
  }
}

function guessMime(songId) {
  const song = state.songs ? state.songs.get(songId) : null;
  return song?.mimeType || 'audio/mpeg';
}

// ===== Controls =====
export async function play() {
  if (!audioEl) return;
  await ensureContext();
  audioEl.play().catch(e => console.warn(e));
}

export function pause() {
  if (audioEl) audioEl.pause();
}

export function togglePlay() {
  if (!audioEl) return;
  if (state.isPlaying) pause(); else play();
}

export function seekTo(seconds) {
  if (!audioEl) return;
  _seeking = true;
  audioEl.currentTime = seconds;
  setTimeout(() => { _seeking = false; }, 100);
}

export function setPlaybackRate(rate) {
  if (audioEl) audioEl.playbackRate = rate;
}

export async function playNext() {
  const next = getNextSongId();
  if (next) await loadAndPlay(next, state.activePlaylistId, true);
}

export async function playPrev() {
  // Restart if more than 3s in
  if (audioEl && audioEl.currentTime > 3) { seekTo(0); return; }
  const prev = getPrevSongId();
  if (prev) await loadAndPlay(prev, state.activePlaylistId, true);
}

export async function playSongInPlaylist(songId, playlistId) {
  if (state.shuffle) buildShuffleQueue();
  await loadAndPlay(songId, playlistId, true);
}

// ===== Volume =====
export function setVolume(v) {
  if (gainNode) gainNode.gain.value = v;
}
