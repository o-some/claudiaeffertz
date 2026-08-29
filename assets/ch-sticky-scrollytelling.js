(() => {
  'use strict';

  const lifecycleKey = Symbol.for('chelonaki.stickyScrollytelling.lifecycle');
  if (document[lifecycleKey]) {
    document[lifecycleKey].initialize(document);
    return;
  }

  const instances = new WeakMap();
  const lifecycleController = new AbortController();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  class StickyStory {
    constructor(root) {
      this.root = root;
      this.steps = Array.from(root.querySelectorAll('[data-story-step]'));
      this.panels = new Map(
        Array.from(root.querySelectorAll('[data-visual-for]')).map((panel) => [
          panel.dataset.visualFor,
          panel
        ])
      );
      this.progress = root.querySelector('[data-story-progress]');
      this.controller = new AbortController();
      this.editorLocked = false;
      this.activeId = '';
      this.rafId = 0;

      if (!this.steps.length) {
        root.dataset.storyInitialized = 'empty';
        return;
      }

      const preset = this.steps.find((step) => step.getAttribute('aria-current') === 'step') || this.steps[0];
      this.activate(preset);
      this.observe();
      this.root.dataset.storyInitialized = 'true';

      reducedMotion.addEventListener('change', () => {
        this.root.dataset.reducedMotion = String(reducedMotion.matches);
      }, { signal: this.controller.signal });
      this.root.dataset.reducedMotion = String(reducedMotion.matches);
    }

    observe() {
      if (this.steps.length < 2) return;

      const update = () => {
        this.rafId = 0;
        if (this.editorLocked) return;

        const configuredPercent = Number.parseFloat(this.root.dataset.activationPercent);
        const activationRatio = Number.isFinite(configuredPercent)
          ? Math.min(0.6, Math.max(0.2, configuredPercent / 100))
          : 0.3;
        const activationLine = window.innerHeight * activationRatio;
        let candidate = this.steps[0];
        for (const step of this.steps) {
          if (step.getBoundingClientRect().top <= activationLine) candidate = step;
          else break;
        }
        if (candidate.dataset.blockId !== this.activeId) this.activate(candidate);
      };

      const requestUpdate = () => {
        if (!this.rafId) this.rafId = window.requestAnimationFrame(update);
      };

      window.addEventListener('scroll', requestUpdate, {
        passive: true,
        signal: this.controller.signal
      });
      window.addEventListener('resize', requestUpdate, {
        passive: true,
        signal: this.controller.signal
      });
      requestUpdate();
    }

    activate(step, options = {}) {
      if (!step || !this.steps.includes(step)) return;
      const activeId = step.dataset.blockId;
      const activeIndex = this.steps.indexOf(step);
      const turningIndex = this.steps.findIndex((item) => item.dataset.breakpoint === 'true');

      this.steps.forEach((item, index) => {
        const active = item === step;
        item.classList.toggle('is-active', active);
        item.classList.toggle('is-before-breakpoint', turningIndex >= 0 && index < turningIndex);
        item.classList.toggle('is-after-breakpoint', turningIndex >= 0 && index > turningIndex);
        if (active) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });

      this.panels.forEach((panel, blockId) => {
        const active = blockId === activeId;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
        panel.setAttribute('aria-hidden', String(!active));
      });

      const accent = step.dataset.accent?.trim();
      if (accent) this.root.style.setProperty('--ch-story-current-accent', accent);
      else this.root.style.removeProperty('--ch-story-current-accent');

      const progress = ((activeIndex + 1) / this.steps.length) * 100;
      this.root.style.setProperty('--ch-story-progress', `${progress}%`);
      if (this.progress) this.progress.dataset.progress = String(Math.round(progress));
      this.root.classList.toggle('has-active-breakpoint', step.dataset.breakpoint === 'true');
      this.root.dataset.activeBlock = activeId;
      this.activeId = activeId;

      if (options.scrollIntoView) {
        step.scrollIntoView({
          block: 'center',
          behavior: reducedMotion.matches ? 'auto' : 'smooth'
        });
      }
    }

    selectBlock(blockId, scrollIntoView = true) {
      const step = this.steps.find((item) => item.dataset.blockId === blockId);
      if (!step) return;
      this.editorLocked = true;
      this.activate(step, { scrollIntoView });
    }

    deselectBlock() {
      this.editorLocked = false;
    }

    destroy() {
      if (this.rafId) window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
      this.controller.abort();
      this.root.removeAttribute('data-story-initialized');
      this.root.removeAttribute('data-active-block');
      instances.delete(this.root);
    }
  }

  function initializeRoot(root) {
    if (!(root instanceof HTMLElement) || instances.has(root)) return;
    instances.set(root, new StickyStory(root));
  }

  function initialize(scope = document) {
    if (scope.matches?.('[data-ch-sticky-story]')) initializeRoot(scope);
    scope.querySelectorAll?.('[data-ch-sticky-story]').forEach(initializeRoot);
  }

  function destroyScope(scope) {
    const roots = [];
    if (scope.matches?.('[data-ch-sticky-story]')) roots.push(scope);
    scope.querySelectorAll?.('[data-ch-sticky-story]').forEach((root) => roots.push(root));
    roots.forEach((root) => instances.get(root)?.destroy());
  }

  function rootForEditorEvent(event) {
    const direct = event.target instanceof Element ? event.target.closest('[data-ch-sticky-story]') : null;
    if (direct) return direct;
    const sectionId = event.detail?.sectionId;
    return sectionId
      ? document.querySelector(`[data-ch-sticky-story][data-section-id="${CSS.escape(String(sectionId))}"]`)
      : null;
  }

  document.addEventListener('shopify:section:load', (event) => initialize(event.target), {
    signal: lifecycleController.signal
  });
  document.addEventListener('shopify:section:unload', (event) => destroyScope(event.target), {
    signal: lifecycleController.signal
  });
  document.addEventListener('shopify:block:select', (event) => {
    const root = rootForEditorEvent(event);
    if (!root) return;
    const block = event.target instanceof Element ? event.target.closest('[data-block-id]') : null;
    const blockId = block?.dataset.blockId || event.detail?.blockId;
    instances.get(root)?.selectBlock(String(blockId || ''), true);
  }, { signal: lifecycleController.signal });
  document.addEventListener('shopify:block:deselect', (event) => {
    const root = rootForEditorEvent(event);
    if (root) instances.get(root)?.deselectBlock();
  }, { signal: lifecycleController.signal });

  const api = { initialize, destroy: destroyScope };
  document[lifecycleKey] = api;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialize(document), {
      once: true,
      signal: lifecycleController.signal
    });
  } else {
    initialize(document);
  }
})();
