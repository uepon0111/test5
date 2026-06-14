// js/equalizer.js
import { state, setEqBands } from './state.js';

const FREQ = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const DB_MIN = -12, DB_MAX = 12;

export const EQ_PRESETS = {
  normal:   [0,0,0,0,0,0,0,0,0,0],
  pop:      [1,1,2,3,2,1,0,1,1,1],
  rock:     [3,3,2,0,-1,-1,-1,0,2,3],
  classical:[0,0,0,0,0,0,-2,-3,-3,-2],
  jazz:     [0,0,0,2,3,2,0,0,0,0],
  bass:     [5,5,4,2,1,0,0,0,0,0],
  treble:   [0,0,0,0,0,0,1,2,4,5],
  voice:    [-2,-1,0,1,4,4,3,2,0,-1],
};

let _filters = [];
let _ctx = null;

export const EQ = {
  getFilterChain(audioCtx) {
    _ctx = audioCtx;
    _filters = FREQ.map((freq, i) => {
      const f = audioCtx.createBiquadFilter();
      f.frequency.value = freq;
      f.gain.value = state.eqEnabled ? ((state.eqBands || [])[i] || 0) : 0;
      if (i === 0) f.type = 'lowshelf';
      else if (i === FREQ.length - 1) f.type = 'highshelf';
      else f.type = 'peaking';
      f.Q.value = 1.4;
      return f;
    });

    // Chain filters
    for (let i = 0; i < _filters.length - 1; i++) {
      _filters[i].connect(_filters[i+1]);
    }

    return { input: _filters[0], output: _filters[_filters.length - 1] };
  },

  setEnabled(enabled) {
    if (!_filters.length) return;
    if (enabled) {
      for (let i = 0; i < _filters.length; i++) {
        _filters[i].gain.value = (state.eqBands || [])[i] || 0;
      }
    } else {
      for (const f of _filters) f.gain.value = 0;
    }
  },

  setBand(index, dbValue) {
    if (!_filters[index]) return;
    const db = Math.max(DB_MIN, Math.min(DB_MAX, dbValue));
    _filters[index].gain.value = db;
    const bands = [...(state.eqBands || new Array(10).fill(0))];
    bands[index] = db;
    setEqBands(bands);
  },

  applyPreset(presetName) {
    const values = EQ_PRESETS[presetName] || EQ_PRESETS.normal;
    values.forEach((db, i) => EQ.setBand(i, db));
    return values;
  },

  getBands() { return _filters.map(f => f.gain.value); },
  getFrequencies() { return FREQ; }
};

// ===== Sample Audio Generator =====
let _sampleCtx = null;
let _sampleSource = null;
let _sampleActive = false;

const SAMPLES = {
  balanced: 'バランス',
  bass:     'バス (低音)',
  treble:   'トレブル (高音)',
  voice:    'ボイス (声)',
};
export { SAMPLES };

export function getSampleNames() { return SAMPLES; }

export function stopSample() {
  if (_sampleSource) {
    try { _sampleSource.stop(); } catch {}
    _sampleSource = null;
  }
  _sampleActive = false;
}

export async function playSample(type, eqEnabled) {
  stopSample();

  try {
    if (!_sampleCtx || _sampleCtx.state === 'closed') {
      _sampleCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_sampleCtx.state === 'suspended') await _sampleCtx.resume();

    const buf = generateSampleBuffer(_sampleCtx, type);
    _sampleSource = _sampleCtx.createBufferSource();
    _sampleSource.buffer = buf;
    _sampleSource.loop = true;

    // Apply EQ filters from main state if enabled
    if (eqEnabled && _filters.length) {
      // Clone filter values into new filters for sample context
      const sampleFilters = FREQ.map((freq, i) => {
        const f = _sampleCtx.createBiquadFilter();
        f.frequency.value = freq;
        f.gain.value = (_filters[i]?.gain.value || 0);
        if (i === 0) f.type = 'lowshelf';
        else if (i === FREQ.length - 1) f.type = 'highshelf';
        else { f.type = 'peaking'; f.Q.value = 1.4; }
        return f;
      });
      for (let i = 0; i < sampleFilters.length - 1; i++) sampleFilters[i].connect(sampleFilters[i+1]);
      _sampleSource.connect(sampleFilters[0]);
      sampleFilters[sampleFilters.length - 1].connect(_sampleCtx.destination);
    } else {
      _sampleSource.connect(_sampleCtx.destination);
    }

    _sampleSource.start(0);
    _sampleActive = true;
    _sampleSource.onended = () => { _sampleActive = false; };
  } catch (e) { console.error('Sample play error:', e); }
}

export function isSamplePlaying() { return _sampleActive; }

function generateSampleBuffer(ctx, type) {
  const sr = ctx.sampleRate;
  const dur = 4; // 4 seconds looping
  const buf = ctx.createBuffer(2, sr * dur, sr);

  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      let s = 0;
      switch (type) {
        case 'balanced':
          // Full spectrum: bass + mids + highs in equal measure
          s = 0.18 * Math.sin(2*Math.PI*80*t)
            + 0.15 * Math.sin(2*Math.PI*160*t)
            + 0.12 * Math.sin(2*Math.PI*500*t)
            + 0.12 * Math.sin(2*Math.PI*1000*t)
            + 0.10 * Math.sin(2*Math.PI*2000*t)
            + 0.08 * Math.sin(2*Math.PI*4000*t)
            + 0.06 * Math.sin(2*Math.PI*8000*t);
          // Add chord movement (120 BPM rhythm)
          s *= 0.6 + 0.4 * Math.abs(Math.sin(2*Math.PI*2*t));
          break;
        case 'bass':
          s = 0.35 * Math.sin(2*Math.PI*55*t)
            + 0.25 * Math.sin(2*Math.PI*110*t)
            + 0.20 * Math.sin(2*Math.PI*82.5*t)
            + 0.10 * Math.sin(2*Math.PI*165*t);
          s *= 0.5 + 0.5 * Math.abs(Math.sin(2*Math.PI*1.5*t));
          break;
        case 'treble':
          s = 0.20 * Math.sin(2*Math.PI*2000*t)
            + 0.18 * Math.sin(2*Math.PI*3000*t)
            + 0.15 * Math.sin(2*Math.PI*4000*t)
            + 0.12 * Math.sin(2*Math.PI*6000*t)
            + 0.08 * Math.sin(2*Math.PI*8000*t);
          s *= 0.5 + 0.5 * Math.abs(Math.sin(2*Math.PI*3*t));
          break;
        case 'voice':
          // Formant-like voice frequencies (300-3400 Hz speech band)
          s = 0.20 * Math.sin(2*Math.PI*300*t)
            + 0.25 * Math.sin(2*Math.PI*700*t)
            + 0.20 * Math.sin(2*Math.PI*1200*t)
            + 0.18 * Math.sin(2*Math.PI*2500*t)
            + 0.10 * Math.sin(2*Math.PI*3400*t);
          // Vibrato
          s *= 1.0 + 0.05 * Math.sin(2*Math.PI*5*t);
          s *= 0.5 + 0.5 * Math.abs(Math.sin(2*Math.PI*2.5*t));
          break;
        default:
          s = 0.3 * Math.sin(2*Math.PI*440*t);
      }
      data[i] = Math.max(-1, Math.min(1, s));
    }
  }
  return buf;
}
