// js/settings.js
import { state, setEqEnabled, setEqPreset, setEqMode } from './state.js';
import { EQ, playSample, stopSample, isSamplePlaying, getSampleNames } from './equalizer.js';
import { clearAllData, getStorageInfo } from './storage.js';
import { formatBytes, showToast, sanitize, updateIcons } from './utils.js';
import { openConfirmModal } from './player.js';

const PRESET_LABELS = {
  normal: 'ノーマル', pop: 'ポップ', rock: 'ロック',
  classical: 'クラシック', jazz: 'ジャズ',
  bass: 'バス強調', treble: 'トレブル強調', voice: 'ボイス'
};
const EQ_FREQS = [31, 63, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'];

export function initSettings() {
  renderSettings();
  document.addEventListener('screen-changed', e => { if (e.detail === 'settings') loadStorageInfo(); });
}

function renderSettings() {
  const container = document.getElementById('settings-content');
  if (!container) return;
  container.innerHTML = '';
  container.appendChild(buildEqCard());
  container.appendChild(buildStorageCard());
  container.appendChild(buildAboutCard());
  updateIcons(container);
  bindEqEvents();
  loadStorageInfo();
}

// ===== Equalizer Card =====
function buildEqCard() {
  const card = document.createElement('div');
  card.className = 'settings-card';
  card.innerHTML = `
    <div class="settings-card-header-static">
      <div class="settings-card-title"><svg data-lucide="sliders"></svg>イコライザ</div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
        <span style="font-size:0.80rem;color:var(--c-text-500)">有効</span>
        <label class="toggle-switch">
          <input type="checkbox" id="eq-enable-toggle" ${state.eqEnabled?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
    <div class="settings-card-body" id="eq-card-body">
      <!-- Mode toggle -->
      <div class="eq-mode-tabs">
        <div class="eq-mode-btn${state.eqMode==='simple'?' active':''}" data-mode="simple">シンプル</div>
        <div class="eq-mode-btn${state.eqMode==='advanced'?' active':''}" data-mode="advanced">詳細設定</div>
      </div>

      <!-- Presets -->
      <div class="eq-presets" id="eq-presets">
        ${Object.entries(PRESET_LABELS).map(([k,v]) =>
          `<button class="eq-preset-btn${state.eqPreset===k?' active':''}" data-preset="${k}">${sanitize(v)}</button>`
        ).join('')}
      </div>

      <!-- Simple mode -->
      <div id="eq-simple-panel" class="${state.eqMode==='simple'?'':'hidden'}">
        ${buildSimpleBands()}
      </div>

      <!-- Advanced mode -->
      <div id="eq-advanced-panel" class="${state.eqMode==='advanced'?'':'hidden'}">
        ${buildAdvancedBands()}
      </div>

      <!-- Sample audio -->
      <div class="eq-sample-section">
        <div class="eq-sample-title">サンプル音源で試す</div>
        <div class="eq-sample-btns" id="eq-sample-btns">
          ${Object.entries(getSampleNames()).map(([k,v]) =>
            `<button class="eq-sample-btn" data-sample="${k}">${sanitize(v)}</button>`
          ).join('')}
        </div>
        <div class="eq-sample-controls" id="eq-sample-controls" style="display:none">
          <svg data-lucide="volume-2" width="16" height="16" style="color:var(--c-primary)"></svg>
          <span class="eq-sample-label" id="eq-sample-playing-label">再生中...</span>
          <button class="btn btn-secondary btn-sm" id="btn-stop-sample"><svg data-lucide="square"></svg>停止</button>
        </div>
      </div>
    </div>`;
  return card;
}

function buildSimpleBands() {
  const bands = state.eqBands;
  // Map 10 bands to 3: Bass(0-2), Mid(3-6), Treble(7-9)
  const bassDb  = Math.round((bands[0]+bands[1]+bands[2])/3);
  const midDb   = Math.round((bands[3]+bands[4]+bands[5]+bands[6])/4);
  const trebDb  = Math.round((bands[7]+bands[8]+bands[9])/3);

  const makeSlider = (id, label, val) => `
    <div class="eq-simple-band">
      <span class="eq-simple-label">${label}</span>
      <input type="range" class="eq-slider-h" id="${id}" min="-12" max="12" value="${val}" step="1">
      <span class="eq-simple-value" id="${id}-val">${val > 0 ? '+' : ''}${val}dB</span>
    </div>`;

  return `<div class="eq-simple">
    ${makeSlider('eq-bass', 'バス', bassDb)}
    ${makeSlider('eq-mid', 'ミッド', midDb)}
    ${makeSlider('eq-treble', 'トレブル', trebDb)}
  </div>`;
}

function buildAdvancedBands() {
  const bands = state.eqBands;
  const sliders = EQ_FREQS.map((freq, i) => `
    <div class="eq-band">
      <span class="eq-band-val" id="eq-adv-val-${i}">${bands[i]>0?'+':''}${bands[i]}</span>
      <input type="range" class="eq-slider-v" id="eq-adv-${i}" min="-12" max="12" value="${bands[i]}" step="1" orient="vertical">
      <span class="eq-band-label">${freq}${typeof freq==='number'?'Hz':''}</span>
    </div>`).join('');

  return `<div class="eq-advanced"><div class="eq-bands-wrap">${sliders}</div></div>`;
}

// ===== Bind EQ Events =====
function bindEqEvents() {
  // Enable toggle
  document.getElementById('eq-enable-toggle')?.addEventListener('change', async e => {
    await setEqEnabled(e.target.checked);
    EQ.setEnabled(e.target.checked);
  });

  // Mode toggle
  document.querySelectorAll('.eq-mode-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.mode;
      await setEqMode(mode);
      document.querySelectorAll('.eq-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
      const simplePanel = document.getElementById('eq-simple-panel');
      const advPanel    = document.getElementById('eq-advanced-panel');
      if (simplePanel) simplePanel.classList.toggle('hidden', mode !== 'simple');
      if (advPanel)    advPanel.classList.toggle('hidden', mode !== 'advanced');
    });
  });

  // Presets
  document.querySelectorAll('.eq-preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const preset = btn.dataset.preset;
      const values = EQ.applyPreset(preset);
      await setEqPreset(preset);
      document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.toggle('active', b === btn));
      updateSliderValues(values);
    });
  });

  // Simple sliders
  const bindSimple = (id, bandIndices) => {
    const slider = document.getElementById(id);
    const valEl  = document.getElementById(id + '-val');
    if (!slider) return;
    slider.addEventListener('input', () => {
      const db = parseInt(slider.value);
      if (valEl) valEl.textContent = `${db > 0 ? '+' : ''}${db}dB`;
      bandIndices.forEach(i => EQ.setBand(i, db));
      // Clear preset
      document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));
    });
  };
  bindSimple('eq-bass',   [0,1,2]);
  bindSimple('eq-mid',    [3,4,5,6]);
  bindSimple('eq-treble', [7,8,9]);

  // Advanced sliders
  for (let i = 0; i < 10; i++) {
    const slider = document.getElementById(`eq-adv-${i}`);
    const valEl  = document.getElementById(`eq-adv-val-${i}`);
    if (!slider) continue;
    slider.addEventListener('input', () => {
      const db = parseInt(slider.value);
      if (valEl) valEl.textContent = `${db > 0 ? '+' : ''}${db}`;
      EQ.setBand(i, db);
      document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));
    });
  }

  // Sample buttons
  let activeSample = null;
  document.querySelectorAll('.eq-sample-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sampleKey = btn.dataset.sample;
      const controls = document.getElementById('eq-sample-controls');
      const label    = document.getElementById('eq-sample-playing-label');

      if (activeSample === sampleKey && isSamplePlaying()) {
        stopSample();
        activeSample = null;
        document.querySelectorAll('.eq-sample-btn').forEach(b => b.classList.remove('playing'));
        if (controls) controls.style.display = 'none';
        return;
      }

      document.querySelectorAll('.eq-sample-btn').forEach(b => b.classList.remove('playing'));
      btn.classList.add('playing');
      activeSample = sampleKey;
      if (label) label.textContent = getSampleNames()[sampleKey] + ' — 再生中';
      if (controls) controls.style.display = 'flex';

      await playSample(sampleKey, state.eqEnabled);
    });
  });

  document.getElementById('btn-stop-sample')?.addEventListener('click', () => {
    stopSample(); activeSample = null;
    document.querySelectorAll('.eq-sample-btn').forEach(b => b.classList.remove('playing'));
    const controls = document.getElementById('eq-sample-controls');
    if (controls) controls.style.display = 'none';
  });
}

function updateSliderValues(bands) {
  // Update simple sliders
  const bassDb  = Math.round((bands[0]+bands[1]+bands[2])/3);
  const midDb   = Math.round((bands[3]+bands[4]+bands[5]+bands[6])/4);
  const trebDb  = Math.round((bands[7]+bands[8]+bands[9])/3);

  const setSlider = (id, val) => {
    const s = document.getElementById(id); const v = document.getElementById(id+'-val');
    if (s) s.value = val;
    if (v) v.textContent = `${val>0?'+':''}${val}dB`;
  };
  setSlider('eq-bass', bassDb); setSlider('eq-mid', midDb); setSlider('eq-treble', trebDb);

  // Update advanced sliders
  bands.forEach((db, i) => {
    const s = document.getElementById(`eq-adv-${i}`);
    const v = document.getElementById(`eq-adv-val-${i}`);
    if (s) s.value = db;
    if (v) v.textContent = `${db>0?'+':''}${db}`;
  });
}

// ===== Storage Card =====
function buildStorageCard() {
  const card = document.createElement('div');
  card.className = 'settings-card';
  card.innerHTML = `
    <div class="settings-card-header-static">
      <div class="settings-card-title"><svg data-lucide="hard-drive"></svg>ストレージ</div>
    </div>
    <div class="settings-card-body">
      <div class="storage-bar-wrap">
        <div class="storage-bar-bg"><div class="storage-bar-fill" id="storage-bar" style="width:0%"></div></div>
        <div class="storage-bar-labels"><span id="storage-used">計算中...</span><span id="storage-quota"></span></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">登録曲数</div>
          <div class="settings-row-sub" id="song-count-label">—</div>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">キャッシュをクリア</div>
          <div class="settings-row-sub">すべての曲・設定・履歴を削除します</div>
        </div>
        <button class="btn btn-danger btn-sm" id="btn-clear-cache"><svg data-lucide="trash-2"></svg>クリア</button>
      </div>
    </div>`;

  card.querySelector('#btn-clear-cache')?.addEventListener('click', () => {
    openConfirmModal('すべてのデータを削除しますか？', '曲ファイル・プレイリスト・タグ・アーティスト・再生履歴がすべて削除されます。この操作は取り消せません。', async () => {
      await clearAllData();
      showToast('データをクリアしました。ページを再読み込みします。', 'success', 2500);
      setTimeout(() => location.reload(), 2500);
    });
  });

  return card;
}

async function loadStorageInfo() {
  const info = await getStorageInfo();
  // Update song count
  const songCountEl = document.getElementById('song-count-label');
  if (songCountEl) songCountEl.textContent = `${state.songs.size}曲`;
  // Update storage count too
  const countEl = document.getElementById('song-count-label');
  if (countEl) countEl.textContent = `${state.songs.size}曲`;

  if (!info) return;
  const bar   = document.getElementById('storage-bar');
  const used  = document.getElementById('storage-used');
  const quota = document.getElementById('storage-quota');
  const pct   = info.quota > 0 ? (info.usage / info.quota) * 100 : 0;

  if (bar) {
    bar.style.width = `${Math.min(pct, 100)}%`;
    if (pct > 90) bar.classList.add('danger');
    else if (pct > 70) bar.classList.add('warn');
  }
  if (used)  used.textContent  = `使用中: ${formatBytes(info.usage)}`;
  if (quota) quota.textContent = `上限: ${formatBytes(info.quota)}`;
}

// ===== About Card =====
function buildAboutCard() {
  const card = document.createElement('div');
  card.className = 'settings-card';
  card.innerHTML = `
    <div class="settings-card-header-static">
      <div class="settings-card-title"><svg data-lucide="info"></svg>このアプリについて</div>
    </div>
    <div class="settings-card-body">
      <div class="settings-row">
        <div class="settings-row-label">音楽プレイヤー</div>
        <div style="font-size:0.80rem;color:var(--c-text-500)">v1.0.0</div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-row-label">データ保存</div>
          <div class="settings-row-sub">IndexedDB（ブラウザ内）</div>
        </div>
      </div>
      <div class="settings-row" style="border-bottom:none">
        <div>
          <div class="settings-row-label">対応フォーマット</div>
          <div class="settings-row-sub">MP3 / AAC / WAV / OGG / FLAC</div>
        </div>
      </div>
    </div>`;
  return card;
}
