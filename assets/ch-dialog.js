class ChelonakiDialog extends HTMLElement {
  connectedCallback() {
    if (this.dataset.initialized === 'true') return;
    this.dataset.initialized = 'true';
    this.dialog = this.querySelector('dialog');
    this.trigger = this.querySelector('[data-ch-dialog-open]');
    this.trigger?.addEventListener('click', () => this.open());
    this.querySelector('[data-ch-dialog-close]')?.addEventListener('click', () => this.dialog.close());
    this.dialog?.addEventListener('close', () => this.trigger?.focus());
    this.dialog?.addEventListener('keydown', (event) => this.trapFocus(event));
  }
  open() { this.dialog?.showModal(); this.dialog?.querySelector('[data-ch-dialog-close]')?.focus(); }
  trapFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = [...this.dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
    if (!controls.length) return;
    const first = controls[0]; const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
}
if (!customElements.get('ch-dialog')) customElements.define('ch-dialog', ChelonakiDialog);
