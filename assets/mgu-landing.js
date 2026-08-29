/*! Chelonaki Shop Theme · © Chelonaki · Lizenzpflichtig · Build: CHELONAKI-BUILD-0000-MASTER */
/* ============================================================
   Food Instructor MGU® – Landingpage JS (Shopify 2.0)
   - Scroll-Scrubbing über Sprite-Sheets auf Canvas
   - Reveal-Animationen
   - Läuft auch im Theme-Customizer (shopify:section:load)
   ============================================================ */
(function () {
  'use strict';
  if (window.__mguLandingLoaded) return;
  window.__mguLandingLoaded = true;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Reveal on scroll ---------- */
  function initReveals(root) {
    var els = (root || document).querySelectorAll('.mgu-reveal:not(.mgu-in)');
    if (!('IntersectionObserver' in window) || reduced) {
      els.forEach(function (el) { el.classList.add('mgu-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('mgu-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Scroll-Scrub (Sprite-Sheets) ---------- */
  function initScrub(section) {
    var wrap = section.querySelector('[data-mgu-scrub]');
    if (!wrap || wrap.dataset.mguInit === '1') return;
    wrap.dataset.mguInit = '1';

    var canvas  = wrap.querySelector('canvas');
    var ctx     = canvas.getContext('2d');
    var bar     = wrap.querySelector('.mgu-scrub-progress i');
    var loading = wrap.querySelector('.mgu-scrub-loading');
    var caps    = Array.prototype.slice.call(wrap.querySelectorAll('.mgu-scrub-cap'));

    var cols   = parseInt(wrap.dataset.cols, 10)  || 8;
    var rows   = parseInt(wrap.dataset.rows, 10)  || 6;
    var fw     = parseInt(wrap.dataset.fw, 10)    || 720;
    var fh     = parseInt(wrap.dataset.fh, 10)    || 405;
    var urls   = [];
    try { urls = JSON.parse(wrap.dataset.sprites || '[]'); } catch (e) {}
    urls = urls.filter(Boolean);
    if (!urls.length) { if (loading) loading.textContent = 'Bitte Sprite-Bilder in der Section wählen'; return; }

    var perSheet = cols * rows;
    var N = perSheet * urls.length;
    var sheets = new Array(urls.length);
    var loadedSheets = 0;

    function ladeSprites() {
    urls.forEach(function (u, i) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () {
        sheets[i] = im; loadedSheets++;
        if (loading) {
          if (loadedSheets >= urls.length) { loading.style.opacity = 0; }
          else { loading.textContent = ((window.MGU_I18N && window.MGU_I18N.loading) || 'Lädt …').replace('…','') + Math.round(loadedSheets / urls.length * 100) + '%'; }
        }
        if (i === 0) draw(0, true);
      };
      im.src = u;
    });
    }
    /* Performance: Sprites erst laden, wenn die Section in Reichweite kommt */
    if ('IntersectionObserver' in window) {
      var ladeIO = new IntersectionObserver(function (es, obs) {
        es.forEach(function (e) {
          if (e.isIntersecting) { ladeSprites(); obs.disconnect(); }
        });
      }, { rootMargin: '150% 0px' });
      ladeIO.observe(wrap);
    } else { ladeSprites(); }

    var currentFrame = -1;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = wrap.clientWidth  * dpr || window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      draw(Math.max(currentFrame, 0), true);
    }

    function draw(idx, force) {
      idx = Math.max(0, Math.min(N - 1, idx));
      if (idx === currentFrame && !force) return;
      var s = Math.floor(idx / perSheet);
      var im = sheets[s] || sheets[0];
      if (!im) return;
      currentFrame = idx;
      var local = sheets[s] ? idx % perSheet : 0;
      var sx = (local % cols) * fw;
      var sy = Math.floor(local / cols) * fh;
      var cw = canvas.width, ch = canvas.height;
      var scale = Math.max(cw / fw, ch / fh);
      var w = fw * scale, h = fh * scale;
      ctx.drawImage(im, sx, sy, fw, fh, (cw - w) / 2, (ch - h) / 2, w, h);
    }

    function setCaps(p) {
      caps.forEach(function (c) {
        var a = parseFloat(c.dataset.from), b = parseFloat(c.dataset.to);
        c.classList.toggle('mgu-active', p >= a && p <= b);
      });
      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    }

    if (reduced) {
      resize(); window.addEventListener('resize', resize);
      if (caps[0]) caps[0].classList.add('mgu-active');
      setCaps(0);
      return;
    }

    var target = 0, current = 0, ticking = false;
    function progress() {
      var r = wrap.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      if (total <= 0) return 0;
      return Math.min(1, Math.max(0, -r.top / total));
    }
    function render() {
      current += (target - current) * 0.16;
      draw(Math.round(current * (N - 1)));
      setCaps(current);
      if (Math.abs(target - current) > 0.0004) { requestAnimationFrame(render); }
      else { ticking = false; }
    }
    function onScroll() {
      target = progress();
      if (!ticking) { ticking = true; requestAnimationFrame(render); }
    }
    resize();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { resize(); onScroll(); });
    onScroll();
  }

  /* ---------- Externe Terminbuchung (DSGVO Zwei-Klick) ---------- */
  function initTermine(root) {
    (root || document).querySelectorAll('[data-mgu-termin]').forEach(function (box) {
      if (box.dataset.mguTerminInit === '1') return;
      box.dataset.mguTerminInit = '1';

      var button = box.querySelector('[data-mgu-termin-load]');
      var status = box.querySelector('[data-mgu-termin-status]');
      var fallback = box.querySelector('[data-mgu-termin-fallback]');
      if (!button) return;

      function safeProviderUrl() {
        var rawUrl = (box.dataset.url || '').trim();
        if (!rawUrl) throw new Error('missing url');
        var parsed = new URL(rawUrl, window.location.origin);
        var provider = box.dataset.provider || '';
        var allowedDomains = provider === 'calendly'
          ? ['calendly.com']
          : provider === 'google'
            ? ['calendar.google.com', 'calendar.app.google']
            : [];
        var allowed = parsed.protocol === 'https:' && allowedDomains.some(function (domain) {
          return parsed.hostname === domain || parsed.hostname.endsWith('.' + domain);
        });
        if (!allowed) throw new Error('blocked provider domain');
        return parsed;
      }

      try {
        var fallbackUrl = safeProviderUrl();
        if (fallback) { fallback.href = fallbackUrl.toString(); fallback.hidden = false; }
      } catch (error) {
        if (fallback) fallback.removeAttribute('href');
      }

      button.addEventListener('click', function () {
        if (!(box.dataset.url || '').trim()) {
          if (status) status.textContent = 'Bitte zuerst einen gültigen Kalender-Link eintragen.';
          return;
        }

        var parsed;
        try {
          parsed = safeProviderUrl();
        } catch (error) {
          if (status) status.textContent = 'Der eingetragene Kalender-Link ist ungültig.';
          return;
        }

        if ((box.dataset.provider || '') === 'calendly' || parsed.hostname.indexOf('calendly.com') !== -1) {
          parsed.searchParams.set('embed_domain', window.location.hostname);
          parsed.searchParams.set('embed_type', 'Inline');
          parsed.searchParams.set('hide_gdpr_banner', '1');
          parsed.searchParams.set('background_color', 'ffffff');
        }

        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        if (status) status.textContent = 'Kalender wird geladen …';

        var frame = document.createElement('iframe');
        frame.className = 'mgu-termin-frame';
        frame.src = parsed.toString();
        frame.style.height = Math.max(parseInt(box.dataset.hoehe, 10) || 750, window.innerWidth < 750 ? 700 : 500) + 'px';
        frame.loading = 'eager';
        frame.title = box.dataset.title || 'Terminbuchung';
        if ((box.dataset.provider || '') === 'calendly') frame.allow = 'payment';
        frame.referrerPolicy = 'strict-origin-when-cross-origin';

        frame.addEventListener('load', function () {
          box.replaceWith(frame);
        }, { once: true });

        /* Nicht auf das load-Event allein verlassen: Browser/Privacy-Tools können es verzögern. */
        box.replaceWith(frame);
      });
      if (box.dataset.autoLoad === 'true') button.click();
    });
  }

  /* ---------- Init ---------- */
  function initAll(root) {
    initReveals(root || document);
    initTermine(root || document);
    (root || document).querySelectorAll('.mgu-scrub-section, [data-mgu-scrub]').forEach(function (el) {
      initScrub(el.closest('section') || el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(document); });
  } else {
    initAll(document);
  }

  /* Theme-Customizer: Section neu geladen → neu initialisieren */
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();

/* ---------- Parallax (optional pro Bild) ---------- */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var els = [];
  function collect() {
    els = Array.prototype.slice.call(document.querySelectorAll('[data-mgu-parallax]'));
  }
  function update() {
    var vh = window.innerHeight;
    els.forEach(function (el) {
      var f = parseFloat(el.dataset.mguParallax) || 0.12;
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var center = r.top + r.height / 2 - vh / 2;
      el.style.transform = 'translateY(' + (-center * f).toFixed(1) + 'px)';
    });
  }
  var raf = false;
  function onScroll() {
    if (raf) return;
    raf = true;
    requestAnimationFrame(function () { update(); raf = false; });
  }
  collect(); update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { collect(); update(); });
  document.addEventListener('shopify:section:load', function () { collect(); update(); });
})();
