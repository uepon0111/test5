// js/log.js
import { state, on } from './state.js';
import { getThumbURL } from './player.js';
import { getThumbnail } from './storage.js';
import { getPeriodRange, getAnniversaryInfo, formatDate, sanitize, updateIcons } from './utils.js';

let _charts = {};

export function initLog() {
  bindPeriodTabs();
  on('songs-changed', () => { if (state.screen === 'log') renderLog(); });
  document.addEventListener('screen-changed', e => { if (e.detail === 'log') renderLog(); });
}

function bindPeriodTabs() {
  document.querySelectorAll('.log-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.logPeriod = btn.dataset.period;
      document.querySelectorAll('.log-period-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderLog();
    });
  });
}

// ===== Compute Stats =====
function computeStats(period) {
  const range = getPeriodRange(period);
  const logsInRange = state.logs.filter(l => l.startTime >= range.start && l.startTime < range.end);

  let totalPlays = logsInRange.length;
  let totalSeconds = logsInRange.reduce((s, l) => s + (l.duration||0), 0);
  const uniqueSongIds = new Set(logsInRange.map(l => l.songId));

  // Song play counts
  const songCounts = {};
  logsInRange.forEach(l => { songCounts[l.songId] = (songCounts[l.songId]||0) + 1; });

  // Artist play counts
  const artistCounts = {};
  logsInRange.forEach(l => {
    const song = state.songs.get(l.songId);
    if (!song) return;
    (song.artistIds||[]).forEach(aid => { artistCounts[aid] = (artistCounts[aid]||0) + 1; });
  });

  // Tag play counts
  const tagCounts = {};
  logsInRange.forEach(l => {
    const song = state.songs.get(l.songId);
    if (!song) return;
    (song.tagIds||[]).forEach(tid => { tagCounts[tid] = (tagCounts[tid]||0) + 1; });
  });

  // Daily play counts (for timeline)
  const dailyPlays = {};
  logsInRange.forEach(l => {
    const d = new Date(l.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    dailyPlays[key] = (dailyPlays[key]||0) + 1;
  });

  // Top songs
  const topSongs = Object.entries(songCounts).sort((a,b)=>b[1]-a[1]).slice(0,8)
    .map(([id,count]) => ({ song: state.songs.get(id), count })).filter(x=>x.song);

  // Top artists
  const topArtists = Object.entries(artistCounts).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([id,count]) => ({ artist: state.artists.get(id), count })).filter(x=>x.artist);

  // Top tags
  const topTags = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([id,count]) => ({ tag: state.tags.get(id), count })).filter(x=>x.tag);

  return { totalPlays, totalSeconds, uniqueSongs: uniqueSongIds.size, topSongs, topArtists, topTags, dailyPlays, range };
}

// ===== Render Log =====
export async function renderLog() {
  const container = document.getElementById('log-content');
  if (!container) return;

  // Destroy existing charts
  Object.values(_charts).forEach(c => { try { c.destroy(); } catch {} });
  _charts = {};

  const stats = computeStats(state.logPeriod);
  container.innerHTML = '';

  if (stats.totalPlays === 0 && state.logs.length === 0) {
    container.innerHTML = '<div class="log-empty"><div class="empty-state"><svg data-lucide="bar-chart-2" width="48" height="48"></svg><strong>再生履歴がありません</strong><p>曲を再生するとここに統計が表示されます</p></div></div>';
    updateIcons(container); return;
  }

  // --- Stats cards ---
  const statsGrid = document.createElement('div');
  statsGrid.className = 'log-stats-grid';
  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-card-icon"><svg data-lucide="play-circle"></svg></div>
      <div class="stat-value">${stats.totalPlays.toLocaleString('ja-JP')}</div>
      <div class="stat-label">再生回数</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-icon"><svg data-lucide="clock"></svg></div>
      <div class="stat-value">${formatListenTime(stats.totalSeconds)}</div>
      <div class="stat-label">総再生時間</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-icon"><svg data-lucide="music-2"></svg></div>
      <div class="stat-value">${stats.uniqueSongs.toLocaleString('ja-JP')}</div>
      <div class="stat-label">再生曲数</div>
    </div>`;
  container.appendChild(statsGrid);
  updateIcons(statsGrid);

  // --- Two-col grid ---
  const twoCol = document.createElement('div');
  twoCol.className = 'log-two-col';
  container.appendChild(twoCol);

  // --- Top Songs ---
  if (stats.topSongs.length) {
    const card = createChartCard('人気曲トップ', 'music-2', true);
    const list = card.querySelector('.rank-list');
    const maxCount = stats.topSongs[0]?.count || 1;
    for (let i = 0; i < stats.topSongs.length; i++) {
      const { song, count } = stats.topSongs[i];
      const artists = (song.artistIds||[]).map(id => state.artists.get(id)?.name).filter(Boolean).join(', ') || '不明';
      const item = document.createElement('div');
      item.className = 'rank-item';
      item.innerHTML = `
        <div class="rank-num${i<3?' top'+(i+1):''}">${i+1}</div>
        <div class="rank-thumb"><svg data-lucide="music" width="15" height="15"></svg></div>
        <div class="rank-info">
          <div class="rank-name">${sanitize(song.title||'不明')}</div>
          <div class="rank-sub">${sanitize(artists)}</div>
          <div class="rank-bar-wrap"><div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${(count/maxCount)*100}%"></div></div></div>
        </div>
        <div class="rank-count">${count}回</div>`;
      // Load thumb
      const thumbDiv = item.querySelector('.rank-thumb');
      getThumbURL(song.id).then(url => { if (url && thumbDiv.isConnected) thumbDiv.innerHTML = `<img src="${url}" alt="">`; });
      list.appendChild(item);
    }
    updateIcons(card);
    twoCol.appendChild(card);
  }

  // --- Top Artists ---
  if (stats.topArtists.length) {
    const card = createChartCard('人気アーティスト', 'user', true);
    const list = card.querySelector('.rank-list');
    const maxCount = stats.topArtists[0]?.count || 1;
    for (let i = 0; i < stats.topArtists.length; i++) {
      const { artist, count } = stats.topArtists[i];
      const item = document.createElement('div');
      item.className = 'rank-item';
      item.innerHTML = `
        <div class="rank-num${i<3?' top'+(i+1):''}">${i+1}</div>
        <div class="rank-artist-icon"><svg data-lucide="user" width="15" height="15"></svg></div>
        <div class="rank-info">
          <div class="rank-name">${sanitize(artist.name)}</div>
          <div class="rank-bar-wrap"><div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${(count/maxCount)*100}%;background:#F97316"></div></div></div>
        </div>
        <div class="rank-count">${count}回</div>`;
      const iconDiv = item.querySelector('.rank-artist-icon');
      getThumbnail('artist_' + artist.id).then(blob => {
        if (blob && iconDiv.isConnected) { const u = URL.createObjectURL(blob); iconDiv.innerHTML = `<img src="${u}" alt="">`; }
      });
      list.appendChild(item);
    }
    updateIcons(card);
    twoCol.appendChild(card);
  }

  // --- Top Tags ---
  if (stats.topTags.length) {
    const card = createChartCard('人気タグ', 'tag', false);
    const body = card.querySelector('.chart-card-body');
    const sortedTags = stats.topTags;
    const maxCount = sortedTags[0]?.count || 1;
    for (const { tag, count } of sortedTags) {
      const item = document.createElement('div');
      item.className = 'tag-rank-item';
      item.innerHTML = `
        <div class="tag-rank-dot" style="background:${sanitize(tag.color||'#ccc')};border:2px solid rgba(0,0,0,0.08)"></div>
        <div class="tag-rank-name">${sanitize(tag.name)}</div>
        <div class="rank-bar-wrap" style="flex:1"><div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${(count/maxCount)*100}%;background:${sanitize(tag.color||'var(--c-primary)')}"></div></div></div>
        <div class="rank-count" style="min-width:36px">${count}回</div>`;
      body.appendChild(item);
    }
    container.appendChild(card);
  }

  // --- Play Timeline ---
  if (Object.keys(stats.dailyPlays).length > 1) {
    const card = createChartCard('再生タイムライン', 'trending-up', false, true);
    const wrap = card.querySelector('.chart-canvas-wrap');
    const canvas = document.createElement('canvas');
    canvas.style.maxHeight = '160px';
    wrap.appendChild(canvas);
    container.appendChild(card);

    await new Promise(r => setTimeout(r, 50)); // allow DOM paint

    if (window.Chart && canvas.isConnected) {
      const days = getDateRange(stats.range.start, Math.min(stats.range.end, Date.now()));
      const counts = days.map(d => stats.dailyPlays[d] || 0);
      _charts.timeline = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: days.map(d => d.slice(5)),
          datasets: [{ data: counts, backgroundColor: 'rgba(37,99,235,0.55)', borderRadius: 4, label: '再生回数' }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 14, maxRotation: 45 } },
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.06)' } }
          }
        }
      });
    }
  }

  // --- Anniversary Section ---
  const anniversaries = getAnniversaries();
  if (anniversaries.length) {
    const section = document.createElement('div');
    section.className = 'anniversary-section';
    section.innerHTML = `<div class="anniversary-title">周年</div><div class="anniversary-cards" id="anv-cards"></div>`;
    container.appendChild(section);
    const cardsEl = section.querySelector('#anv-cards');

    for (const { song, info } of anniversaries) {
      const artists = (song.artistIds||[]).map(id => state.artists.get(id)?.name).filter(Boolean).join(', ') || '不明';
      const card = document.createElement('div');
      card.className = `anniversary-card${info.isToday?' today':''}`;
      card.innerHTML = `
        <div class="anv-thumb"><svg data-lucide="music" width="18" height="18"></svg></div>
        <div class="anv-info">
          <div class="anv-title">${sanitize(song.title||'不明')}</div>
          <div class="anv-artist">${sanitize(artists)}</div>
          <div style="font-size:0.72rem;color:var(--c-text-500);margin-top:2px">${sanitize(formatDate(song.releaseDate)||'')}</div>
        </div>
        <div class="anv-badge">
          <div class="anv-years${info.isToday?' anv-years-today':''}">${info.years}周年</div>
          <div class="anv-label">${info.isToday ? '🎉 本日' : `あと${info.daysUntil}日`}</div>
        </div>`;
      const thumbDiv = card.querySelector('.anv-thumb');
      getThumbURL(song.id).then(url => { if (url && thumbDiv.isConnected) thumbDiv.innerHTML = `<img src="${url}" alt="">`; });
      updateIcons(card);
      cardsEl.appendChild(card);
    }
  }

  updateIcons(container);
}

function getAnniversaries() {
  const result = [];
  for (const song of state.songs.values()) {
    if (!song.releaseDate) continue;
    const info = getAnniversaryInfo(song.releaseDate);
    if (info) result.push({ song, info });
  }
  return result.sort((a,b) => a.info.daysUntil - b.info.daysUntil);
}

function createChartCard(title, icon, useRankList = true, hasCanvas = false) {
  const card = document.createElement('div');
  card.className = 'chart-card';
  card.innerHTML = `
    <div class="chart-card-header">
      <div class="chart-card-title"><svg data-lucide="${icon}"></svg>${sanitize(title)}</div>
    </div>
    <div class="chart-card-body">
      ${useRankList ? '<div class="rank-list"></div>' : ''}
      ${hasCanvas ? '<div class="chart-canvas-wrap" style="height:160px;position:relative"></div>' : ''}
    </div>`;
  return card;
}

function formatListenTime(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  if (seconds < 3600) return `${Math.round(seconds/60)}分`;
  const h = Math.floor(seconds/3600);
  const m = Math.round((seconds%3600)/60);
  return `${h}時間${m > 0 ? m+'分' : ''}`;
}

function getDateRange(startMs, endMs) {
  const dates = [];
  const d = new Date(startMs);
  d.setHours(0,0,0,0);
  const end = new Date(endMs);
  end.setHours(0,0,0,0);
  while (d <= end) {
    dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    d.setDate(d.getDate() + 1);
  }
  return dates.slice(-60); // max 60 days
}
