(() => {
  const root = document.querySelector('[data-ce-home]');
  if (!root) return;

  root.classList.add('ce-enhanced');
  const revealItems = [...root.querySelectorAll('[data-ce-reveal]')];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach((item) => observer.observe(item));
  }

  const form = root.querySelector('#CeContactForm');
  const submit = form?.querySelector('[data-ce-submit]');
  form?.addEventListener('submit', () => {
    if (!submit) return;
    submit.disabled = true;
    submit.textContent = 'Wird gesendet ...';
  }, { once: true });
})();
