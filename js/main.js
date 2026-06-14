// js/main.js
import { initDB } from './storage.js';
import { state, loadAll, emit } from './state.js';
import { initAudio, loadAndPlay } from './audio.js';
import { EQ } from './equalizer.js';
import { initPlayer } from './player.js';
import { initEditor } from './editor.js';
import { initLog } from './log.js';
import { initSettings } from './settings.js';
import { updateIcons, showToast } from './utils.js';

// ===== Loading Screen =====
function showLoader() {
  const el = document.getElementById('app-loader');
  if (el) el.style.display = 'flex';
}
function hideLoader() {
  const el = document.getElementById('app-loader');
  if (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 320);
  }
}

// ===== Screen Switching =====
function switchScreen(name) {
  state.screen = name;

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });

  // Update screen panels
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === `screen-${name}`);
  });

  // Apply class to #app so CSS can show/hide player-widget in landscape
  const app = document.getElementById('app');
  if (app) app.className = `screen-${name}`;

  // Dispatch screen-changed event (editor, log, settings listen to this)
  document.dispatchEvent(new CustomEvent('screen-changed', { detail: name }));

  // Close player bottom sheet if navigating away in portrait
  if (window.matchMedia('(orientation:portrait)').matches) {
    const pw = document.getElementById('player-widget');
    const bd = document.getElementById('player-backdrop');
    pw?.classList.remove('open');
    bd?.classList.remove('show');
  }
}

// ===== Navigation =====
function initNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      if (screen) switchScreen(screen);
    });
  });
}

// ===== Lucide Icons Init =====
function initIcons() {
  if (window.lucide) {
    lucide.createIcons();
  } else {
    // Retry once if Lucide not yet loaded
    setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 300);
  }
}

// ===== Main Boot =====
async function main() {
  showLoader();

  try {
    // 1. Open IndexedDB
    await initDB();

    // 2. Load all data into state
    await loadAll();

    // 3. Init audio engine (passes EQ object; AudioContext deferred to first play)
    initAudio(EQ);

    // 4. Init screens
    initPlayer();
    initEditor();
    initLog();
    initSettings();

    // 5. Set up navigation
    initNavigation();

    // 6. Render initial screen (player)
    switchScreen('player');

    // 7. Trigger initial render by broadcasting state
    emit('songs-changed');
    emit('playlists-changed');
    emit('tags-changed');
    emit('artists-changed');

    // 8. Restore last playing song (load without autoplay)
    if (state.currentSongId && state.songs.has(state.currentSongId)) {
      try {
        await loadAndPlay(state.currentSongId, state.activePlaylistId, false);
      } catch (e) {
        console.warn('Could not restore last song:', e);
      }
    }

    // 9. Init Lucide icons
    initIcons();

    // 10. Hide loader
    hideLoader();

  } catch (err) {
    console.error('App initialization failed:', err);
    hideLoader();
    showToast('初期化に失敗しました。ページを再読み込みしてください。', 'error', 6000);
  }
}

// ===== Global error handler =====
window.addEventListener('unhandledrejection', e => {
  console.error('Unhandled promise rejection:', e.reason);
});

// ===== Start app =====
main();
