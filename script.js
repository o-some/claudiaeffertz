(() => {
  const menuButton = document.querySelector('[data-menu-button]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');

  const closeMenu = () => {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.textContent = 'Menü';
    mobileMenu.hidden = true;
    document.body.classList.remove('menu-open');
  };

  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    if (open) return closeMenu();
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.textContent = 'Schließen';
    mobileMenu.hidden = false;
    document.body.classList.add('menu-open');
    mobileMenu.querySelector('a')?.focus();
  });

  mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || mobileMenu?.hidden) return;
    closeMenu();
    menuButton?.focus();
  });

  document.querySelectorAll('[data-year]').forEach((item) => {
    item.textContent = new Date().getFullYear();
  });

  const items = [...document.querySelectorAll('[data-reveal]')];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  const animateCounter = (element) => {
    if (element.dataset.counted) return;
    element.dataset.counted = 'true';
    const from = Number(element.dataset.countFrom);
    const to = Number(element.dataset.countTo);
    const suffix = element.dataset.countSuffix || '';
    const duration = Math.min(1600, 900 + Math.abs(to - from) * 8);
    const started = performance.now();
    let previous;
    element.classList.add('is-counting');

    const update = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const next = Math.round(from + (to - from) * eased);
      if (next !== previous) element.textContent = `${next}${suffix}`;
      previous = next;
      if (progress < 1) return requestAnimationFrame(update);
      element.textContent = `${to}${suffix}`;
      element.classList.remove('is-counting');
    };

    requestAnimationFrame(update);
  };

  document.documentElement.classList.add('reveal-enabled');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      entry.target.querySelectorAll('[data-count-to]').forEach(animateCounter);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach((item) => observer.observe(item));
})();
