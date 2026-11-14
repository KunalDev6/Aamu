import { demoEnabled } from './config.js';
import { classifyClinic, clinicLabels, shiftClinicDate, sortClinicRows } from './engine.js';
import { createClinicProvider, prioritizeCallRequests } from './provider.js';
import { createClinicPolling } from './polling.js';

const app = document.querySelector('#app');
const statuses = ['might_need_call', 'drifting', 'insufficient', 'steady'];
const e = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const displayDate = date => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  .format(new Date(`${date}T00:00:00Z`));
const levelLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard', stopped: 'Stopped', no_response: 'No response', off: 'Alarm off' };
let records = [];
let results = [];
let selectedId = null;
let filter = 'all';
let query = '';
let asOf = localToday();
let lastUpdated = null;
let poller;
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
const displayTimestamp = value => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function brand() {
  return `<aside class="sidebar"><a class="brand" href="./" aria-label="Aamu morning overview"><span class="brand-sun" aria-hidden="true"></span>aamu</a>
    <p class="brand-caption">Care overview</p><div class="nav-current">Mornings</div>
    <div class="sidebar-note"><span class="small-sun" aria-hidden="true"></span><p>A little more context.<br>A quieter check-in.</p></div></aside>`;
}

if (!demoEnabled) {
  app.innerHTML = `${brand()}<main id="overview" class="main empty-page"><span class="eyebrow">Aamu clinic</span>
    <h1>Morning overview</h1><section class="empty-state"><h2>No clinic data connected</h2>
    <p>This workspace has no live morning feed.</p></section></main>`;
} else {
  renderShell(); renderResults();
  poller = createClinicPolling({
    load: createClinicProvider({ demoEnabled }), visible: !document.hidden,
    onData(payload) {
      calculate(payload.patients); lastUpdated = Date.now(); renderResults();
      document.querySelector('#connection-status').textContent = `Updated ${displayTimestamp(lastUpdated)}`;
    },
    onError() {
      document.querySelector('#connection-status').textContent = lastUpdated
        ? `Couldn’t refresh. Showing the update from ${displayTimestamp(lastUpdated)}.`
        : 'Couldn’t load clinic records. Try Refresh.';
    },
    onLoading(loading) { document.querySelector('#refresh').disabled = loading; },
  });
  void poller.refresh();
  document.addEventListener('visibilitychange', () => poller.setVisible(!document.hidden));
  window.addEventListener('pagehide', () => poller.setVisible(false));
  window.addEventListener('pageshow', () => poller.setVisible(!document.hidden));
}

function calculate(nextRecords) {
  const today = localToday();
  const nextResults = prioritizeCallRequests(sortClinicRows(nextRecords.map(record => classifyClinic(record, today))), nextRecords);
  records = nextRecords; results = nextResults; asOf = today;
  if (!results.some(result => result.id === selectedId)) selectedId = results[0]?.id ?? null;
}

const presenting = new URLSearchParams(location.search).get('present') === '1';
if (presenting) document.documentElement.classList.add('presenting');

function renderShell() {
  app.innerHTML = `${brand()}<main id="overview" class="main">
    <header class="page-header"><div><span class="eyebrow">Recent mornings, in context</span><h1>Morning overview</h1>
      <p class="intro">See what has changed. Make space for a quiet conversation.</p></div>
      <div class="header-meta"><span class="demo-badge">Demo</span><span id="overview-date">${e(displayDate(asOf))}</span></div></header>
    <div class="demo-notice"><p>Connected presenter records and fictional profiles.</p>
      <button class="text-button" id="refresh">Refresh</button></div>
    <p id="connection-status" class="connection-status">${presenting ? 'Connecting…' : 'Connecting to the demo clinic…'}</p>
    <section class="summary-grid" aria-label="Overview counts">${statuses.map(status => `<div class="summary-card" data-summary="${status}">
      <span class="summary-count">${results.filter(row => row.status === status).length}</span><span>${e(clinicLabels[status])}</span></div>`).join('')}</section>
    <section class="work-area" aria-label="Morning records"><div class="people-panel">
      <div class="panel-heading"><h2>Recent mornings</h2><span id="result-count"></span></div>
      <div class="filters"><label>Find a person<input id="search" type="search" placeholder="Search by ID" autocomplete="off"></label>
        <label>Show<select id="status-filter"><option value="all">All statuses</option>${statuses.map(status => `<option value="${status}">${e(clinicLabels[status])}</option>`).join('')}</select></label></div>
      <div class="list-heading" aria-hidden="true"><span>Person and pattern</span><span>Last 14 days</span></div>
      <div id="people-list" class="people-list"></div>
      <div class="legend" aria-label="Morning markers">${['easy', 'medium', 'hard', 'stopped', 'no_response', 'off', 'missing'].map(level =>
        `<span><i class="day-dot ${level}" aria-hidden="true"></i>${e(levelLabels[level] ?? 'No record')}</span>`).join('')}</div>
    </div><aside id="detail-panel" class="detail-panel" aria-label="Selected person details"></aside></section>
    <footer class="page-footer">Demo workspace. Call requests are stored here; no call is placed.</footer>
  </main>`;
  document.querySelector('#search').addEventListener('input', event => { query = event.target.value.trim().toLowerCase(); renderResults(); });
  document.querySelector('#status-filter').addEventListener('change', event => { filter = event.target.value; renderResults(); });
  document.querySelector('#refresh').addEventListener('click', () => { void poller?.refresh(); });
  document.querySelector('#people-list').addEventListener('click', event => {
    const button = event.target.closest('button[data-person]');
    if (button) { selectedId = button.dataset.person; renderResults(); }
  });
}

function description(row) {
  if (!row || row.level === null) return 'No final morning record';
  if (row.level === 'stopped') return row.upAt === null ? 'alarm stopped but getting up not confirmed' : 'alarm stopped; getting up confirmed later';
  if (row.level === 'no_response' && row.upAt !== null) return 'no response in the first hour; getting up confirmed later';
  return levelLabels[row.level];
}

function strip(record, end) {
  return Array.from({ length: 14 }, (_, i) => {
    const date = shiftClinicDate(end, i - 13);
    const row = record.mornings.find(item => item.localDate === date);
    const level = row?.level ?? 'missing';
    return `<span class="day-cell" title="${e(`${displayDate(date)}: ${description(row)}`)}" aria-label="${e(`${displayDate(date)}: ${description(row)}`)}"><i class="day-dot ${level}" aria-hidden="true"></i></span>`;
  }).join('');
}

function renderResults() {
  const focusedId = document.activeElement?.closest('button[data-person]')?.dataset.person;
  const visible = results.filter(row => (filter === 'all' || row.status === filter) && row.id.toLowerCase().includes(query));
  if (!visible.some(row => row.id === selectedId)) selectedId = visible[0]?.id ?? null;
  document.querySelector('#result-count').textContent = `${visible.length} of ${results.length} people`;
  document.querySelector('#overview-date').textContent = displayDate(asOf);
  for (const status of statuses) document.querySelector(`[data-summary="${status}"] .summary-count`).textContent = results.filter(row => row.status === status).length;
  document.querySelector('#people-list').innerHTML = visible.length ? visible.map(result => {
    const record = records.find(item => item.id === result.id);
    return `<button class="person-row${selectedId === result.id ? ' selected' : ''}" data-person="${e(result.id)}" aria-pressed="${selectedId === result.id}">
      <span class="person-copy"><span class="person-id">${e(result.id)}</span><span class="row-meta">${record.presenter ? 'Connected presenter' : 'Fictional profile'}</span>
      ${record.callbackRequestedAt !== null ? '<span class="callback-label">Asked for a call</span>' : ''}<span class="status-label">${e(result.label)}</span>
      <span class="row-meta">${result.recent.observed} observed in 7 days${result.consecutiveOff >= 7 ? ` · Alarm off ${result.consecutiveOff} days` : ''}</span></span>
      <span class="timeline-block"><span class="day-strip">${strip(record, result.recent.end)}</span><span class="timeline-label">${e(displayDate(shiftClinicDate(result.recent.end, -13)))} — ${e(displayDate(result.recent.end))}</span></span>
    </button>`;
  }).join('') : results.length
    ? '<div class="empty-list"><h3>No matching people</h3><p>Try another ID or show all statuses.</p></div>'
    : '<div class="empty-list"><h3>No clinic records</h3><p>Connected records will appear here when they are available.</p></div>';
  if (focusedId) [...document.querySelectorAll('button[data-person]')].find(button => button.dataset.person === focusedId)?.focus({ preventScroll: true });
  renderDetail();
}

function renderDetail() {
  const panel = document.querySelector('#detail-panel');
  const comparisonOpen = panel.dataset.selectedId === selectedId && panel.querySelector('details')?.open;
  const result = results.find(row => row.id === selectedId);
  if (!result) { document.querySelector('#detail-panel').innerHTML = '<div class="detail-empty">Choose a person to see their mornings.</div>'; return; }
  const record = records.find(item => item.id === result.id);
  const last = record.mornings.filter(row => row.localDate <= result.recent.end).sort((a, b) => b.localDate.localeCompare(a.localDate)).slice(0, 7);
  const average = value => value === null ? '—' : Number(value.toFixed(2));
  panel.dataset.selectedId = selectedId;
  panel.innerHTML = `<div class="detail-top"><span class="eyebrow">${record.presenter ? 'Connected presenter' : 'Fictional profile'}</span><h2>${e(result.id)}</h2>
    <span class="detail-status">${e(result.label)}</span></div>
    ${record.callbackRequestedAt !== null ? `<section class="callback-card"><h3>Asked for a call</h3><p>${e(displayTimestamp(record.callbackRequestedAt))}</p></section>` : ''}
    <section class="reason-card"><h3>Why this pattern appears</h3><p>${e(result.reason)}</p></section>
    <div class="detail-metrics"><div><span>${result.recent.observed}</span><p>Recent observations</p></div><div><span>${result.recent.done}</span><p>Steps completed</p></div></div>
    <details class="calculation"${comparisonOpen ? ' open' : ''}><summary>View the comparison</summary><dl><div><dt>Recent 7 days</dt><dd>${e(displayDate(result.recent.start))} — ${e(displayDate(result.recent.end))}</dd></div>
      <div><dt>Recent average</dt><dd>${average(result.recent.average)}</dd></div><div><dt>Previous 14-day average</dt><dd>${average(result.comparison.average)} · ${result.comparison.observed} observations</dd></div>
      <div><dt>Earlier steps completed</dt><dd>${result.previousDone} in the preceding 7 days</dd></div></dl>
      <p>${result.limitedHistory ? 'Fewer than 5 comparison observations: average-change rules are not used.' : 'Averages include observed mornings only.'} Alarm-off and missing days are excluded.</p></details>
    <section class="recent-detail"><h3>Latest recorded mornings</h3>${last.length ? `<ol>${last.map(row => `<li><time datetime="${e(row.localDate)}">${e(displayDate(row.localDate))}</time><span><strong>${e(description(row))}</strong><small>${row.level === 'off' ? 'Excluded from pattern counts' : row.stepDone === true ? 'Step completed' : row.stepDone === false ? 'Step not completed' : 'No step outcome recorded'}</small></span></li>`).join('')}</ol>` : '<p>No mornings recorded.</p>'}</section>`;
}
