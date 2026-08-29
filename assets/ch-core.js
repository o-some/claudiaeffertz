(() => {
  const initialized = new WeakSet();

  function initialize(root = document) {
    root.querySelectorAll('[data-ch-navigation]').forEach((navigation) => {
      if (initialized.has(navigation)) return;
      initialized.add(navigation);
      const links = [...navigation.querySelectorAll('[data-ch-nav-link]')];
      const urls = links.map((link) => new URL(link.href, window.location.href));
      const targets = urls.map((url) => {
        return url.origin === window.location.origin && url.pathname === window.location.pathname && url.hash
          ? document.getElementById(decodeURIComponent(url.hash.slice(1)))
          : null;
      });
      const setActive = (activeIndex) => links.forEach((link, index) => {
        const activeTarget = targets[activeIndex];
        const activeUrl = urls[activeIndex];
        const active = activeIndex >= 0 && (activeTarget
          ? targets[index] === activeTarget
          : !targets[index] && urls[index].origin === activeUrl.origin && urls[index].pathname === activeUrl.pathname && urls[index].search === activeUrl.search);
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', targets[index] ? 'location' : 'page');
        else link.removeAttribute('aria-current');
      });
      const currentRoute = urls.findIndex((url, index) => !targets[index] && url.origin === window.location.origin && url.pathname === window.location.pathname);
      const currentAnchor = urls.findIndex((url, index) => targets[index] && url.hash === window.location.hash);
      if (currentAnchor >= 0) setActive(currentAnchor);
      else if (currentRoute >= 0) setActive(currentRoute);
      if (typeof window.IntersectionObserver === 'function') {
        const observer = new IntersectionObserver((entries) => {
          const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visible) setActive(targets.indexOf(visible.target));
        }, { rootMargin: '-20% 0px -55%', threshold: [0, .2, .5] });
        targets.filter(Boolean).forEach((target) => observer.observe(target));
      }
      links.forEach((link, index) => link.addEventListener('click', () => {
        if (targets[index]) setActive(index);
        link.closest('details')?.removeAttribute('open');
      }));
      navigation.querySelectorAll('[data-ch-mobile-nav]').forEach((menu) => {
        const summary = menu.querySelector('summary');
        const updateLabel = () => summary?.setAttribute('aria-label', menu.open ? summary.dataset.closeLabel : summary.dataset.openLabel);
        menu.addEventListener('toggle', updateLabel);
        updateLabel();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => initialize());
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
})();
