if (!customElements.get('ch-sticky-atc')) {
  customElements.define('ch-sticky-atc', class ChStickyAtc extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.mainButton = document.querySelector('product-info .product-form__submit');
      this.submit = this.querySelector('[data-ch-sticky-submit]');
      this.price = this.querySelector('[data-ch-sticky-price]');
      this.label = this.querySelector('[data-ch-sticky-label]');
      this.status = this.querySelector('[data-ch-sticky-status]');
      if (!this.mainButton || !this.submit) return;
      this.submit.addEventListener('click', () => this.mainButton.click());
      this.querySelector('[data-ch-sticky-share]')?.addEventListener('click', (event) => this.share(event.currentTarget));
      this.observeMainButton();
      this.variantUnsubscriber = typeof subscribe === 'function' && window.PUB_SUB_EVENTS?.variantChange
        ? subscribe(PUB_SUB_EVENTS.variantChange, (event) => this.updateVariant(event.data))
        : null;
      this.updateOffset();
      this.resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.updateOffset()) : null;
      document.querySelectorAll('[data-ch-consent-banner], .shopify-pc__banner__dialog').forEach((element) => this.resizeObserver?.observe(element));
      this.mutationObserver = new MutationObserver(() => {
        document.querySelectorAll('[data-ch-consent-banner], .shopify-pc__banner__dialog').forEach((element) => this.resizeObserver?.observe(element));
        this.updateOffset();
      });
      this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    disconnectedCallback() { this.observer?.disconnect(); this.resizeObserver?.disconnect(); this.mutationObserver?.disconnect(); this.variantUnsubscriber?.(); window.removeEventListener('scroll', this.scrollHandler); }

    observeMainButton() {
      const update = () => {
        const rect = this.mainButton.getBoundingClientRect();
        this.hidden = !(rect.bottom < 0);
      };
      if (typeof IntersectionObserver === 'function') {
        this.observer = new IntersectionObserver(update, { threshold: [0, 1] });
        this.observer.observe(this.mainButton);
      }
      this.scrollHandler = update;
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
      update();
    }

    updateVariant({ html, variant, sectionId } = {}) {
      const sourcePrice = html?.querySelector(`#price-${sectionId}`)?.textContent?.trim();
      if (sourcePrice) this.price.textContent = sourcePrice;
      const available = Boolean(variant?.available);
      this.submit.disabled = !available;
      this.label.textContent = available ? window.variantStrings?.addToCart || this.label.textContent : window.variantStrings?.soldOut || 'Sold out';
      this.status.textContent = available ? '' : this.label.textContent;
    }

    updateOffset() {
      const banner = [...document.querySelectorAll('[data-ch-consent-banner], .shopify-pc__banner__dialog')].find((element) => element.getClientRects().length);
      this.style.setProperty('--ch-sticky-offset', banner ? `${banner.getBoundingClientRect().height}px` : '0px');
    }

    async share(button) {
      const url = new URL(button.dataset.shareUrl || window.location.href, window.location.origin).href;
      try {
        if (navigator.share) await navigator.share({ title: document.title, url });
        else await navigator.clipboard.writeText(url);
        this.status.textContent = this.dataset.shareSuccess;
      } catch (error) {
        if (error?.name !== 'AbortError') this.status.textContent = this.dataset.shareError;
      }
    }
  });
}

document.addEventListener('shopify:section:load', (event) => {
  event.target.querySelector('ch-sticky-atc')?.connectedCallback();
});
