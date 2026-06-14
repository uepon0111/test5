// js/utils.js

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  } catch { return dateStr; }
}

export function parseDate(str) {
  if (!str) return null;
  // Accept YYYY, YYYY-MM, YYYY-MM-DD
  const patterns = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{4})\/(\d{2})\/(\d{2})$/,
    /^(\d{4})-(\d{2})$/,
    /^(\d{4})$/
  ];
  for (const p of patterns) {
    const m = str.match(p);
    if (m) {
      const y = parseInt(m[1]);
      const mo = m[2] ? parseInt(m[2]) - 1 : 0;
      const d = m[3] ? parseInt(m[3]) : 1;
      const date = new Date(y, mo, d);
      if (!isNaN(date.getTime())) return date.toISOString().slice(0,10);
    }
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
  } catch {}
  return null;
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function throttle(fn, interval) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= interval) { last = now; fn(...args); }
  };
}

export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export function sanitize(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ===== Toast =====
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = { info:'info', success:'check-circle', warning:'alert-triangle', error:'x-circle' }[type] || 'info';
  toast.innerHTML = `<svg width="15" height="15" data-lucide="${icon}"></svg><span>${sanitize(message)}</span>`;
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons({ nodes: [toast] });

  const hide = () => {
    toast.classList.add('toast-hide');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };
  const t = setTimeout(hide, duration);
  toast.addEventListener('click', () => { clearTimeout(t); hide(); });
}

// ===== Anniversary =====
export function getAnniversaryInfo(releaseDateStr) {
  if (!releaseDateStr) return null;
  const release = new Date(releaseDateStr);
  if (isNaN(release.getTime())) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const yearsSince = today.getFullYear() - release.getFullYear();
  if (yearsSince <= 0) return null;

  // Check today
  if (release.getMonth() === today.getMonth() && release.getDate() === today.getDate()) {
    return { years: yearsSince, daysUntil: 0, isToday: true };
  }

  // Check upcoming within 30 days
  for (let days = 1; days <= 30; days++) {
    const future = new Date(today);
    future.setDate(today.getDate() + days);
    const nextYears = future.getFullYear() - release.getFullYear();
    if (nextYears > 0 && release.getMonth() === future.getMonth() && release.getDate() === future.getDate()) {
      return { years: nextYears, daysUntil: days, isToday: false };
    }
  }
  return null;
}

// ===== Period helpers =====
export function getPeriodRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case 'today':
      return { start: today.getTime(), end: today.getTime() + 86400000 };
    case 'week': {
      const dow = today.getDay();
      const mon = new Date(today); mon.setDate(today.getDate() - ((dow + 6) % 7));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 7);
      return { start: mon.getTime(), end: sun.getTime() };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const end   = new Date(now.getFullYear(), now.getMonth()+1, 1).getTime();
      return { start, end };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1).getTime();
      const end   = new Date(now.getFullYear()+1, 0, 1).getTime();
      return { start, end };
    }
    default:
      return { start: 0, end: Infinity };
  }
}

// ===== DOM helpers =====
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}
export function qsa(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}
export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

export function updateIcons(root = document) {
  if (window.lucide) lucide.createIcons({ nodes: root.querySelectorAll ? [...root.querySelectorAll('[data-lucide]')] : undefined });
}

// ===== File reader =====
export function readFileAsArrayBuffer(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    if (onProgress) reader.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    reader.readAsArrayBuffer(file);
  });
}
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
export function arrayBufferToBlob(ab, mimeType = 'audio/mpeg') {
  return new Blob([ab], { type: mimeType });
}

// ===== ObjectURL cache =====
const _urlCache = new Map();
export function getCachedURL(key, blobOrAB, mimeType) {
  if (_urlCache.has(key)) return _urlCache.get(key);
  const blob = blobOrAB instanceof Blob ? blobOrAB : new Blob([blobOrAB], { type: mimeType });
  const url = URL.createObjectURL(blob);
  _urlCache.set(key, url);
  return url;
}
export function revokeCachedURL(key) {
  if (_urlCache.has(key)) { URL.revokeObjectURL(_urlCache.get(key)); _urlCache.delete(key); }
}
export function revokeAllCachedURLs() {
  for (const url of _urlCache.values()) URL.revokeObjectURL(url);
  _urlCache.clear();
}

// ===== Color utils =====
export const TAG_COLORS = [
  '#EF4444','#F97316','#F59E0B','#84CC16','#22C55E',
  '#10B981','#06B6D4','#3B82F6','#6366F1','#A855F7',
  '#EC4899','#F43F5E','#64748B','#78716C','#0EA5E9'
];
