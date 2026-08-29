/* Chelonaki: zentrale Erkennung eigener Cart-Injektionen (verhindert Observer-Endlosschleifen) */
window.__mguIsSelfCartNode = function (n) {
  return !!(n && n.classList && (
    n.classList.contains('mgu-ship') ||
    n.classList.contains('mgu-upsell') ||
    n.classList.contains('mgu-alk-note') ||
    n.classList.contains('mgu-cart-hinweis')
  ));
};

/* Chelonaki: geteilter Produkt-Cache — verhindert mehrfaches Laden derselben /products/handle.js
   über verschiedene Module (18+-Badge, Tag-Badge, Alk-Warenkorb, Quick View). */
window.__mguProductCache = window.__mguProductCache || {};
window.__mguFetchProduct = function (handle) {
  if (window.__mguProductCache[handle]) return window.__mguProductCache[handle];
  var promise = fetch('/products/' + handle + '.js')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .catch(function () { return null; });
  window.__mguProductCache[handle] = promise;
  return promise;
};

/* Chelonaki: zentraler, rAF-gedrosselter Scan-Scheduler.
   Statt dass 4 Observer bei JEDER DOM-Mutation sofort teure Vollscans
   (querySelectorAll über alle Karten) auslösen, werden Scans gebündelt
   und höchstens einmal pro Animationsframe ausgeführt. Verhindert
   Layout-Thrashing und Observer-Kaskaden auf großen Collection-Seiten. */
window.__mguScanFns = window.__mguScanFns || [];
window.__mguScanScheduled = false;
window.__mguRunScans = function () {
  window.__mguScanScheduled = false;
  window.__mguScanFns.forEach(function (fn) { try { fn(); } catch (e) {} });
};
window.__mguScheduleScan = function (fn) {
  if (fn && window.__mguScanFns.indexOf(fn) < 0) window.__mguScanFns.push(fn);
  if (window.__mguScanScheduled) return;
  window.__mguScanScheduled = true;
  (window.requestAnimationFrame || function (cb) { setTimeout(cb, 32); })(window.__mguRunScans);
};
/*! Chelonaki Shop Theme · © Chelonaki · Lizenzpflichtig · Build: CHELONAKI-BUILD-0000-MASTER */
/* ============================================================
   MGU Features JS – Wishlist, Sticky ATC, Countdown, Zuletzt angesehen
   Ohne Apps, ohne externe Abhängigkeiten. Speicherung im Browser.
   ============================================================ */
(function () {
  'use strict';

  var CURRENCY = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
  function money(cents) {
    try { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: CURRENCY }).format(cents / 100); }
    catch (e) { return (cents / 100).toFixed(2) + ' €'; }
  }
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }
  function safeProductUrl(value) {
    try {
      var url = new URL(String(value || ''), window.location.origin);
      return url.origin === window.location.origin && url.pathname.indexOf('/products/') === 0
        ? escapeHTML(url.pathname + url.search)
        : '#';
    } catch (e) { return '#'; }
  }
  function safeImageUrl(value) {
    try {
      var url = new URL(String(value || ''), window.location.origin);
      return url.protocol === 'https:' || url.origin === window.location.origin ? escapeHTML(url.href) : '';
    } catch (e) { return ''; }
  }
  window.__mguEscapeHTML = escapeHTML;
  window.__mguSafeProductUrl = safeProductUrl;
  window.__mguSafeImageUrl = safeImageUrl;
  function store(key) {
    return {
      get: function () { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } },
      set: function (v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
    };
  }
  var I = window.MGU_I18N || {};
  var TXT = {
    wishAdd: I.wishAdd || 'Zur Merkliste hinzufügen',
    wishRemove: I.wishRemove || 'Von Merkliste entfernen',
    wishEmpty: I.wishEmpty || 'Deine Merkliste ist noch leer.<br>Tippe auf das Herz bei einem Produkt, um es dir zu merken.',
    cartAdded: I.cartAdded || '✓ Im Warenkorb',
    soldOut: I.soldOut || 'Ausverkauft'
  };
  var wish = store('mgu_wishlist');
  var recent = store('mgu_recent');

  var HEART = '<svg viewBox="0 0 24 24"><path d="M12 21C12 21 3.5 15.5 3.5 9.7C3.5 6.6 5.9 4.5 8.6 4.5C10 4.5 11.3 5.2 12 6.2C12.7 5.2 14 4.5 15.4 4.5C18.1 4.5 20.5 6.6 20.5 9.7C20.5 15.5 12 21 12 21Z"/></svg>';

  function handleFromUrl(href) {
    var m = (href || '').match(/\/products\/([a-z0-9\-_%]+)/i);
    return m ? decodeURIComponent(m[1]).split('?')[0] : null;
  }

  /* ============ 1) WISHLIST ============ */
  function toggleWish(handle, btn) {
    var list = wish.get();
    var i = list.indexOf(handle);
    if (i >= 0) { list.splice(i, 1); } else { list.push(handle); }
    wish.set(list);
    window.mguTrack && mguTrack(i >= 0 ? 'mgu:wishlist:remove' : 'mgu:wishlist:add', { product: handle });
    document.querySelectorAll('.mgu-wish-btn[data-handle="' + handle + '"]').forEach(function (b) {
      b.classList.toggle('mgu-active', i < 0);
      b.setAttribute('aria-label', i < 0 ? TXT.wishRemove : TXT.wishAdd);
    });
    if (btn) { btn.classList.add('mgu-pop'); setTimeout(function () { btn.classList.remove('mgu-pop'); }, 380); }
    document.dispatchEvent(new CustomEvent('mgu:wishlist:changed'));
  }

  function makeHeart(handle, inline) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'mgu-wish-btn' + (inline ? ' mgu-wish-inline' : '');
    b.dataset.handle = handle;
    b.innerHTML = HEART;
    var active = wish.get().indexOf(handle) >= 0;
    b.classList.toggle('mgu-active', active);
    b.setAttribute('aria-label', active ? TXT.wishRemove : TXT.wishAdd);
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      toggleWish(handle, b);
    });
    return b;
  }

  function injectCardHearts(root) {
    (root || document).querySelectorAll('.card-wrapper').forEach(function (card) {
      if (card.querySelector('.mgu-wish-btn')) return;
      var link = card.querySelector('a[href*="/products/"]');
      var handle = link && handleFromUrl(link.getAttribute('href'));
      if (!handle) return;
      var host = card.querySelector('.card__inner') || card;
      host.classList.add('mgu-anchor');
      host.appendChild(makeHeart(handle));
    });
  }

  function injectProductHeart() {
    var titleEl = document.querySelector('.product__title h1, .product__title');
    if (!titleEl || titleEl.querySelector('.mgu-wish-btn')) return;
    var handle = handleFromUrl(location.pathname);
    if (!handle) return;
    titleEl.appendChild(makeHeart(handle, true));
  }

  function fetchProduct(handle) {
    return window.__mguFetchProduct(handle);
  }

  function productCard(p) {
    var img = safeImageUrl(p.featured_image || (p.images && p.images[0]) || '');
    var productUrl = safeProductUrl(p.url);
    return '<div class="mgu-prod-card">' +
      '<a href="' + productUrl + '">' +
        '<div class="mgu-prod-media">' + (img ? '<img loading="lazy" decoding="async" src="' + img + '" alt="">' : '') + '</div>' +
        '<div class="mgu-prod-info"><h3>' + escapeHTML(p.title) + '</h3>' +
        '<span class="mgu-prod-price">' + money(p.price) + '</span></div>' +
      '</a></div>';
  }

  function renderWishlistPage() {
    var box = document.querySelector('[data-mgu-wishlist-grid]');
    if (!box) return;
    var list = wish.get();
    if (!list.length) {
      box.innerHTML = '<div class="mgu-empty">' + HEART.replace('<svg', '<svg style="stroke:#B9912F"') +
        '<p>Deine Merkliste ist noch leer.<br>Tippe auf das Herz bei einem Produkt, um es dir zu merken.</p></div>';
      return;
    }
    box.innerHTML = '<div class="mgu-prod-grid"></div>';
    var grid = box.firstChild;
    list.forEach(function (h) {
      fetchProduct(h).then(function (p) {
        if (!p) return;
        var wrap = document.createElement('div');
        wrap.innerHTML = productCard(p);
        var card = wrap.firstChild;
        card.style.position = 'relative';
        card.appendChild(makeHeart(p.handle));
        grid.appendChild(card);
      });
    });
  }
  document.addEventListener('mgu:wishlist:changed', function () {
    if (document.querySelector('[data-mgu-wishlist-grid]')) renderWishlistPage();
  });

  /* ============ 2) STICKY ADD-TO-CART ============ */
  function initStickyATC() {
    var bar = document.querySelector('[data-mgu-satc]');
    if (!bar || bar.dataset.mguInit) return;
    bar.dataset.mguInit = '1';

    var select = bar.querySelector('select');
    var priceEl = bar.querySelector('.mgu-satc-price');
    var btn = bar.querySelector('.mgu-satc-btn');
    var variants = [];
    try { variants = JSON.parse(bar.dataset.variants || '[]'); } catch (e) {}

    function currentVariant() {
      var id = select ? select.value : bar.dataset.variantId;
      for (var i = 0; i < variants.length; i++) if (String(variants[i].id) === String(id)) return variants[i];
      return variants[0];
    }
    function sync() {
      var v = currentVariant();
      if (!v) return;
      if (priceEl) priceEl.textContent = money(v.price);
      btn.disabled = !v.available;
      btn.querySelector('span').textContent = v.available ? bar.dataset.labelAdd : TXT.soldOut;
    }
    if (select) select.addEventListener('change', sync);
    sync();

    btn.addEventListener('click', function () {
      var v = currentVariant();
      if (!v || !v.available) return;
      btn.disabled = true;
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: v.id, quantity: 1 })
      }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function () {
          btn.classList.add('mgu-done');
          btn.querySelector('span').textContent = TXT.cartAdded;
          window.mguTrack && mguTrack('mgu:sticky:add', { variantId: v.id });
          /* Warenkorb-Zähler im Header aktualisieren */
          fetch(location.pathname + '?sections=cart-icon-bubble')
            .then(function (r) { return r.json(); })
            .then(function (d) {
              var host = document.getElementById('cart-icon-bubble');
              if (host && d['cart-icon-bubble']) {
                var t = document.createElement('div');
                t.innerHTML = d['cart-icon-bubble'];
                var fresh = t.querySelector('#cart-icon-bubble') || t.firstElementChild;
                if (fresh) host.replaceWith(fresh);
              }
            }).catch(function () {});
          setTimeout(function () {
            btn.classList.remove('mgu-done');
            btn.disabled = false;
            sync();
          }, 2600);
        })
        .catch(function () { btn.disabled = false; });
    });

    /* Einblenden, sobald das Haupt-Kaufformular aus dem Bild scrollt */
    var anchor = document.querySelector('.product-form, product-form, .product__info-container');
    if (anchor && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { bar.classList.toggle('mgu-show', !e.isIntersecting && e.boundingClientRect.top < 0); });
      }, { threshold: 0 }).observe(anchor);
    } else {
      window.addEventListener('scroll', function () {
        bar.classList.toggle('mgu-show', window.scrollY > 600);
      }, { passive: true });
    }
  }

  /* ============ 3) COUNTDOWN ============ */
  function initCountdowns(root) {
    (root || document).querySelectorAll('[data-mgu-countdown]').forEach(function (el) {
      if (el.dataset.mguInit) return;
      el.dataset.mguInit = '1';
      var end = new Date((el.dataset.deadline || '').replace(' ', 'T'));
      if (isNaN(end)) return;
      var f = {
        d: el.querySelector('[data-u="d"] b'),
        h: el.querySelector('[data-u="h"] b'),
        m: el.querySelector('[data-u="m"] b'),
        s: el.querySelector('[data-u="s"] b')
      };
      var labelFallbacks = { d: 'Tage', h: 'Stunden', m: 'Minuten', s: 'Sekunden' };
      Object.keys(labelFallbacks).forEach(function (key) {
        var label = el.querySelector('[data-u="' + key + '"] span');
        if (!label) return;
        var current = (label.textContent || '').trim();
        if (!current || /translation\s+missing/i.test(current) || /mgu\.countdown/i.test(current)) {
          label.textContent = labelFallbacks[key];
        }
      });
      function pad(n) { return n < 10 ? '0' + n : '' + n; }
      function tick() {
        var diff = end - Date.now();
        if (diff <= 0) {
          el.classList.add('mgu-over');
          if (el.dataset.hideOver === 'true') el.closest('.shopify-section, section').style.display = 'none';
          clearInterval(iv);
          return;
        }
        var s = Math.floor(diff / 1000);
        if (f.d) f.d.textContent = pad(Math.floor(s / 86400));
        if (f.h) f.h.textContent = pad(Math.floor(s % 86400 / 3600));
        if (f.m) f.m.textContent = pad(Math.floor(s % 3600 / 60));
        if (f.s) f.s.textContent = pad(s % 60);
      }
      tick();
      var iv = setInterval(tick, 1000);
    });
  }

  /* ============ 4) ZULETZT ANGESEHEN ============ */
  function trackRecent() {
    var handle = handleFromUrl(location.pathname);
    if (!handle || !document.querySelector('.product__title, product-info')) return;
    var list = recent.get().filter(function (h) { return h !== handle; });
    list.unshift(handle);
    recent.set(list.slice(0, 12));
  }

  function renderRecent(root) {
    (root || document).querySelectorAll('[data-mgu-recent]').forEach(function (box) {
      if (box.dataset.mguInit) return;
      box.dataset.mguInit = '1';
      var max = parseInt(box.dataset.max, 10) || 4;
      var current = handleFromUrl(location.pathname);
      var list = recent.get().filter(function (h) { return h !== current; }).slice(0, max);
      if (!list.length) {
        box.closest('.shopify-section, section').style.display = 'none';
        return;
      }
      var grid = box.querySelector('.mgu-prod-grid');
      list.forEach(function (h) {
        fetchProduct(h).then(function (p) {
          if (p) grid.insertAdjacentHTML('beforeend', productCard(p));
        });
      });
    });
  }

  /* ============ Init ============ */
  function initAll(root) {
    injectCardHearts(root);
    injectProductHeart();
    renderWishlistPage();
    initStickyATC();
    initCountdowns(root);
    trackRecent();
    renderRecent(root);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(document); });
  } else { initAll(document); }
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
  /* Hearts nach Filter-/Seitenwechsel in Collections erneut einsetzen */
  if (!window.__mguObsHearts) { window.__mguObsHearts = true;
    new MutationObserver(function () { window.__mguScheduleScan(function () { injectCardHearts(document); }); }).observe(document.body, { childList: true, subtree: true });
  }
})();

/* ============================================================
   MGU Features Teil 2 – Quick View, Versand-Fortschritt, Popup
   ============================================================ */
(function () {
  'use strict';
  var I = window.MGU_I18N || {};
  var T = {
    qv: I.qvLabel || 'Schnellansicht',
    qvAdd: I.cartAddLabel || 'In den Warenkorb',
    qvAdded: I.cartAdded || '✓ Im Warenkorb',
    qvSoldOut: I.soldOut || 'Ausverkauft',
    qvFull: I.qvFull || 'Alle Details ansehen',
    shipLeft: I.shipLeft || 'Noch {betrag} bis zum Gratisversand',
    shipDone: I.shipDone || '🎉 Gratisversand erreicht!'
  };
  var CUR = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
  function money(c) {
    try { return new Intl.NumberFormat(document.documentElement.lang || 'de', { style: 'currency', currency: CUR }).format(c / 100); }
    catch (e) { return (c / 100).toFixed(2) + ' €'; }
  }
  function handleFromUrl(href) {
    var m = (href || '').match(/\/products\/([a-z0-9\-_%]+)/i);
    return m ? decodeURIComponent(m[1]).split('?')[0] : null;
  }
  function bumpCartIcon() {
    fetch(location.pathname + '?sections=cart-icon-bubble').then(function (r) { return r.json(); })
      .then(function (d) {
        var host = document.getElementById('cart-icon-bubble');
        if (host && d['cart-icon-bubble']) {
          var t = document.createElement('div');
          t.innerHTML = d['cart-icon-bubble'];
          var fresh = t.querySelector('#cart-icon-bubble') || t.firstElementChild;
          if (fresh) host.replaceWith(fresh);
        }
      }).catch(function () {});
  }

  /* ---------- QUICK VIEW ---------- */
  function injectQuickView(root) {
    (root || document).querySelectorAll('.card-wrapper').forEach(function (card) {
      if (card.querySelector('.mgu-qv-btn')) return;
      var link = card.querySelector('a[href*="/products/"]');
      var handle = link && handleFromUrl(link.getAttribute('href'));
      if (!handle) return;
      var host = card.querySelector('.card__inner') || card;
      host.classList.add('mgu-anchor');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'mgu-qv-btn'; b.textContent = T.qv;
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); openQV(handle); });
      host.appendChild(b);
    });
  }

  window.__mguOpenQV = openQV;
  function openQV(handle) {
    var previousFocus = document.activeElement;
    window.__mguFetchProduct(handle).then(function (p) {
      if (!p) return;
      var ov = document.createElement('div');
      ov.className = 'mgu-qv-overlay mgu';
      var opts = p.variants.map(function (v) {
        return '<option value="' + Number(v.id) + '" data-price="' + Number(v.price) + '" ' + (v.available ? '' : 'disabled') + '>' + escapeHTML(v.title) + (v.available ? '' : ' – ' + escapeHTML(T.qvSoldOut)) + '</option>';
      }).join('');
      var img = safeImageUrl(p.featured_image || (p.images && p.images[0]) || '');
      var productUrl = safeProductUrl(p.url);
      var description = escapeHTML(String(p.description || '').replace(/<[^>]+>/g, ' ').slice(0, 220));
      ov.innerHTML =
        '<div class="mgu-qv-modal" role="dialog" aria-modal="true" aria-label="' + escapeHTML(p.title) + '">' +
          '<button type="button" class="mgu-qv-close" aria-label="Schließen">×</button>' +
          '<div class="mgu-qv-media">' + (img ? '<img src="' + img + '" alt="">' : '') + '</div>' +
          '<div class="mgu-qv-body">' +
            '<h3>' + escapeHTML(p.title) + '</h3>' +
            '<span class="mgu-qv-price">' + money(p.price) + '</span>' +
            (p.variants.length > 1 ? '<select>' + opts + '</select>' : '') +
            '<div class="mgu-qv-desc">' + description + '…</div>' +
            '<button type="button" class="mgu-qv-add"' + (p.available ? '' : ' disabled') + '>' + escapeHTML(p.available ? T.qvAdd : T.qvSoldOut) + '</button>' +
            '<a class="mgu-qv-link" href="' + productUrl + '">' + escapeHTML(T.qvFull) + ' →</a>' +
          '</div>' +
        '</div>';
      document.body.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add('mgu-show'); });

      function close() {
        ov.classList.remove('mgu-show');
        setTimeout(function () { ov.remove(); }, 320);
        document.removeEventListener('keydown', esc);
        if (previousFocus && previousFocus.focus) previousFocus.focus();
      }
      function esc(e) { if (e.key === 'Escape') close(); }
      ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
      ov.querySelector('.mgu-qv-close').addEventListener('click', close);
      document.addEventListener('keydown', esc);
      window.mguTrapFocus && mguTrapFocus(ov);
      var cb = ov.querySelector('.mgu-qv-close'); if (cb) cb.focus();

      var sel = ov.querySelector('select');
      var price = ov.querySelector('.mgu-qv-price');
      if (sel) sel.addEventListener('change', function () {
        price.textContent = money(+sel.selectedOptions[0].dataset.price);
      });
      var add = ov.querySelector('.mgu-qv-add');
      add.addEventListener('click', function () {
        var id = sel ? +sel.value : p.variants[0].id;
        add.disabled = true;
        fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, quantity: 1 }) })
          .then(function (r) { if (!r.ok) throw 0; return r.json(); })
          .then(function () {
            add.classList.add('mgu-done'); add.textContent = T.qvAdded;
            bumpCartIcon(); updateShipBar();
            window.mguTrack && mguTrack('mgu:quickview:add', { product: p.handle });
            setTimeout(close, 1400);
          }).catch(function () { add.disabled = false; });
      });
    }).catch(function () {});
  }

  /* ---------- GRATISVERSAND-FORTSCHRITT ---------- */
  var shipCfg = null;
  function shipBarHTML(total) {
    var rest = Math.max(0, shipCfg.schwelle - total);
    var pct = Math.min(100, total / shipCfg.schwelle * 100);
    var txt = rest > 0 ? T.shipLeft.replace('{betrag}', '<b>' + money(rest) + '</b>') : '<b>' + T.shipDone + '</b>';
    return '<div class="mgu-ship' + (rest <= 0 ? ' mgu-ship--done' : '') + '">' + txt +
           '<div class="mgu-ship-track"><i style="width:' + pct + '%"></i></div></div>';
  }
  function updateShipBar() {
    if (!shipCfg) return;
    fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
      var html = shipBarHTML(cart.total_price);
      ['cart-drawer .drawer__inner', '#main-cart-items', 'cart-drawer-items'].forEach(function (selctr) {
        var host = document.querySelector(selctr);
        if (!host) return;
        var old = host.querySelector(':scope > .mgu-ship, .mgu-ship');
        if (old) { old.outerHTML = html; }
        else { host.insertAdjacentHTML('afterbegin', html); }
      });
    }).catch(function () {});
  }
  function initShipBar() {
    var cfg = document.querySelector('[data-mgu-ship]');
    if (!cfg) return;
    shipCfg = { schwelle: parseInt(cfg.dataset.schwelle, 10) * 100 || 5000 };
    updateShipBar();
    var drawer = document.querySelector('cart-drawer');
    if (drawer) new MutationObserver(function (muts) {
      var selfOnly = muts.every(function (m) {
        return [].every.call(m.addedNodes, window.__mguIsSelfCartNode);
      });
      if (!selfOnly) updateShipBar();
    }).observe(drawer, { childList: true, subtree: true });
    document.addEventListener('mgu:cart:changed', updateShipBar);
  }

  /* ---------- NEWSLETTER-POPUP ---------- */
  function initPopup() {
    var pop = document.querySelector('[data-mgu-popup]');
    if (!pop || pop.dataset.mguInit) return;
    pop.dataset.mguInit = '1';
    var tage = parseInt(pop.dataset.tage, 10) || 7;
    var key = 'mgu_popup_seen';
    try {
      var seen = +localStorage.getItem(key) || 0;
      if (Date.now() - seen < tage * 864e5) return;
    } catch (e) {}
    var delay = (parseInt(pop.dataset.delay, 10) || 6) * 1000;
    function close() {
      pop.classList.remove('mgu-show');
      try { localStorage.setItem(key, Date.now()); } catch (e) {}
    }
    setTimeout(function () {
      pop.classList.add('mgu-show');
      window.mguTrapFocus && mguTrapFocus(pop);
      var pc = pop.querySelector('.mgu-pop-close'); if (pc) pc.focus();
      pop.querySelector('.mgu-pop-close').addEventListener('click', close);
      pop.addEventListener('click', function (e) { if (e.target === pop) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }, delay);
  }

  function initAll2(root) {
    injectQuickView(root);
    initShipBar();
    initPopup();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll2(document); });
  } else { initAll2(document); }
  document.addEventListener('shopify:section:load', function (e) { initAll2(e.target); });
  if (!window.__mguObsQV) { window.__mguObsQV = true; new MutationObserver(function () { window.__mguScheduleScan(function () { injectQuickView(document); }); }).observe(document.body, { childList: true, subtree: true }); }
})();

/* ---------- Warenkorb-Upsell + Lookbook-Quickview-Brücke ---------- */
(function () {
  'use strict';
  document.addEventListener('mgu:quickview', function (e) {
    /* öffnet die Quick-View für ein Handle aus anderen Bausteinen (z.B. Lookbook) */
    if (typeof e.detail === 'string' && window.__mguOpenQV) window.__mguOpenQV(e.detail);
  });

  var cfg = null;
  function money2(c) {
    var cur = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
    try { return new Intl.NumberFormat(document.documentElement.lang || 'de', { style: 'currency', currency: cur }).format(c / 100); }
    catch (e) { return (c / 100).toFixed(2) + ' €'; }
  }
  function renderUpsell() {
    if (!cfg) return;
    Promise.all([
      fetch('/cart.js').then(function (r) { return r.json(); }),
      fetch('/collections/' + encodeURIComponent(cfg.col) + '/products.json?limit=8').then(function (r) { return r.json(); })
    ]).then(function (res) {
      var inCart = res[0].items.map(function (i) { return i.handle; });
      var picks = (res[1].products || []).filter(function (p) { return inCart.indexOf(p.handle) < 0; }).slice(0, 2);
      var host = document.querySelector('cart-drawer .drawer__inner, #main-cart-items');
      if (!host) return;
      var old = host.querySelector('.mgu-upsell'); if (old) old.remove();
      if (!picks.length || !inCart.length) return;
      var html = '<div class="mgu-upsell mgu" style="margin:10px 14px;padding:14px 16px;border:1px solid rgba(31,58,42,.14);border-radius:16px;background:#FBF8F0">' +
        '<p style="margin:0 0 10px;font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#B9912F">' + window.__mguEscapeHTML(cfg.titel) + '</p>';
      picks.forEach(function (p) {
        var v = p.variants && p.variants[0];
        var img = window.__mguSafeImageUrl((p.images && p.images[0] && p.images[0].src) || '');
        var productUrl = window.__mguSafeProductUrl('/products/' + encodeURIComponent(p.handle || ''));
        var variantId = v ? parseInt(v.id, 10) : 0;
        html += '<div style="display:flex;align-items:center;gap:12px;padding:8px 0">' +
          (img ? '<img loading="lazy" decoding="async" src="' + img + '" style="width:46px;height:46px;object-fit:cover;border-radius:10px" alt="">' : '') +
          '<div style="flex:1;min-width:0"><a href="' + productUrl + '" style="font-size:13.5px;font-weight:600;color:#1F3A2A;text-decoration:none;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + window.__mguEscapeHTML(p.title) + '</a>' +
          '<span style="font-size:13px;color:#B9912F;font-weight:600">' + (v ? money2(Math.round(parseFloat(v.price) * 100)) : '') + '</span></div>' +
          (variantId ? '<button data-mgu-up-add="' + variantId + '" style="border:none;cursor:pointer;border-radius:99px;background:#1F3A2A;color:#FBF8F0;font-size:12.5px;font-weight:600;padding:8px 14px">+</button>' : '') +
          '</div>';
      });
      html += '</div>';
      host.insertAdjacentHTML('beforeend', html);
      host.querySelectorAll('[data-mgu-up-add]').forEach(function (b) {
        b.addEventListener('click', function () {
          b.disabled = true;
          fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: +b.dataset.mguUpAdd, quantity: 1 }) })
            .then(function () {
              window.mguTrack && mguTrack('mgu:upsell:add', { variantId: +b.dataset.mguUpAdd });
              document.dispatchEvent(new CustomEvent('mgu:cart:changed'));
              fetch(location.pathname + '?sections=cart-icon-bubble').then(function (r) { return r.json(); }).then(function (d) {
                var host = document.getElementById('cart-icon-bubble');
                if (host && d['cart-icon-bubble']) {
                  var t2 = document.createElement('div'); t2.innerHTML = d['cart-icon-bubble'];
                  var fresh = t2.querySelector('#cart-icon-bubble') || t2.firstElementChild;
                  if (fresh) host.replaceWith(fresh);
                }
              }).catch(function () {});
              renderUpsell();
            })
            .catch(function () { b.disabled = false; });
        });
      });
    }).catch(function () {});
  }
  function initUpsell() {
    var el = document.querySelector('[data-mgu-upsell]');
    if (!el) return;
    cfg = { col: el.dataset.collection, titel: el.dataset.titel };
    renderUpsell();
    var drawer = document.querySelector('cart-drawer');
    if (drawer) new MutationObserver(function (muts) {
      var selfOnly = muts.every(function (m) {
        return [].every.call(m.addedNodes, window.__mguIsSelfCartNode);
      });
      if (!selfOnly) renderUpsell();
    }).observe(drawer, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initUpsell); }
  else { initUpsell(); }
})();

/* ---------- Warenkorb-Hinweis für Alkohol (Tag-basiert) ---------- */
(function () {
  'use strict';
  var cfg = null;
  function hatAlkTag(handle) {
    return window.__mguFetchProduct(handle).then(function (p) {
      if (!p) return false;
      return (p.tags || []).some(function (t) { return String(t).toLowerCase() === cfg.tag; });
    });
  }
  function update() {
    if (!cfg) return;
    fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
      var handles = cart.items.map(function (i) { return i.handle; });
      Promise.all(handles.map(hatAlkTag)).then(function (flags) {
        var zeigen = flags.some(Boolean);
        ['cart-drawer .drawer__inner', '#main-cart-items'].forEach(function (sel) {
          var host = document.querySelector(sel);
          if (!host) return;
          var old = host.querySelector('.mgu-alk-note');
          if (!zeigen) { if (old) old.remove(); return; }
          if (old) return;
          host.insertAdjacentHTML('beforeend',
            '<div class="mgu-alk-note mgu" style="margin:10px 14px;padding:12px 16px;border-radius:14px;background:#F3EDDF;border:1.5px solid #D9BC6A;font-size:13px;color:#22312A;font-weight:600">' + window.__mguEscapeHTML(cfg.text) + '</div>');
        });
      });
    }).catch(function () {});
  }
  function init() {
    var el = document.querySelector('[data-mgu-alk]');
    if (!el) return;
    cfg = { tag: (el.dataset.tag || 'alkohol').toLowerCase(), text: el.dataset.text };
    update();
    var drawer = document.querySelector('cart-drawer');
    if (drawer) new MutationObserver(function (muts) {
      var selfOnly = muts.every(function (m) {
        return [].every.call(m.addedNodes, window.__mguIsSelfCartNode);
      });
      if (!selfOnly) update();
    }).observe(drawer, { childList: true, subtree: true });
    document.addEventListener('mgu:cart:changed', update);
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();


/* ---------- Chelonaki Utilities: Tracking + Fokus-Falle ---------- */
(function () {
  'use strict';
  function analyticsAllowed() {
    try { return window.Shopify && window.Shopify.customerPrivacy && window.Shopify.customerPrivacy.analyticsProcessingAllowed() === true; }
    catch (e) { return false; }
  }
  window.mguTrack = function (name, data) {
    try {
      document.dispatchEvent(new CustomEvent(name, { detail: data || {} }));
      if (!analyticsAllowed()) return false;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, data || {}));
      return true;
    } catch (e) {}
    return false;
  };
  window.mguTrapFocus = function (container) {
    container.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var els = container.querySelectorAll('button, a[href], input, select, textarea');
      if (!els.length) return;
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  };
})();

/* ---------- 18+-Badge auf Produktkarten (Tag-basiert, opt-in) ---------- */
(function () {
  'use strict';
  var cfg = null;
  function pruefe(handle) {
    return window.__mguFetchProduct(handle).then(function (p) {
      if (!p) return false;
      return (p.tags || []).some(function (t) { return String(t).toLowerCase() === cfg.tag; });
    });
  }
  function markiere(root) {
    if (!cfg) return;
    (root || document).querySelectorAll('.card-wrapper').forEach(function (card) {
      if (card.dataset.mguAgeChecked) return;
      var link = card.querySelector('a[href*="/products/"]');
      var m = link && (link.getAttribute('href') || '').match(/\/products\/([a-z0-9\-_%]+)/i);
      if (!m) return;
      card.dataset.mguAgeChecked = '1';
      var handle = decodeURIComponent(m[1]).split('?')[0];
      pruefe(handle).then(function (hit) {
        if (!hit || card.querySelector('.mgu-age-badge')) return;
        var host = card.querySelector('.card__inner') || card;
        host.classList.add('mgu-anchor');
        var b = document.createElement('span');
        b.className = 'mgu-age-badge';
        b.textContent = cfg.text;
        host.appendChild(b);
      });
    });
  }
  function init() {
    var el = document.querySelector('[data-mgu-alk-badge]');
    if (!el) return;
    cfg = { tag: (el.dataset.tag || 'alkohol').toLowerCase(), text: el.dataset.text || '18+' };
    markiere(document);
    if (!window.__mguObsAuto2) { window.__mguObsAuto2 = true; new MutationObserver(function () { window.__mguScheduleScan(function () { markiere(document); }); }).observe(document.body, { childList: true, subtree: true }); }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();


/* ---------- Generische Produkt-Badges (Tag-basiert, konfigurierbar) ---------- */
(function () {
  'use strict';
  var cfg = null;
  function farbklasse(label) {
    var l = label.toLowerCase();
    if (l.indexOf('vegan') >= 0) return 'mgu-tag-badge--vegan';
    if (l.indexOf('neu') >= 0 || l.indexOf('new') >= 0) return 'mgu-tag-badge--neu';
    if (l.indexOf('bio') >= 0) return 'mgu-tag-badge--bio';
    if (l.indexOf('sale') >= 0 || l.indexOf('angebot') >= 0) return 'mgu-tag-badge--sale';
    return 'mgu-tag-badge--default';
  }
  function daten(handle) {
    return window.__mguFetchProduct(handle).then(function (p) {
      if (!p) return [];
      return (p.tags || []).map(function (t) { return String(t); });
    });
  }
  function markiere(root) {
    if (!cfg) return;
    (root || document).querySelectorAll('.card-wrapper').forEach(function (card) {
      if (card.dataset.mguTagged) return;
      var link = card.querySelector('a[href*="/products/"]');
      var m = link && (link.getAttribute('href') || '').match(/\/products\/([a-z0-9\-_%]+)/i);
      if (!m) return;
      card.dataset.mguTagged = '1';
      var handle = decodeURIComponent(m[1]).split('?')[0];
      daten(handle).then(function (tags) {
        var treffer = [];
        cfg.forEach(function (pair) {
          if (tags.some(function (t) { return t.toLowerCase() === pair.tag; })) treffer.push(pair.label);
        });
        if (!treffer.length) return;
        var host = card.querySelector('.card__inner') || card;
        host.classList.add('mgu-anchor');
        if (host.querySelector('.mgu-tag-badges')) return;
        var wrap = document.createElement('div');
        wrap.className = 'mgu-tag-badges';
        treffer.forEach(function (label) {
          var b = document.createElement('span');
          b.className = 'mgu-tag-badge ' + farbklasse(label);
          b.textContent = label;
          wrap.appendChild(b);
        });
        host.appendChild(wrap);
      });
    });
  }
  function init() {
    var el = document.querySelector('[data-mgu-tag-badges]');
    if (!el) return;
    try { cfg = JSON.parse(el.dataset.pairs || '[]'); } catch (e) { cfg = []; }
    if (!cfg.length) return;
    markiere(document);
    if (!window.__mguObsTagBadge) { window.__mguObsTagBadge = true; new MutationObserver(function () { window.__mguScheduleScan(function () { markiere(document); }); }).observe(document.body, { childList: true, subtree: true }); }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();


/* ---------- Warenkorb-Hinweise: Mindestbestellwert + Steuer/Versand ---------- */
(function () {
  'use strict';
  var cfg = null;
  function money(c) {
    var cur = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
    try { return new Intl.NumberFormat(document.documentElement.lang || 'de', { style: 'currency', currency: cur }).format(c / 100); }
    catch (e) { return (c / 100).toFixed(2) + ' \u20ac'; }
  }
  function update() {
    if (!cfg) return;
    fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
      ['cart-drawer .drawer__inner', '#main-cart-items', 'cart-drawer-items'].forEach(function (sel) {
        var host = document.querySelector(sel);
        if (!host) return;
        var old = host.querySelector('.mgu-cart-hinweis'); if (old) old.remove();
        var teile = [];
        if (cfg.mindestwert > 0 && cart.total_price < cfg.mindestwert) {
          var rest = cfg.mindestwert - cart.total_price;
          teile.push('<b style="color:#B0472B">' + window.__mguEscapeHTML(cfg.mindText.replace('{betrag}', money(rest))) + '</b>');
        }
        if (cfg.text) teile.push('<span>' + window.__mguEscapeHTML(cfg.text) + '</span>');
        if (!teile.length) return;
        host.insertAdjacentHTML('beforeend',
          '<div class="mgu-cart-hinweis mgu" style="margin:10px 14px;padding:10px 14px;border-radius:12px;background:#F3EDDF;font-size:12.5px;color:#22312A;display:flex;flex-direction:column;gap:4px">' + teile.join('') + '</div>');
      });
    }).catch(function () {});
  }
  function init() {
    var el = document.querySelector('[data-mgu-cart-hinweis]');
    if (!el) return;
    cfg = {
      mindestwert: parseInt(el.dataset.mindestwert, 10) * 100 || 0,
      text: el.dataset.text || '',
      mindText: el.dataset.mindText || 'Mindestbestellwert: noch {betrag}'
    };
    update();
    var drawer = document.querySelector('cart-drawer');
    if (drawer) new MutationObserver(function (muts) {
      var selfOnly = muts.every(function (m) {
        return [].every.call(m.addedNodes, window.__mguIsSelfCartNode);
      });
      if (!selfOnly) update();
    }).observe(drawer, { childList: true, subtree: true });
    document.addEventListener('mgu:cart:changed', update);
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
