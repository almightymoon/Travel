const NS = 'http://www.w3.org/2000/svg';
const hero = document.querySelector('.hero');
const pageLift = document.querySelector('.page-lift');
const targets = [...document.querySelectorAll('.intro, .journeys, .places, .week, .hosts, .stays, .faq, .explore, .quote')];
const journeyScroll = document.querySelector('.journey-scroll');
const journeysSection = document.querySelector('.journeys');
const journeysIndex = targets.indexOf(journeysSection);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        <filter id="energy-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path class="energy-stream__ghost" />
      <path class="energy-stream__glow" />
      <path class="energy-stream__path" />
      <g class="energy-stream__particles"></g>
      <circle class="energy-stream__orb" r="4.5" />
    </svg>
  </div>`;
// Keep the line inside the content panel so it never paints over the footer reveal.
(pageLift || document.body).append(stream);

const shift = stream.querySelector('.energy-stream__shift');
const svg = stream.querySelector('svg');
const ghost = stream.querySelector('.energy-stream__ghost');
const glow = stream.querySelector('.energy-stream__glow');
const path = stream.querySelector('.energy-stream__path');
const orb = stream.querySelector('.energy-stream__orb');
const particles = stream.querySelector('.energy-stream__particles');
const dots = Array.from({ length: 5 }, () => {
  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('r', '2');
  particles.append(dot);
  return dot;
});

let length = 1;
let documentHeight = 1;
let targetThresholds = [];
let requested = false;
let startY = 0;
let journeyTop = 0;
let journeyTravel = 0;
let journeyHoldY = 0;
let pinActive = false;
let pinDrawnLength = 0;

function pageHeight() {
  // Stop at the content panel — never include the footer runway.
  if (pageLift) return Math.max(1, Math.ceil(pageLift.offsetHeight));
  return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
}

function anchorYFor(target) {
  const origin = pageLift ? pageLift.getBoundingClientRect().top + window.scrollY : 0;
  // Pin to the sticky viewport's resting place — never sticky's live rect while pinned
  // (that would push the waypoint deep into the 620vh scroll shell).
  if (target.classList.contains('journeys')) {
    const scene = target.querySelector('.journey-scroll') || target;
    const sticky = target.querySelector('.journey-sticky') || target;
    const base = scene.getBoundingClientRect().top + window.scrollY - origin;
    return base + Math.min(sticky.offsetHeight * .48, window.innerHeight * .5);
  }
  const rect = target.getBoundingClientRect();
  return rect.top + window.scrollY - origin + Math.min(rect.height * .48, window.innerHeight * .5);
}

function buildPath() {
  const width = window.innerWidth;
  documentHeight = pageHeight();
  const origin = pageLift ? pageLift.getBoundingClientRect().top + window.scrollY : 0;
  const heroBottom = hero.getBoundingClientRect().bottom + window.scrollY - origin;
  startY = heroBottom + Math.max(34, window.innerHeight * .045);
  const points = [{ x: width * .68, y: startY }];
  const rails = [.27, .76, .34, .28, .64, .38, .72, .22, .68];

  if (journeyScroll) {
    journeyTop = journeyScroll.getBoundingClientRect().top + window.scrollY;
    journeyTravel = Math.max(0, journeyScroll.offsetHeight - window.innerHeight);
  }

  targetThresholds = targets.map((target, index) => {
    const y = anchorYFor(target);
    points.push({ x: width * rails[index], y });
    return y;
  });
  journeyHoldY = journeysIndex >= 0 ? targetThresholds[journeysIndex] : startY;
  // End gently inside the last section — never spill into the footer.
  const last = targetThresholds[targetThresholds.length - 1] || startY;
  const endY = Math.min(documentHeight - 56, last + Math.min(220, window.innerHeight * .28));
  points.push({ x: width * .56, y: endY });

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const point = points[i];
    const bend = (point.y - previous.y) * .46;
    d += ` C ${previous.x} ${previous.y + bend}, ${point.x} ${point.y - bend}, ${point.x} ${point.y}`;
  }
  svg.setAttribute('viewBox', `0 0 ${width} ${documentHeight}`);
  stream.style.height = `${documentHeight}px`;
  svg.style.height = `${documentHeight}px`;
  [ghost, glow, path].forEach(item => item.setAttribute('d', d));
  length = path.getTotalLength() || 1;
  path.style.strokeDasharray = `${length}`;
  glow.style.strokeDasharray = `${length}`;
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

/** Hold the line tip while the sticky horizontal gallery is scrubbing. */
function paintY() {
  const origin = pageLift ? pageLift.getBoundingClientRect().top + window.scrollY : 0;
  const raw = window.scrollY + window.innerHeight * .56 - origin;
  const cap = path.getPointAtLength(length).y;
  if (!journeyScroll || journeysIndex < 0) {
    return Math.max(startY, Math.min(cap, raw));
  }
  if (window.scrollY < journeyTop) {
    return Math.max(startY, Math.min(cap, raw));
  }
  if (window.scrollY < journeyTop + journeyTravel) {
    // Stay locked on the journeys waypoint for the whole horizontal scrub.
    return journeyHoldY;
  }
  // Catch up to real scroll once the sticky gallery releases.
  return Math.max(startY, Math.min(cap, raw));
}

function applyStroke(drawnLength) {
  const drawn = drawnLength / length;
  const dash = length - drawnLength;
  path.style.strokeDashoffset = `${dash}`;
  glow.style.strokeDashoffset = `${dash}`;
  const point = path.getPointAtLength(drawnLength);
  orb.setAttribute('cx', point.x.toFixed(2));
  orb.setAttribute('cy', point.y.toFixed(2));
  orb.style.opacity = drawn > .01 ? '1' : '0';
  return drawn;
}

function clearPin() {
  pinActive = false;
  stream.classList.remove('is-pinned');
  stream.style.position = '';
  stream.style.top = '';
  stream.style.left = '';
  stream.style.right = '';
  stream.style.width = '';
  stream.style.height = `${documentHeight}px`;
  shift.style.transform = '';
  glow.style.opacity = '';
  particles.style.opacity = '';
}

function enterPin() {
  pinActive = true;
  stream.classList.add('is-pinned');
  // Freeze to the viewport once — no per-scroll transform updates (kills wobble).
  stream.style.position = 'fixed';
  stream.style.top = '0';
  stream.style.left = '0';
  stream.style.right = '0';
  stream.style.width = '100%';
  stream.style.height = '100vh';
  shift.style.transform = `translate3d(0, ${-Math.round(journeyTop)}px, 0)`;
  glow.style.opacity = '0.14';
  particles.style.opacity = '0';

  pinDrawnLength = reducedMotion ? length : lengthAtY(journeyHoldY);
  const drawn = applyStroke(pinDrawnLength);
  dots.forEach((dot, index) => {
    const trail = Math.max(0, drawn - (index + 1) * .016);
    const at = path.getPointAtLength(length * trail);
    dot.setAttribute('cx', at.x.toFixed(2));
    dot.setAttribute('cy', at.y.toFixed(2));
    dot.style.opacity = '0';
  });
  targets.forEach((target, index) => {
    target.classList.toggle('line-touch', journeyHoldY >= targetThresholds[index] - 18);
  });
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
    return;
  }

  if (pinActive) clearPin();

  const y = paintY();
  const drawnLength = reducedMotion ? length : lengthAtY(y);
  const drawn = applyStroke(drawnLength);

  // Soft-out as the content panel leaves for the footer reveal.
  if (pageLift) {
    const bottom = pageLift.getBoundingClientRect().bottom;
    const fade = Math.min(1, Math.max(0, (bottom - window.innerHeight * 0.2) / (window.innerHeight * 0.45)));
    stream.style.opacity = String(fade);
  }

  dots.forEach((dot, index) => {
    const trail = Math.max(0, drawn - (index + 1) * .016);
    const at = path.getPointAtLength(length * trail);
    dot.setAttribute('cx', (at.x + Math.sin((window.scrollY * .008) + index) * (5 + index * 2)).toFixed(2));
    dot.setAttribute('cy', (at.y + Math.cos((window.scrollY * .008) + index) * (5 + index * 2)).toFixed(2));
    dot.style.opacity = String(Math.max(0, .36 - index * .055) * (drawn > .03 ? 1 : 0));
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
