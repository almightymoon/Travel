import './style.css';
import './pages.css';
import './footer-reveal.js';

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

const observer = new IntersectionObserver((entries) => {
  entries.forEach(({ isIntersecting, target }) => { if (isIntersecting) target.classList.add('is-visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal, .journey-row, .host-page-card, .stay-feature, .stay-tile, .story-card, .trip-form, .explore__copy').forEach((el) => observer.observe(el));

const params = new URLSearchParams(window.location.search);
const tripForm = document.querySelector('#trip-form');
if (tripForm) {
  const where = tripForm.querySelector('[name="where"]');
  const preset = params.get('route');
  if (where && preset) {
    const match = [...where.options].find((opt) => opt.value.toLowerCase() === preset.toLowerCase() || opt.text.toLowerCase() === preset.toLowerCase());
    if (match) where.value = match.value || match.text;
  }
  tripForm.addEventListener('submit', (e) => {
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
}
