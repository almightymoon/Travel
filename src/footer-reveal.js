/** Lusion-style pull: page panel lifts away to uncover a fixed footer. */
const lift = document.querySelector('.page-lift');
const footer = document.querySelector('.site-footer');

if (!lift || !footer) {
  /* nothing */
} else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  footer.classList.remove('is-reveal');
  footer.classList.add('is-static');
  document.querySelector('.footer-runway')?.remove();
} else {
  footer.classList.add('is-reveal');
  footer.classList.remove('is-static');

  let runway = document.querySelector('.footer-runway');
  if (!runway) {
    runway = document.createElement('div');
    runway.className = 'footer-runway';
    runway.setAttribute('aria-hidden', 'true');
    footer.before(runway);
  }

  let footerHeight = 0;
  let ticking = false;

  function measure() {
    footerHeight = Math.max(Math.ceil(footer.offsetHeight), Math.round(window.innerHeight * 0.42));
    document.documentElement.style.setProperty('--footer-h', `${footerHeight}px`);
    runway.style.height = `${footerHeight}px`;
  }

  function progress() {
    // Drive from layout, not scrollY — works across scroll roots.
    const top = runway.getBoundingClientRect().top;
    const raw = footerHeight > 0 ? (window.innerHeight - top) / footerHeight : 0;
    return Math.min(1, Math.max(0, raw));
  }

  function paint() {
    const p = progress();
    const ease = 1 - (1 - p) ** 2.4;

    lift.style.transform = `translate3d(0, ${(-48 * ease).toFixed(2)}px, 0) scale(${(1 - 0.04 * ease).toFixed(4)})`;
    lift.style.setProperty('--lift-radius', `${(64 * ease).toFixed(1)}px`);
    lift.style.setProperty('--lift-shade', ease.toFixed(3));
    footer.style.setProperty('--footer-pull', ease.toFixed(3));
    footer.classList.toggle('is-in', p > 0.02);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      paint();
      ticking = false;
    });
  }

  measure();
  paint();
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('resize', () => {
    measure();
    paint();
  });

  const io = new IntersectionObserver(() => onScroll(), {
    threshold: Array.from({ length: 21 }, (_, i) => i / 20),
  });
  io.observe(runway);
  io.observe(lift);

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      measure();
      paint();
    });
  }
  requestAnimationFrame(() => {
    measure();
    paint();
  });
}
