import './style.css';
import './journey.css';
import './places.css';
import './story.css';
import './footer-reveal.js';

const observer = new IntersectionObserver((entries) => {
  entries.forEach(({ isIntersecting, target }) => { if (isIntersecting) target.classList.add('is-visible'); });
}, { threshold: 0.14 });
document.querySelectorAll('.reveal, .intro, .explore__copy, .trip-form, .quote__content, .places__head, .place-card, .hosts__head, .host, .stays__head, .stay, .faq__head, .week-copy').forEach(el => observer.observe(el));

/* Mobile nav */
const menuBtn = document.querySelector('.menu');
const navLinks = document.querySelector('#nav-links');
menuBtn?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('is-open');
  document.body.classList.toggle('nav-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? '✕' : '☰';
});
navLinks?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    menuBtn?.setAttribute('aria-expanded', 'false');
    if (menuBtn) menuBtn.textContent = '☰';
  });
});

const scrollScene = document.querySelector('.journey-scroll');
const track = document.querySelector('.card-track');
const cards = [...document.querySelectorAll('.journey-stage .trip-card')];
const journeyCurrent = document.querySelector('.journey-current');
let journeyProgress = 0;
let requestedProgress = 0;
let trackDistance = 0;
let journeyFrame = null;

function renderJourney() {
  journeyFrame = null;
  journeyProgress = requestedProgress;
  if (window.innerWidth < 701) return;
  track.style.transform = `translate3d(${-journeyProgress * trackDistance}px,0,0)`;
  scrollScene.style.setProperty('--journey-progress', journeyProgress.toFixed(4));
  cards.forEach((card, index) => {
    const center = index / (cards.length - 1 || 1);
    const closeness = Math.max(0, 1 - Math.abs(journeyProgress - center) * 2.6);
    const direction = journeyProgress < center ? 1 : -1;
    card.style.setProperty('--card-y', `${(1 - closeness) * 48}px`);
    card.style.setProperty('--card-scale', (.78 + closeness * .22).toFixed(3));
    card.style.setProperty('--card-opacity', (.2 + closeness * .8).toFixed(3));
    card.style.setProperty('--image-y', `${direction * (1 - closeness) * 10}px`);
    card.style.setProperty('--image-scale', (1.04 + closeness * .06).toFixed(3));
    card.classList.toggle('is-active', closeness > .52);
  });
  journeyCurrent.textContent = String(Math.min(cards.length, Math.floor(journeyProgress * cards.length) + 1)).padStart(2, '0');
}

function measureJourney() {
  if (window.innerWidth < 701) return;
  trackDistance = Math.max(0, track.scrollWidth - track.parentElement.clientWidth + 76);
}
function updateJourney() {
  const rect = scrollScene.getBoundingClientRect();
  const travel = scrollScene.offsetHeight - window.innerHeight;
  requestedProgress = Math.max(0, Math.min(1, -rect.top / travel));
  if (!journeyFrame) journeyFrame = requestAnimationFrame(renderJourney);
}
window.addEventListener('scroll', updateJourney, { passive: true });
window.addEventListener('resize', () => { measureJourney(); updateJourney(); });
measureJourney();
updateJourney();
function scrollToJourney(progress) {
  const sceneTop = scrollScene.getBoundingClientRect().top + window.scrollY;
  const travel = scrollScene.offsetHeight - window.innerHeight;
  window.scrollTo({ top: sceneTop + Math.max(0, Math.min(1, progress)) * travel, behavior: 'smooth' });
}
document.querySelector('.slider-next')?.addEventListener('click', () => scrollToJourney((Math.floor(journeyProgress * (cards.length - 1)) + 1) / (cards.length - 1)));
document.querySelector('.slider-prev')?.addEventListener('click', () => scrollToJourney((Math.ceil(journeyProgress * (cards.length - 1)) - 1) / (cards.length - 1)));

const tripForm = document.querySelector('#trip-form');
tripForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const button = tripForm.querySelector('button[type="submit"]');
  const ok = tripForm.querySelector('.trip-form__ok');
  button.disabled = true;
  button.innerHTML = 'Sending <span>…</span>';
  setTimeout(() => {
    button.innerHTML = 'Request sent <span>✓</span>';
    if (ok) ok.hidden = false;
    tripForm.reset();
  }, 500);
});

const placesForm = document.querySelector('#places-filters');
const placeCards = [...document.querySelectorAll('.place-card')];
const filterButtons = [...document.querySelectorAll('#places-filters [data-filter]')];
let activePlaceFilter = 'all';

function applyPlaceFilter() {
  const budget = placesForm?.budget?.value || 'any';
  placeCards.forEach((card) => {
    const typeOk = activePlaceFilter === 'all' || card.dataset.type === activePlaceFilter;
    const budgetOk = budget === 'any' || card.dataset.budget === budget;
    const show = typeOk && budgetOk;
    card.style.display = show ? '' : 'none';
    if (show) card.classList.add('is-visible');
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activePlaceFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle('is-on', item === button));
    applyPlaceFilter();
  });
});

placesForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  applyPlaceFilter();
  placesForm.querySelector('.places-go').innerHTML = 'Routes ready <span>✓</span>';
});
placesForm?.budget?.addEventListener('change', applyPlaceFilter);

/* A week with Roam — pin until every day has been scrubbed */
const weekScroll = document.querySelector('.week-scroll');
const weekDays = [...document.querySelectorAll('.week-day')];
const weekImages = [...document.querySelectorAll('.week-visual img')];
const weekLabel = document.querySelector('.week-visual__label');
const weekLabels = [
  'Day 01 · Arrive soft',
  'Day 02–03 · Wander wide',
  'Day 04 · Feast slowly',
  'Day 05 · Unplug deep',
  'Day 06–07 · Leave altered',
];
let weekIndex = 0;
let weekFrame = null;
const weekSteps = Math.max(1, weekDays.length - 1);

function setWeekDay(index, progress = null) {
  weekIndex = Math.max(0, Math.min(weekDays.length - 1, index));
  weekDays.forEach((day, i) => day.classList.toggle('is-on', i === weekIndex));
  weekImages.forEach((image, i) => image.classList.toggle('is-on', i === weekIndex));
  if (weekLabel) weekLabel.textContent = weekLabels[weekIndex];
  const line = progress == null ? (weekIndex + .2) / weekDays.length : Math.max(.08, Math.min(1, progress));
  weekScroll?.style.setProperty('--week-progress', line.toFixed(3));
}

function updateWeek() {
  weekFrame = null;
  if (!weekScroll || window.innerWidth < 901) return;
  const rect = weekScroll.getBoundingClientRect();
  const travel = Math.max(1, weekScroll.offsetHeight - window.innerHeight);
  const progress = Math.max(0, Math.min(1, -rect.top / travel));
  const index = Math.min(weekSteps, Math.floor(progress * weekDays.length));
  setWeekDay(index, (index + .35) / weekDays.length);
}

window.addEventListener('scroll', () => {
  if (!weekFrame) weekFrame = requestAnimationFrame(updateWeek);
}, { passive: true });
window.addEventListener('resize', updateWeek, { passive: true });

weekDays.forEach((day) => {
  day.addEventListener('click', () => {
    const index = Number(day.dataset.day);
    if (window.innerWidth < 901 || !weekScroll) {
      setWeekDay(index);
      return;
    }
    const top = weekScroll.getBoundingClientRect().top + window.scrollY;
    const travel = weekScroll.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((index + .5) / weekDays.length) * travel, behavior: 'smooth' });
  });
});
updateWeek();

document.querySelectorAll('.faq-item button').forEach((button) => {
  button.addEventListener('click', () => {
    const item = button.closest('.faq-item');
    const open = item.classList.contains('is-open');
    document.querySelectorAll('.faq-item').forEach((node) => {
      node.classList.remove('is-open');
      node.querySelector('button')?.setAttribute('aria-expanded', 'false');
    });
    if (!open) {
      item.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
    }
  });
});
