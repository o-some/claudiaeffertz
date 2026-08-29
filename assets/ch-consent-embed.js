class ChelonakiConsentEmbed extends HTMLElement {
  connectedCallback() {
    if (this.dataset.initialized === 'true') return;
    this.dataset.initialized = 'true';
    const button = this.querySelector('[data-ch-consent-load]');
    button?.addEventListener('click', () => this.loadEmbed(button));
  }

  loadEmbed(button) {
    const status = this.querySelector('[data-ch-consent-status]');
    try {
      const source = new URL(this.dataset.source || '');
      const domains = (this.dataset.domains || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
      if (source.protocol !== 'https:' || !domains.some((domain) => source.hostname === domain || source.hostname.endsWith(`.${domain}`))) throw new Error('blocked');
      const frame = document.createElement('iframe');
      frame.src = source.href;
      frame.title = this.dataset.title || 'Externer Inhalt';
      frame.loading = 'lazy';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allowFullscreen = true;
      const target = this.querySelector('[data-ch-consent-target]');
      target?.replaceChildren(frame);
      status.textContent = this.dataset.loadedText || 'Externer Inhalt geladen.';
      button.remove();
    } catch {
      status.textContent = this.dataset.errorText || 'Dieser externe Inhalt wurde aus Sicherheitsgründen blockiert.';
    }
  }
}
if (!customElements.get('ch-consent-embed')) customElements.define('ch-consent-embed', ChelonakiConsentEmbed);
