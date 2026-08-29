(() => {
  const VERSION = '1.0.0';
  const allowed = new Set(['view', 'search', 'product', 'course', 'cart', 'checkout', 'purchase', 'account', 'learning']);
  const personal = /(^|_)(email|phone|name|address|token|password|customer_id|customerid|subject)(_|$)/i;
  const seen = new Set(); const consent = { necessary: true, analytics: false, marketing: false, preferences: false }; const queue = [];
  window.ChelonakiGrowth = Object.freeze({
    version: VERSION,
    consent(next = {}) { for (const key of ['analytics', 'marketing', 'preferences']) consent[key] = next[key] === true; },
    track(event = {}) {
      if (!allowed.has(event.name) || !event.eventId || seen.has(event.eventId)) return false;
      const category = event.category || 'analytics';
      if (category !== 'necessary' && consent[category] !== true) return false;
      if (Object.keys(event.payload || {}).some((key) => personal.test(key))) return false;
      seen.add(event.eventId); queue.push({ version: VERSION, name: event.name, category, occurredAt: new Date().toISOString(), payload: { ...(event.payload || {}) } });
      document.dispatchEvent(new CustomEvent('ch:growth:event', { detail: queue.at(-1) })); return true;
    },
    drain() { return queue.splice(0); }, erase() { queue.splice(0); seen.clear(); },
    debug() { return { consent: { ...consent }, queued: queue.length }; },
  });
  const syncShopifyConsent = () => {
    const privacy = window.Shopify?.customerPrivacy;
    if (!privacy) return;
    window.ChelonakiGrowth.consent({
      analytics: privacy.analyticsProcessingAllowed?.() === true,
      marketing: privacy.marketingAllowed?.() === true,
      preferences: privacy.preferencesProcessingAllowed?.() === true,
    });
  };
  document.addEventListener('ch:consent', (event) => window.ChelonakiGrowth.consent(event.detail));
  document.addEventListener('visitorConsentCollected', syncShopifyConsent);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncShopifyConsent, { once: true });
  else syncShopifyConsent();
})();
