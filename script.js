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

  document.documentElement.classList.add('reveal-enabled');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach((item) => observer.observe(item));
})();
