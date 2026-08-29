(() => {
  const selector = '.mgu-contact';

  function init(root) {
    if (!root || root.dataset.contactMotionReady === 'true') return;
    root.dataset.contactMotionReady = 'true';

    root.querySelectorAll('[data-contact-stagger]').forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        child.style.setProperty('--contact-order', Math.min(index, 8));
      });
    });

    const targets = Array.from(root.querySelectorAll('[data-contact-reveal], [data-contact-stagger]'));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      root.classList.add('is-motion-ready');
      return;
    }

    targets.forEach((target) => {
      if (target.getBoundingClientRect().top < window.innerHeight * 0.9) target.classList.add('is-visible');
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
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
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
