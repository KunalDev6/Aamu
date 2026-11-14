import { theme } from './generated/theme.js';

const params = new URLSearchParams(location.search);
const requested = params.get('screen');
const screen = ['alarm', 'message', 'home'].includes(requested) ? requested : 'alarm';
const defaultDawn = { alarm: 0.15, message: 1, home: 0.55 };
let progress = Math.max(0, Math.min(1, Number(params.get('dawn') ?? defaultDawn[screen])));
if (!Number.isFinite(progress)) progress = defaultDawn[screen];
if (params.get('capture') === '1') document.body.classList.add('capture');

const phone = document.querySelector('#phone');
phone.classList.add(screen);
document.title = `Aamu — ${screen} visual review`;
document.querySelectorAll('.review-tabs a').forEach((anchor) => {
  if (anchor.getAttribute('href').includes(`screen=${screen}`)) anchor.setAttribute('aria-current', 'page');
});

const tinyStep = 'Touch your swimsuit on the door hook.';
const fullStep = 'Put swim bag by the front door';
const clock = (subtitle) => `
  <section class="clock-area">
    <time class="clock" datetime="07:15">07:15</time>
    <p>${subtitle}</p>
  </section>`;
const primary = (label, extra = '') => `<button class="pill pill-primary" type="button" ${extra}>${label}</button>`;

const views = {
  alarm: `
    ${clock('Dawn has begun')}
    <footer class="screen-footer alarm-footer">
      <button class="pill pill-primary" id="hold-button" type="button" aria-label="I'm up. Hold for 2 seconds.">
        <span class="hold-fill" aria-hidden="true"></span>
        <span class="pill-label">I'm up</span>
      </button>
      <p class="hold-helper">Hold for 2 seconds</p>
      <button class="pill pill-secondary" type="button" data-preview="Snooze is shown for visual review. No alarm is scheduled.">Snooze</button>
    </footer>`,
  message: `
    <section class="voice-card" aria-label="Recorded message preview">
      <div class="waveform" aria-hidden="true">
        ${[13, 23, 33, 20, 39, 29, 43, 30, 21, 37, 27, 17, 10].map((height) => `<span style="--bar-height: ${height}px"></span>`).join('')}
      </div>
      <p>From your well self</p>
    </section>
    <footer class="screen-footer message-footer">
      <article class="step-card">
        <p class="eyebrow">Today's step</p>
        <h1>${tinyStep}</h1>
      </article>
      <div class="too-much-row"><button type="button" data-preview="The agreed reduction is one size per tap. This screen is a static visual preview.">Too much today</button></div>
      <div class="message-secondary">
        <button class="quiet-link" type="button" data-preview="A real recording would replay here. This preview has no audio.">Listen again</button>
        <button class="quiet-link" type="button" data-preview="Rest message will stop playback and exclude this recording until restored. No recording exists in this preview.">Rest message</button>
      </div>
      ${primary('OK', 'data-preview="Navigation beyond this screen is outside the visual review."')}
    </footer>`,
  home: `
    ${clock('Next alarm')}
    <footer class="screen-footer home-footer">
      <article class="step-card">
        <p class="eyebrow">Today's step</p>
        <h1>${fullStep}</h1>
      </article>
      ${primary('Done', 'data-preview="Completion behavior is not implemented in this visual review."')}
      <nav class="bottom-links" aria-label="Home actions">
        <button type="button" data-preview="Recording is outside this three-screen visual review.">Record a message</button>
        <button type="button" data-preview="Settings is outside this three-screen visual review.">Settings</button>
      </nav>
    </footer>`,
};
document.querySelector('#screen-content').innerHTML = views[screen];

function mix(first, second, amount) {
  const from = first.slice(1).match(/../g).map((value) => parseInt(value, 16));
  const to = second.slice(1).match(/../g).map((value) => parseInt(value, 16));
  return `rgb(${from.map((value, index) => Math.round(value + (to[index] - value) * amount)).join(' ')})`;
}

function sceneColors(at) {
  const index = at <= 0.5 ? 0 : 1;
  const from = theme.dawnFrames[index];
  const to = theme.dawnFrames[index + 1];
  const amount = (at - from.at) / (to.at - from.at);
  return Object.fromEntries(Object.keys(from).filter((key) => key !== 'at').map((key) => [key, mix(from[key], to[key], amount)]));
}

function pine(x, base, height, width) {
  let path = `M${x - 1} ${base}h2v-${height * 0.18}h-2z`;
  for (let index = 0; index < 3; index += 1) {
    const top = base - height + index * height * 0.26;
    const bottom = top + height * 0.42;
    const halfWidth = width * (0.32 + 0.22 * index);
    path += `M${x} ${top}L${x + halfWidth} ${bottom}H${x - halfWidth}z`;
  }
  return path;
}

function renderLandscape() {
  const scene = sceneColors(progress);
  const c = theme.colors;
  const confirmedUp = screen !== 'alarm';
  const treesNear = [[18, 315, 68, 27], [45, 322, 49, 21], [72, 315, 34, 15], [326, 315, 55, 23], [352, 322, 73, 29], [377, 319, 40, 18]];
  const treesFar = [[94, 257, 17, 8], [108, 257, 12, 6], [290, 256, 15, 7], [305, 256, 11, 5]];
  document.querySelector('#landscape').innerHTML = `
    <svg viewBox="0 0 390 410" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${c.canvas}" />
          <stop offset=".28" stop-color="${scene.sky}" />
          <stop offset=".65" stop-color="${scene.horizon}" />
          <stop offset="1" stop-color="${scene.hillNear}" />
        </linearGradient>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${scene.lake}" />
          <stop offset="1" stop-color="${scene.lakeLow}" />
        </linearGradient>
        <radialGradient id="sun-glow">
          <stop offset="0" stop-color="${c.accent}" stop-opacity=".24" />
          <stop offset="1" stop-color="${c.accent}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="bottom-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${c.canvas}" stop-opacity="0" />
          <stop offset=".85" stop-color="${c.canvas}" stop-opacity="1" />
        </linearGradient>
      </defs>
      <rect width="390" height="410" fill="url(#sky)" />
      ${confirmedUp ? `
        <circle cx="269" cy="183" r="84" fill="url(#sun-glow)" />
        <circle cx="269" cy="183" r="25" fill="${c.accentLight}" />
      ` : ''}
      <path d="M0 219C45 200 85 210 128 215S225 196 278 205S355 208 390 205V410H0Z" fill="${scene.hillFar}" />
      <path d="M0 238C65 217 117 235 174 234S281 215 390 235V410H0Z" fill="${scene.hillMiddle}" />
      <path d="M0 254C68 239 142 255 220 248S337 240 390 251V410H0Z" fill="${scene.hillNear}" />
      <path d="${treesFar.map((tree) => pine(...tree)).join('')}" fill="${scene.pine}" />
      <path d="M0 257C98 253 163 260 229 257S341 253 390 258V309H0Z" fill="url(#lake)" />
      ${confirmedUp ? `
        <g stroke="${c.accentLight}" stroke-linecap="round" fill="none">
          <path d="M238 267h61" stroke-width="2" opacity=".65" />
          <path d="M248 274h42" stroke-width="2" opacity=".45" />
          <path d="M256 281h27" stroke-width="1.5" opacity=".3" />
        </g>
      ` : ''}
      <path d="M0 307C66 291 144 313 231 307S345 297 390 306V410H0Z" fill="${scene.hillMiddle}" />
      <path d="M0 325C89 312 194 333 292 323S365 317 390 323V410H0Z" fill="${scene.hillNear}" />
      <path d="${treesNear.map((tree) => pine(...tree)).join('')}" fill="${scene.pine}" />
      <rect y="315" width="390" height="95" fill="url(#bottom-fade)" />
    </svg>`;
}

renderLandscape();
const slider = document.querySelector('#dawn-progress');
slider.value = progress;
slider.addEventListener('input', () => {
  progress = Number(slider.value);
  renderLandscape();
});

const announce = (message) => { document.querySelector('#review-announcement').textContent = message; };
document.addEventListener('click', (event) => {
  const control = event.target.closest('[data-preview]');
  if (control) announce(control.dataset.preview);
});

// The only illustrated interaction is the already-approved two-second hold.
// It resets on release and never changes screen, wake state or stored data.
const holdButton = document.querySelector('#hold-button');
if (holdButton) {
  let frame;
  let start;
  const fill = holdButton.querySelector('.hold-fill');
  const cancel = () => {
    cancelAnimationFrame(frame);
    start = undefined;
    fill.style.width = '0%';
  };
  const tick = (now) => {
    if (start === undefined) return;
    const amount = Math.min(1, (now - start) / 2000);
    fill.style.width = `${amount * 100}%`;
    if (amount < 1) frame = requestAnimationFrame(tick);
    else announce('Two-second hold visual completed. No wake-up record or partner event was created.');
  };
  const begin = () => {
    cancel();
    start = performance.now();
    frame = requestAnimationFrame(tick);
  };
  holdButton.addEventListener('pointerdown', (event) => { event.preventDefault(); holdButton.setPointerCapture(event.pointerId); begin(); });
  holdButton.addEventListener('pointerup', cancel);
  holdButton.addEventListener('pointercancel', cancel);
  holdButton.addEventListener('lostpointercapture', cancel);
  holdButton.addEventListener('keydown', (event) => { if ([' ', 'Enter'].includes(event.key) && !event.repeat) { event.preventDefault(); begin(); } });
  holdButton.addEventListener('keyup', cancel);
  holdButton.addEventListener('blur', cancel);
}
