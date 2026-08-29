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

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsObserver = 'IntersectionObserver' in window;
  const counters = [...document.querySelectorAll('[data-count-to]')];

  const animateCounter = (element) => {
    if (element.dataset.counted) return;
    element.dataset.counted = 'true';
    const from = Number(element.dataset.countFrom);
    const to = Number(element.dataset.countTo);
    const suffix = element.dataset.countSuffix || '';
    const duration = reduceMotion ? 900 : Math.min(3200, 1800 + Math.abs(to - from) * 16);
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

  counters.forEach((element) => {
    element.textContent = `${element.dataset.countFrom}${element.dataset.countSuffix || ''}`;
  });

  if (supportsObserver) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.35 });

    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach(animateCounter);
  }

  if (reduceMotion || !supportsObserver) return;

  const items = [...document.querySelectorAll('[data-reveal]')];
  document.documentElement.classList.add('reveal-enabled');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -3% 0px', threshold: 0.04 });

  items.forEach((item) => observer.observe(item));
})();
