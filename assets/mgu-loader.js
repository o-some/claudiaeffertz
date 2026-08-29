(() => {
  const loader = document.currentScript;
  let loading = null;

  const stylesheet = (href, key) => {
    if (!href || document.querySelector(`link[data-mgu-asset="${key}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.mguAsset = key;
    document.head.append(link);
  };

  const script = (src, key) => new Promise((resolve, reject) => {
    if (!src || document.querySelector(`script[data-mgu-asset="${key}"]`)) return resolve();
    const element = document.createElement('script');
    element.src = src;
    element.defer = true;
    element.dataset.mguAsset = key;
    element.addEventListener('load', resolve, { once: true });
    element.addEventListener('error', reject, { once: true });
    document.head.append(element);
  });

  const load = () => {
    if (!document.querySelector('.mgu, [data-mgu-effect], [data-mgu-popup]')) return Promise.resolve();
    if (loading) return loading;
    stylesheet(loader?.dataset.mguLandingCss, 'landing-css');
    stylesheet(loader?.dataset.mguFeaturesCss, 'features-css');
    loading = Promise.all([
      script(loader?.dataset.mguLandingJs, 'landing-js'),
      script(loader?.dataset.mguFeaturesJs, 'features-js'),
    ]).catch((error) => {
      loading = null;
      document.dispatchEvent(new CustomEvent('mgu:assets:error', { detail: { message: error.message } }));
    });
    return loading;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
  document.addEventListener('shopify:section:load', load);
})();
