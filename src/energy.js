import { pickCountry, outlinePath } from './country-outlines.js';

const NS = 'http://www.w3.org/2000/svg';
const hero = document.querySelector('.hero');
const pageLift = document.querySelector('.page-lift');
const targets = [...document.querySelectorAll('.intro, .journeys, .places, .week, .hosts, .stays, .faq, .explore, .quote')];
const journeyScroll = document.querySelector('.journey-scroll');
const journeysSection = document.querySelector('.journeys');
const journeysIndex = targets.indexOf(journeysSection);
const journeyMap = document.querySelector('.journey-map');
const journeyMapFill = journeyMap?.querySelector('.journey-map__fill');
const journeyMapStroke = journeyMap?.querySelector('.journey-map__stroke');
const journeyMapLabel = journeyMap?.querySelector('.journey-map__label');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Draw the country in the first 45% of the journey scrub, then hold. */
const MAP_DRAW_WINDOW = 0.45;

const stream = document.createElement('div');
stream.className = 'energy-stream';
stream.setAttribute('aria-hidden', 'true');
stream.innerHTML = `
  <div class="energy-stream__shift">
    <svg class="energy-stream__svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="energy-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#66b7ff" />
          <stop offset="48%" stop-color="#d8ff66" />
          <stop offset="100%" stop-color="#6ce1c5" />
        </linearGradient>
        <filter id="energy-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path class="energy-stream__glow" fill="none" />
      <path class="energy-stream__path" fill="none" />
      <g class="energy-stream__particles"></g>
      <circle class="energy-stream__orb" r="4.5" />
    </svg>
  </div>`;
(pageLift || document.body).append(stream);

const shift = stream.querySelector('.energy-stream__shift');
const svg = stream.querySelector('svg');
const glow = stream.querySelector('.energy-stream__glow');
const path = stream.querySelector('.energy-stream__path');
const orb = stream.querySelector('.energy-stream__orb');
const particles = stream.querySelector('.energy-stream__particles');
const dots = Array.from({ length: 4 }, () => {
  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('r', '2');
  particles.append(dot);
  return dot;
});

let length = 1;
let mapLength = 1;
let documentHeight = 1;
let targetThresholds = [];
let requested = false;
let startY = 0;
let journeyTop = 0;
let journeyTravel = 0;
let journeyHoldY = 0;
let pinActive = false;
/** Main ribbon length at the dock (before journeys exit). */
let dockLength = 0;
let activeCountry = pickCountry();
let mapEntry = { x: 0, y: 0 };

function pageHeight() {
  if (pageLift) return Math.max(1, Math.ceil(pageLift.offsetHeight));
  return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
}

function anchorYFor(target) {
  const origin = pageLift ? pageLift.getBoundingClientRect().top + window.scrollY : 0;
  if (target.classList.contains('journeys')) {
    const scene = target.querySelector('.journey-scroll') || target;
    const sticky = target.querySelector('.journey-sticky') || target;
    const base = scene.getBoundingClientRect().top + window.scrollY - origin;
    return base + Math.min(sticky.offsetHeight * .48, window.innerHeight * .5);
  }
  const rect = target.getBoundingClientRect();
  return rect.top + window.scrollY - origin + Math.min(rect.height * .48, window.innerHeight * .5);
}

function appendCurve(d, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const pull = Math.min(dist * 0.36, 120);
  const c1x = a.x + (dx / dist) * pull;
  const c1y = a.y + (dy / dist) * pull;
  const c2x = b.x - (dx / dist) * pull;
  const c2y = b.y - (dy / dist) * pull;
  return `${d} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function measure(el, d) {
  el.setAttribute('d', d);
  return el.getTotalLength() || 1;
}

function mountCountry() {
  if (!journeyMap || !journeyMapStroke || !activeCountry) return;
  const d = outlinePath(activeCountry);
  journeyMapFill?.setAttribute('d', d);
  journeyMapStroke.setAttribute('d', d);
  journeyMap.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  journeyMapStroke.removeAttribute('vector-effect');
  journeyMapStroke.setAttribute('stroke-width', '1.6');
  journeyMapStroke.setAttribute('stroke-linejoin', 'round');
  journeyMapStroke.setAttribute('stroke-linecap', 'round');
  journeyMapStroke.style.removeProperty('stroke-width');
  mapLength = journeyMapStroke.getTotalLength() || 1;
  journeyMapStroke.style.strokeDasharray = `${mapLength}`;
  journeyMapStroke.style.strokeDashoffset = `${mapLength}`;
  if (journeyMapLabel) journeyMapLabel.textContent = activeCountry.name;
  journeyMap.classList.remove('is-drawing', 'is-complete');
  journeyMap.dataset.country = activeCountry.id;
}

function buildPath() {
  const width = window.innerWidth;
  documentHeight = pageHeight();
  const origin = pageLift ? pageLift.getBoundingClientRect().top + window.scrollY : 0;
  const heroBottom = hero.getBoundingClientRect().bottom + window.scrollY - origin;
  startY = heroBottom + Math.max(34, window.innerHeight * .045);

  const rails = [.58, .42, .62, .38, .56, .44, .60, .40, .54];
  const pad = Math.min(width * .12, 88);
  const clampX = (x) => Math.max(pad, Math.min(width - pad, x));

  if (journeyScroll) {
    journeyTop = journeyScroll.getBoundingClientRect().top + window.scrollY;
    journeyTravel = Math.max(0, journeyScroll.offsetHeight - window.innerHeight);
  }

  targetThresholds = targets.map((target) => anchorYFor(target));
  journeyHoldY = journeysIndex >= 0 ? targetThresholds[journeysIndex] : startY;

  const last = targetThresholds[targetThresholds.length - 1] || startY;
  const endY = Math.min(documentHeight - 56, last + Math.min(220, window.innerHeight * .28));

  const anchors = [{ x: clampX(width * .62), y: startY, id: 'start' }];
  targets.forEach((target, index) => {
    anchors.push({
      x: clampX(width * rails[index % rails.length]),
      y: targetThresholds[index],
      id: target.classList.contains('journeys') ? 'journeys' : `t${index}`,
    });
  });
  anchors.push({ x: clampX(width * .55), y: endY, id: 'end' });

  if (!activeCountry) activeCountry = pickCountry();
  mountCountry();

  // Dock the ribbon at the map entry — near the left journeys copy.
  const copy = document.querySelector('.journey-copy');
  if (copy) {
    const cr = copy.getBoundingClientRect();
    mapEntry = {
      x: clampX(cr.left + cr.width * 0.55),
      y: journeyHoldY - Math.min(cr.height * 0.12, 40),
    };
  } else {
    mapEntry = { x: clampX(width * .22), y: journeyHoldY };
  }

  let d = `M ${anchors[0].x.toFixed(1)} ${anchors[0].y.toFixed(1)}`;
  let prev = anchors[0];
  dockLength = 0;

  for (let i = 1; i < anchors.length; i += 1) {
    const curr = anchors[i];
    const span = curr.y - prev.y;
    const side = i % 2 === 0 ? 1 : -1;

    if (curr.id === 'journeys') {
      const mid = {
        x: clampX((prev.x + mapEntry.x) * 0.5 + side * Math.min(width * .06, 50)),
        y: prev.y + (mapEntry.y - prev.y) * 0.55,
      };
      d = appendCurve(d, prev, mid);
      d = appendCurve(d, mid, mapEntry);
      prev = mapEntry;
      dockLength = measure(path, d);

      const exit = {
        x: clampX(mapEntry.x + Math.min(width * .08, 70)),
        y: journeyHoldY + Math.min(window.innerHeight * .22, 160),
      };
      d = appendCurve(d, prev, exit);
      prev = exit;
      continue;
    }

    if (span > 200) {
      const e1 = {
        x: clampX(((prev.x + curr.x) / 2) + side * Math.min(width * .06, 56)),
        y: prev.y + span * 0.4,
      };
      const e2 = {
        x: clampX(((prev.x + curr.x) / 2) - side * Math.min(width * .04, 40)),
        y: prev.y + span * 0.72,
      };
      d = appendCurve(d, prev, e1);
      d = appendCurve(d, e1, e2);
      d = appendCurve(d, e2, curr);
      prev = curr;
      continue;
    }

    d = appendCurve(d, prev, curr);
    prev = curr;
  }

  svg.setAttribute('viewBox', `0 0 ${width} ${documentHeight}`);
  stream.style.height = `${documentHeight}px`;
  svg.style.height = `${documentHeight}px`;

  [glow, path].forEach((el) => el.setAttribute('d', d));
  length = path.getTotalLength() || 1;
  path.style.strokeDasharray = `${length}`;
  glow.style.strokeDasharray = `${length}`;

  stream.dataset.country = activeCountry.id;
  stream.dataset.dock = String(Math.round(dockLength));
  stream.dataset.journeyTop = String(Math.round(journeyTop));
  stream.dataset.journeyTravel = String(Math.round(journeyTravel));

  clearPin();
  render();
}

function lengthAtY(y) {
  let low = 0;
  let high = length;
  for (let i = 0; i < 15; i += 1) {
    const middle = (low + high) * .5;
    if (path.getPointAtLength(middle).y < y) low = middle;
    else high = middle;
  }
  return (low + high) * .5;
}

function paintY() {
  const origin = pageLift ? pageLift.getBoundingClientRect().top + window.scrollY : 0;
  const raw = window.scrollY + window.innerHeight * .56 - origin;
  const cap = path.getPointAtLength(length).y;
  if (!journeyScroll || journeysIndex < 0) return Math.max(startY, Math.min(cap, raw));
  if (window.scrollY < journeyTop) return Math.max(startY, Math.min(cap, raw));
  if (window.scrollY < journeyTop + journeyTravel) return journeyHoldY;
  return Math.max(startY, Math.min(cap, raw));
}

function applyMainStroke(drawnLength) {
  const safe = Math.max(0, Math.min(length, drawnLength));
  path.style.strokeDashoffset = `${length - safe}`;
  glow.style.strokeDashoffset = `${length - safe}`;
  return safe;
}

function placeOrb(x, y, visible = true) {
  orb.setAttribute('cx', x.toFixed(2));
  orb.setAttribute('cy', y.toFixed(2));
  orb.style.opacity = visible ? '1' : '0';
}

function clearPin() {
  pinActive = false;
  stream.classList.remove('is-pinned');
  stream.style.zIndex = '';
  stream.style.height = `${documentHeight}px`;
  shift.style.transform = '';
  glow.style.opacity = '';
  path.style.opacity = '';
  particles.style.opacity = '';
  if (journeyMap) {
    journeyMap.classList.remove('is-drawing', 'is-complete');
    if (journeyMapStroke) journeyMapStroke.style.strokeDashoffset = `${mapLength}`;
  }
}

function syncPinShift() {
  const liftTop = pageLift ? pageLift.getBoundingClientRect().top : 0;
  const targetY = Math.min(window.innerHeight * 0.5, 400);
  const shiftY = targetY - liftTop - journeyHoldY;
  shift.style.transform = `translate3d(0, ${Math.round(shiftY)}px, 0)`;
}

function enterPin() {
  pinActive = true;
  stream.classList.add('is-pinned');
  // Keep the ribbon under the journeys copy — the local map owns this beat.
  stream.style.zIndex = '1';
  stream.style.height = `${documentHeight}px`;
  syncPinShift();
  glow.style.opacity = '0';
  path.style.opacity = '0.28';
  particles.style.opacity = '0';
  applyMainStroke(dockLength);
  const tip = path.getPointAtLength(Math.max(0.01, dockLength));
  placeOrb(tip.x, tip.y, true);
  journeyMap?.classList.add('is-drawing');
  targets.forEach((target, index) => {
    target.classList.toggle('line-touch', journeyHoldY >= targetThresholds[index] - 18);
  });
}

function drawMapProgress() {
  syncPinShift();
  applyMainStroke(dockLength);
  const tip = path.getPointAtLength(Math.max(0.01, dockLength));
  placeOrb(tip.x, tip.y, true);

  const scrub = journeyTravel > 0
    ? Math.min(1, Math.max(0, (window.scrollY - journeyTop) / journeyTravel))
    : 1;
  const mapT = Math.min(1, scrub / MAP_DRAW_WINDOW);
  const ease = mapT * mapT * (3 - 2 * mapT);
  const drawn = reducedMotion ? mapLength : mapLength * ease;

  if (journeyMapStroke) {
    journeyMapStroke.style.strokeDashoffset = `${mapLength - drawn}`;
  }

  const done = mapT >= 1;
  journeyMap?.classList.toggle('is-complete', done);
  dots.forEach((dot) => { dot.style.opacity = '0'; });
}

function render() {
  requested = false;
  const inPin = Boolean(
    journeyScroll
    && journeysIndex >= 0
    && window.scrollY >= journeyTop
    && window.scrollY < journeyTop + journeyTravel
  );

  if (inPin) {
    if (!pinActive) enterPin();
    stream.style.opacity = '1';
    drawMapProgress();
    return;
  }

  if (pinActive) {
    clearPin();
    activeCountry = pickCountry(activeCountry?.id);
    buildPath();
    return;
  }

  const y = paintY();
  let drawnLength = reducedMotion ? length : lengthAtY(y);

  if (journeyScroll && window.scrollY < journeyTop) {
    drawnLength = Math.min(drawnLength, dockLength);
  }
  if (journeyScroll && window.scrollY >= journeyTop + journeyTravel) {
    drawnLength = Math.max(drawnLength, dockLength);
  }

  const safe = applyMainStroke(drawnLength);
  const tip = path.getPointAtLength(safe);
  placeOrb(tip.x, tip.y, safe > 2);

  if (pageLift) {
    const bottom = pageLift.getBoundingClientRect().bottom;
    const fade = Math.min(1, Math.max(0, (bottom - window.innerHeight * 0.2) / (window.innerHeight * 0.45)));
    stream.style.opacity = String(fade);
  }

  dots.forEach((dot, index) => {
    const trail = Math.max(0, safe / length - (index + 1) * 0.014);
    const at = path.getPointAtLength(length * trail);
    dot.setAttribute('cx', at.x.toFixed(2));
    dot.setAttribute('cy', at.y.toFixed(2));
    dot.style.opacity = String(Math.max(0, 0.3 - index * 0.06) * (safe > 8 ? 1 : 0));
  });

  targets.forEach((target, index) => target.classList.toggle('line-touch', y >= targetThresholds[index] - 18));
}

function queueRender() {
  if (!requested) {
    requested = true;
    requestAnimationFrame(render);
  }
}

window.addEventListener('scroll', queueRender, { passive: true });
window.addEventListener('resize', buildPath, { passive: true });
window.addEventListener('load', buildPath, { once: true });
if (document.fonts?.ready) document.fonts.ready.then(buildPath);
buildPath();
