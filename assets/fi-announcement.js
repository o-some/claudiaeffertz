if (!customElements.get('fi-announcement')) {
  customElements.define('fi-announcement', class extends HTMLElement {
    connectedCallback() {
      if (this.dataset.initialized === 'true') return;
      this.dataset.initialized = 'true';

      this.slides = Array.from(this.querySelectorAll('[data-announcement-slide]'));
      this.index = Math.max(0, this.slides.findIndex((slide) => slide.classList.contains('is-active')));
      this.intervalMs = Math.max(3000, Number(this.dataset.interval) || 6000);
      this.isEditor = Boolean(window.Shopify && Shopify.designMode);
      this.storageKey = `fi-announcement-closed-${this.dataset.sectionId || 'default'}`;

      if (!this.isEditor && this.dataset.rememberClose === 'true') {
        try {
          if (window.localStorage.getItem(this.storageKey) === 'true') {
            this.hideAnnouncement(false);
            return;
          }
        } catch (_) {}
      }

      this.prevButton = this.querySelector('[data-announcement-prev]');
      this.nextButton = this.querySelector('[data-announcement-next]');
      this.closeButton = this.querySelector('[data-announcement-close]');

      this.onPrev = () => this.show(this.index - 1, true);
      this.onNext = () => this.show(this.index + 1, true);
      this.onClose = () => this.hideAnnouncement(true);
      this.onMouseEnter = () => this.stop();
      this.onMouseLeave = () => this.start();
      this.onFocusIn = () => this.stop();
      this.onFocusOut = () => this.start();

      this.prevButton?.addEventListener('click', this.onPrev);
      this.nextButton?.addEventListener('click', this.onNext);
      this.closeButton?.addEventListener('click', this.onClose);
      this.addEventListener('mouseenter', this.onMouseEnter);
      this.addEventListener('mouseleave', this.onMouseLeave);
      this.addEventListener('focusin', this.onFocusIn);
      this.addEventListener('focusout', this.onFocusOut);

      this.resizeObserver = new ResizeObserver(() => this.updateHeight());
      this.resizeObserver.observe(this);
      this.updateHeight();
      this.start();
    }

    disconnectedCallback() {
      this.stop();
      this.resizeObserver?.disconnect();
      this.prevButton?.removeEventListener('click', this.onPrev);
      this.nextButton?.removeEventListener('click', this.onNext);
      this.closeButton?.removeEventListener('click', this.onClose);
      this.removeEventListener('mouseenter', this.onMouseEnter);
      this.removeEventListener('mouseleave', this.onMouseLeave);
      this.removeEventListener('focusin', this.onFocusIn);
      this.removeEventListener('focusout', this.onFocusOut);
      this.updateHeight(0);
    }

    show(nextIndex, userInitiated = false) {
      if (this.slides.length < 2) return;
      const normalized = (nextIndex + this.slides.length) % this.slides.length;
      this.slides.forEach((slide, position) => {
        const active = position === normalized;
        slide.hidden = !active;
        slide.classList.toggle('is-active', active);
      });
      this.index = normalized;
      if (userInitiated) {
        this.stop();
        this.start();
      }
      this.updateHeight();
    }

    start() {
      this.stop();
      if (this.dataset.autoplay !== 'true' || this.slides.length < 2) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.timer = window.setInterval(() => this.show(this.index + 1), this.intervalMs);
    }

    stop() {
      if (this.timer) window.clearInterval(this.timer);
      this.timer = null;
    }

    hideAnnouncement(persist) {
      this.stop();
      this.hidden = true;
      this.setAttribute('aria-hidden', 'true');
      if (persist && this.dataset.rememberClose === 'true' && !this.isEditor) {
        try { window.localStorage.setItem(this.storageKey, 'true'); } catch (_) {}
      }
      this.updateHeight(0);
    }

    updateHeight(forcedHeight) {
      const height = typeof forcedHeight === 'number' ? forcedHeight : (this.hidden ? 0 : this.getBoundingClientRect().height);
      const page = this.closest('.fi-page');
      if (page) page.style.setProperty('--fi-announcement-height', `${Math.round(height)}px`);
    }
  });
}
