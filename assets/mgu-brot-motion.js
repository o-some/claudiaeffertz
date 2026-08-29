(() => {
  const selector = '.mgu-brot';

  function revealImmediately(root) {
    root.querySelectorAll('[data-mgb-reveal], [data-mgb-stagger]').forEach((element) => {
      element.classList.add('is-visible');
    });
  }

  function prepareStaggers(root) {
    root.querySelectorAll('[data-mgb-stagger]').forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        child.style.setProperty('--mgb-order', Math.min(index, 8));
      });
    });
  }

  function init(root) {
    if (!root || root.dataset.mgbMotionInitialized === 'true') return;

    root.dataset.mgbMotionInitialized = 'true';
    prepareStaggers(root);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      root.classList.add('is-motion-ready');
      revealImmediately(root);
      return;
    }

    const targets = Array.from(root.querySelectorAll('[data-mgb-reveal], [data-mgb-stagger]'));
    targets.forEach((target) => {
      if (target.getBoundingClientRect().top < window.innerHeight * 0.9) {
        target.classList.add('is-visible');
      }
    });

    root.classList.add('is-motion-ready');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    targets.forEach((target) => {
      if (!target.classList.contains('is-visible')) observer.observe(target);
    });
  }

  function initAll(scope = document) {
    if (scope.matches?.(selector)) init(scope);
    scope.querySelectorAll?.(selector).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => initAll(event.target));
})();
