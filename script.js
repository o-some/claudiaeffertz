(() => {
  const themeButtons = [...document.querySelectorAll('[data-theme-toggle]')];
  const themeQuery = matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => document.documentElement.dataset.theme || (themeQuery.matches ? 'dark' : 'light');
  const syncTheme = () => {
    const dark = currentTheme() === 'dark';
    themeButtons.forEach((button) => {
      const label = dark ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', label);
      button.title = label;
      button.querySelector('[data-theme-sun]').hidden = !dark;
      button.querySelector('[data-theme-moon]').hidden = dark;
    });
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#112833' : '#f4eee1');
  };

  themeButtons.forEach((button) => button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ce-theme', next); } catch {}
    syncTheme();
  }));
  themeQuery.addEventListener?.('change', () => {
    if (!document.documentElement.dataset.theme) syncTheme();
  });
  syncTheme();

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

  const header = document.querySelector('[data-header]');
  if (header) {
    let headerFrame;
    const updateHeader = () => {
      const scrollTop = window.scrollY;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      header.classList.toggle('is-scrolled', scrollTop > 24);
      header.style.setProperty('--page-progress', String(Math.min(1, scrollTop / scrollRange)));
      headerFrame = undefined;
    };
    const requestHeaderUpdate = () => {
      if (headerFrame) return;
      headerFrame = requestAnimationFrame(updateHeader);
    };
    addEventListener('scroll', requestHeaderUpdate, { passive: true });
    addEventListener('resize', requestHeaderUpdate);
    updateHeader();
  }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsObserver = 'IntersectionObserver' in window;
  const counters = [...document.querySelectorAll('[data-count-to]')];

  const connection = document.querySelector('[data-living-connection]');
  const hero = document.querySelector('.hero');
  if (connection && hero && !reduceMotion) {
    const lines = [...connection.querySelectorAll('.hero__connection-line')];
    const pulse = connection.querySelector('.hero__connection-pulse');
    let connectionFrame;

    const updateConnection = () => {
      const heroRect = hero.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -heroRect.top / Math.max(1, heroRect.height * .72)));
      const shifts = [-18, 14, -10];
      const baseOpacity = [.28, .7, .43];

      lines.forEach((line, index) => {
        const x = progress * shifts[index];
        const y = progress * (10 + index * 3);
        line.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        line.style.opacity = String(baseOpacity[index] * (1 - progress * .42));
      });
      if (pulse) pulse.style.transform = `translate3d(${progress * shifts[1]}px, ${progress * 13}px, 0)`;
      connection.style.opacity = String(1 - progress * .28);
      connectionFrame = undefined;
    };

    const requestConnectionUpdate = () => {
      if (connectionFrame) return;
      connectionFrame = requestAnimationFrame(updateConnection);
    };

    addEventListener('scroll', requestConnectionUpdate, { passive: true });
    addEventListener('resize', requestConnectionUpdate);
    requestConnectionUpdate();
  }

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
    if (reduceMotion) {
      element.textContent = `${element.dataset.countTo}${element.dataset.countSuffix || ''}`;
      element.dataset.counted = 'true';
      return;
    }
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
