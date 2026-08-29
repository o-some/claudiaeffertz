(() => {
  'use strict';

  const initialized = new WeakMap();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const designMode = Boolean(window.Shopify && Shopify.designMode);

  const includeSelf = (scope, selector) => {
    const items = Array.from(scope.querySelectorAll(selector));
    if (scope.matches && scope.matches(selector)) items.unshift(scope);
    return items;
  };

  const register = (element, cleanup) => {
    initialized.set(element, cleanup || (() => {}));
    element.dataset.fiInitialized = 'true';
  };

  const cleanupElement = (element) => {
    const cleanup = initialized.get(element);
    if (cleanup) cleanup();
    initialized.delete(element);
    delete element.dataset.fiInitialized;
  };

  const cleanupScope = (scope) => {
    includeSelf(scope, '[data-fi-initialized="true"]').forEach(cleanupElement);
  };

  function initHeader(header) {
    if (initialized.has(header)) return;
    const controller = new AbortController();
    const normalizeNavLabel = (value) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('de');
    const reorderPrimaryLinks = (navigation) => {
      if (!navigation) return;
      const directLinks = Array.from(navigation.children).filter((item) => item.matches?.('a'));
      const findLink = (label) => directLinks.find((link) => normalizeNavLabel(link.textContent) === label);
      const faqLink = findLink('faq');
      const aboutLink = findLink('über markus riebel');
      const voucherLink = findLink('gutscheine');
      if (!faqLink || !aboutLink || !voucherLink) return;
      faqLink.after(aboutLink);
      aboutLink.after(voucherLink);
    };
    header.querySelectorAll('.fi-nav--desktop, .fi-mobile-nav__panel').forEach(reorderPrimaryLinks);
    const navLinks = Array.from(header.querySelectorAll('[data-fi-nav-link]'));
    const pageCurrentLinks = navLinks.filter((link) => link.getAttribute('aria-current') === 'page');
    const mobileMenu = header.querySelector('[data-fi-mobile-nav]');
    const mobileMenuToggle = mobileMenu?.querySelector('summary');
    const mobileMenuPanel = mobileMenuToggle?.nextElementSibling;

    const mobileMenuFocusables = () => {
      if (!mobileMenu) return [];
      return Array.from(mobileMenu.querySelectorAll('summary, a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hidden && element.getClientRects().length > 0);
    };

    const syncMobileMenu = () => {
      if (!mobileMenuToggle) return;
      const isOpen = mobileMenu.hasAttribute('open');
      mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) window.requestAnimationFrame(() => mobileMenuPanel?.querySelector('a[href], button:not([disabled])')?.focus());
    };

    mobileMenu?.addEventListener('toggle', syncMobileMenu, { signal: controller.signal });
    mobileMenu?.addEventListener('keydown', (event) => {
      if (!mobileMenu.hasAttribute('open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        mobileMenu.removeAttribute('open');
        mobileMenuToggle?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = mobileMenuFocusables();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }, { signal: controller.signal });

    const getLinkTarget = (link) => {
      try {
        const hash = new URL(link.getAttribute('href'), window.location.href).hash;
        if (!hash || hash.length <= 1) return null;
        return document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch (_error) {
        return null;
      }
    };

    const getTrackedSections = () => {
      const targets = new Map();
      navLinks.forEach((link) => {
        const target = getLinkTarget(link);
        if (target) targets.set(target.id, target);
      });
      return Array.from(targets, ([id, target]) => ({ id, target })).sort((a, b) => {
        if (a.target === b.target) return 0;
        return a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
    };

    let frame = 0;
    let navigationTargetId = null;
    let navigationTimer = 0;

    const getViewportProbe = () => {
      const headerTop = Math.max(0, header.getBoundingClientRect().top);
      const headerHeight = parseFloat(window.getComputedStyle(header).height) || 0;
      const visibleHeaderBottom = headerTop + headerHeight;
      return Math.min(window.innerHeight * 0.42, visibleHeaderBottom + window.innerHeight * 0.2);
    };

    const finishNavigation = () => {
      navigationTargetId = null;
      navigationTimer = 0;
      updateActiveLink();
    };

    const scheduleNavigationEnd = () => {
      window.clearTimeout(navigationTimer);
      // Smooth scrolling takes considerably longer for the sections that were
      // added near the bottom of the page. Finish only after scrolling stops.
      navigationTimer = window.setTimeout(finishNavigation, 180);
    };

    const setActiveTarget = (targetId) => {
      navLinks.forEach((link) => {
        const isActive = targetId
          ? getLinkTarget(link)?.id === targetId
          : pageCurrentLinks.includes(link);
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', targetId ? 'location' : 'page');
        else if (!pageCurrentLinks.includes(link) || targetId) link.removeAttribute('aria-current');
      });
    };

    const updateActiveLink = () => {
      const trackedSections = getTrackedSections();
      if (!trackedSections.length) return;
      if (navigationTargetId) {
        setActiveTarget(navigationTargetId);
        return;
      }
      // Never derive this point from the header's bounding box: an open mobile
      // menu is part of that box and would otherwise change the active section.
      const threshold = getViewportProbe();
      let active = null;
      trackedSections.forEach((item) => {
        if (item.target.getBoundingClientRect().top <= threshold) active = item;
      });
      // The final section may never reach the probe point on short pages.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        active = trackedSections[trackedSections.length - 1];
      }
      setActiveTarget(active ? active.id : null);
    };

    const update = () => {
      frame = 0;
      header.classList.toggle('fi-scrolled', window.scrollY > 32);
      updateActiveLink();
    };
    const onScroll = () => {
      if (navigationTargetId) scheduleNavigationEnd();
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true, signal: controller.signal });
    window.addEventListener('resize', onScroll, { passive: true, signal: controller.signal });
    window.addEventListener('hashchange', updateActiveLink, { signal: controller.signal });
    header.addEventListener('click', (event) => {
      const link = event.target.closest('[data-fi-nav-link]');
      if (!link || !header.contains(link)) return;
      const target = getLinkTarget(link);
      if (!target) return;
      event.preventDefault();
      navigationTargetId = target.id;
      window.clearTimeout(navigationTimer);
      setActiveTarget(navigationTargetId);
      header.querySelector('.fi-mobile-nav[open]')?.removeAttribute('open');
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${encodeURIComponent(target.id)}`);
      if (reducedMotion.matches) finishNavigation();
      else scheduleNavigationEnd();
    }, { signal: controller.signal });
    mobileMenu?.addEventListener('toggle', updateActiveLink, { signal: controller.signal });
    syncMobileMenu();
    update();
    register(header, () => {
      controller.abort();
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(navigationTimer);
      header.classList.remove('fi-scrolled');
      navLinks.forEach((link) => {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      });
    });
  }

  function initRevealScope(scope) {
    if (initialized.has(scope)) return;
    const items = Array.from(scope.querySelectorAll('.fi-reveal'));
    if (!items.length) {
      register(scope);
      return;
    }

    if (designMode || reducedMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('fi-in'));
      register(scope, () => items.forEach((item) => item.classList.remove('fi-in')));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('fi-in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });

    items.forEach((item) => observer.observe(item));
    register(scope, () => {
      observer.disconnect();
      items.forEach((item) => item.classList.remove('fi-in'));
    });
  }

  function initScrollStory(story) {
    if (initialized.has(story)) return;

    const canvas = story.querySelector('[data-fi-canvas]');
    const frameData = story.querySelector('[data-fi-frames]');
    const loading = story.querySelector('[data-fi-loading]');
    const progressBar = story.querySelector('[data-fi-progress]');
    const captions = Array.from(story.querySelectorAll('.fi-scroll-caption'));
    const mobileAnimation = story.querySelector('[data-fi-mobile-animation]')?.dataset.fiMobileAnimation === 'true';
    const isMobile = window.matchMedia('(max-width: 749px)').matches;

    if (reducedMotion.matches || (isMobile && !mobileAnimation) || !canvas || !frameData) {
      if (loading) loading.hidden = true;
      register(story);
      return;
    }

    let urls;
    try {
      urls = JSON.parse(frameData.textContent);
    } catch (error) {
      console.warn('[Food Instructor] Frame-Liste konnte nicht gelesen werden.', error);
      register(story);
      return;
    }

    if (isMobile && urls.length > 48) {
      const finalUrl = urls[urls.length - 1];
      urls = urls.filter((_url, index) => index % 2 === 0);
      if (urls[urls.length - 1] !== finalUrl) urls.push(finalUrl);
    }

    const context = canvas.getContext('2d', { alpha: false });
    if (!context || !Array.isArray(urls) || urls.length === 0) {
      register(story);
      return;
    }

    const controller = new AbortController();
    const images = new Array(urls.length);
    const status = new Array(urls.length).fill('idle');
    const queue = [];
    const queued = new Set();
    const maxConcurrent = 6;
    const startupThreshold = Math.min(6, urls.length);
    let settledFrameCount = 0;
    let startupReady = false;
    let activeLoads = 0;
    let targetProgress = 0;
    let currentProgress = 0;
    let currentFrame = 0;
    let animationFrame = 0;
    let scrollFrame = 0;
    let started = false;
    let destroyed = false;
    let resizeObserver;
    let proximityObserver;

    story.classList.add('is-enhanced');
    if (captions[0]) captions[0].classList.add('fi-active');

    const hideLoading = () => {
      story.classList.remove('is-loading');
      if (loading) loading.hidden = true;
    };

    const finishStartupBuffer = () => {
      settledFrameCount += 1;
      if (startupReady || settledFrameCount < startupThreshold) return;
      startupReady = true;
      if (images.some(Boolean)) story.classList.add('is-frame-ready');
      hideLoading();
      window.requestAnimationFrame(() => {
        if (startupReady && !destroyed) hideLoading();
      });
    };

    const nearestLoaded = (index) => {
      if (images[index]) return images[index];
      for (let distance = 1; distance < images.length; distance += 1) {
        const before = index - distance;
        const after = index + distance;
        if (before >= 0 && images[before]) return images[before];
        if (after < images.length && images[after]) return images[after];
      }
      return null;
    };

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(rect.width * ratio);
      const height = Math.round(rect.height * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      drawFrame(currentFrame);
    };

    const drawFrame = (index) => {
      const image = nearestLoaded(index);
      if (!image || !image.naturalWidth || !canvas.width || !canvas.height) return;
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, x, y, width, height);
    };

    const pumpQueue = () => {
      if (destroyed) return;
      while (activeLoads < maxConcurrent && queue.length) {
        const index = queue.shift();
        queued.delete(index);
        if (status[index] !== 'idle') continue;
        status[index] = 'loading';
        activeLoads += 1;

        const image = new Image();
        image.decoding = 'async';
        image.onload = () => {
          if (!destroyed) {
            images[index] = image;
            status[index] = 'loaded';
            if (index === 0 || Math.abs(index - currentFrame) <= 2) drawFrame(currentFrame);
            finishStartupBuffer();
          }
          activeLoads -= 1;
          pumpQueue();
        };
        image.onerror = () => {
          status[index] = 'error';
          finishStartupBuffer();
          activeLoads -= 1;
          pumpQueue();
        };
        image.src = urls[index];
      }
    };

    const requestFrame = (index, highPriority = false) => {
      const safeIndex = Math.max(0, Math.min(urls.length - 1, index));
      if (status[safeIndex] !== 'idle' || queued.has(safeIndex)) return;
      queued.add(safeIndex);
      if (highPriority) queue.unshift(safeIndex);
      else queue.push(safeIndex);
      pumpQueue();
    };

    const requestAround = (index) => {
      requestFrame(index, true);
      requestFrame(index - 1, true);
      requestFrame(index + 1, true);
      for (let distance = 2; distance <= 6; distance += 1) {
        requestFrame(index - distance);
        requestFrame(index + distance);
      }
    };

    const startLoading = () => {
      if (started || destroyed) return;
      started = true;
      story.classList.add('is-loading');
      if (loading) loading.hidden = false;
      const bufferStart = Math.max(0, Math.min(urls.length - 12, currentFrame - 3));
      const bufferIndexes = [];
      for (let index = bufferStart; index < Math.min(urls.length, bufferStart + 12); index += 1) {
        bufferIndexes.push(index);
      }
      bufferIndexes.forEach((index) => {
        requestFrame(index, index === currentFrame);
      });
      requestFrame(urls.length - 1);
      for (let index = 18; index < urls.length; index += 18) requestFrame(index);
    };

    const getProgress = () => {
      const rect = story.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      return total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    };

    const updateCaptions = (value) => {
      captions.forEach((caption) => {
        const from = Number(caption.dataset.from || 0);
        const to = Number(caption.dataset.to || 1);
        caption.classList.toggle('fi-active', value >= from && value <= to);
      });
    };

    const previewCaption = (event) => {
      const caption = event.detail?.caption;
      if (!caption || !captions.includes(caption)) return;
      const from = Number(caption.dataset.from || 0);
      const to = Number(caption.dataset.to || from);
      const previewProgress = Math.min(1, Math.max(0, (from + to) / 2));
      startLoading();
      targetProgress = previewProgress;
      currentProgress = previewProgress;
      currentFrame = Math.round(previewProgress * (urls.length - 1));
      requestAround(currentFrame);
      drawFrame(currentFrame);
      updateCaptions(previewProgress);
      if (progressBar) progressBar.style.width = `${(previewProgress * 100).toFixed(2)}%`;
    };

    story.addEventListener('fi:preview-caption', previewCaption, { signal: controller.signal });

    const render = () => {
      animationFrame = 0;
      currentProgress += (targetProgress - currentProgress) * 0.16;
      currentFrame = Math.round(currentProgress * (urls.length - 1));
      requestAround(currentFrame);
      drawFrame(currentFrame);
      if (progressBar) progressBar.style.width = `${(currentProgress * 100).toFixed(2)}%`;
      updateCaptions(currentProgress);
      if (Math.abs(targetProgress - currentProgress) > 0.0004) animationFrame = window.requestAnimationFrame(render);
    };

    const onScroll = () => {
      scrollFrame = 0;
      targetProgress = getProgress();
      currentFrame = Math.round(targetProgress * (urls.length - 1));
      if (started) requestAround(currentFrame);
      if (!animationFrame) animationFrame = window.requestAnimationFrame(render);
    };

    const scheduleScroll = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(onScroll);
    };

    window.addEventListener('scroll', scheduleScroll, { passive: true, signal: controller.signal });
    window.addEventListener('resize', resizeCanvas, { passive: true, signal: controller.signal });

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(canvas);
    }

    if ('IntersectionObserver' in window) {
      proximityObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startLoading();
          proximityObserver.disconnect();
        }
      }, { rootMargin: '0px', threshold: 0.01 });
      proximityObserver.observe(story);
    } else {
      startLoading();
    }

    resizeCanvas();
    onScroll();

    register(story, () => {
      destroyed = true;
      controller.abort();
      if (resizeObserver) resizeObserver.disconnect();
      if (proximityObserver) proximityObserver.disconnect();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      queue.length = 0;
      story.classList.remove('is-enhanced', 'is-loading', 'is-frame-ready');
      captions.forEach((caption) => caption.classList.remove('fi-active'));
      if (progressBar) progressBar.style.width = '';
    });
  }

  function initScope(scope = document) {
    const page = scope.closest?.('[data-fi-page]') || scope.querySelector?.('[data-fi-page]') || document.querySelector('[data-fi-page]');
    if (!page) return;
    page.classList.add('fi-js');

    includeSelf(scope, '[data-fi-header]').forEach(initHeader);
    includeSelf(scope, '[data-fi-reveal-scope]').forEach(initRevealScope);
    includeSelf(scope, '[data-fi-scroll-story]').forEach(initScrollStory);
  }

  const boot = () => initScope(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  document.addEventListener('shopify:section:load', (event) => initScope(event.target));
  document.addEventListener('shopify:section:unload', (event) => cleanupScope(event.target));
  document.addEventListener('shopify:block:select', (event) => {
    const block = event.target;
    const reveal = block.closest?.('.fi-reveal');
    if (reveal) reveal.classList.add('fi-in');
    const caption = block.closest?.('.fi-scroll-caption');
    if (caption) {
      caption.parentElement.querySelectorAll('.fi-scroll-caption').forEach((item) => item.classList.toggle('fi-active', item === caption));
      const story = caption.closest('[data-fi-scroll-story]');
      story?.dispatchEvent(new CustomEvent('fi:preview-caption', { detail: { caption } }));
    }
  });

  reducedMotion.addEventListener?.('change', () => {
    const page = document.querySelector('[data-fi-page]');
    if (!page) return;
    cleanupScope(page);
    initScope(page);
  });
})();
