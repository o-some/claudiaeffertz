(() => {
  const journeys = [...document.querySelectorAll('[data-bridge-journey]')];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowScreen = matchMedia('(max-width: 700px)');
  if (!journeys.length || reduceMotion.matches || navigator.connection?.saveData || !('IntersectionObserver' in window)) return;
  const filenames = {
    '00': '00_zur_qualifikation',
    '01': '01_zum_buch',
    '02': '02_zum_podcast',
    '03': '03_vor_kontakt'
  };

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const states = journeys.map((section) => {
    const video = section.querySelector('video');
    const stage = section.querySelector('.bridge-journey__stage');
    const state = { section, stage, video, progress: 0, loaded: false, failed: false };
    section.classList.add('is-scroll-enabled');

    const seekToLatest = () => {
      if (!state.loaded || state.failed || video.seeking || !Number.isFinite(video.duration)) return;
      const target = state.progress * Math.max(0, video.duration - 1 / 24);
      if (Math.abs(video.currentTime - target) < 1 / 24) {
        if (video.readyState >= 2) section.classList.add('is-video-ready');
        return;
      }
      try { video.currentTime = target; } catch { /* Poster bleibt sichtbar. */ }
    };

    video.addEventListener('loadedmetadata', () => {
      state.loaded = true;
      seekToLatest();
    });
    video.addEventListener('loadeddata', seekToLatest);
    video.addEventListener('seeked', seekToLatest);
    video.addEventListener('error', () => {
      state.failed = true;
      section.classList.remove('is-scroll-enabled', 'is-video-ready');
      section.classList.add('is-static-fallback');
    });
    state.seekToLatest = seekToLatest;
    return state;
  });

  let frame = 0;
  const update = () => {
    frame = 0;
    for (const state of states) {
      const rect = state.section.getBoundingClientRect();
      const travel = Math.max(1, state.section.offsetHeight - state.stage.offsetHeight);
      state.progress = clamp(-rect.top / travel);
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      state.seekToLatest();
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

  const loadNear = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const state = states.find(({ section }) => section === entry.target);
      if (!state || state.video.src) continue;
      const size = narrowScreen.matches ? 'mobil' : 'desktop';
      state.video.src = `media/${size}/${filenames[state.section.dataset.clip]}.mp4`;
      state.video.preload = 'auto';
      state.video.load();
      loadNear.unobserve(entry.target);
    }
  }, { rootMargin: '100% 0px' });

  states.forEach(({ section }) => loadNear.observe(section));
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  narrowScreen.addEventListener('change', () => {
    for (const state of states) {
      if (!state.video.src) continue;
      state.loaded = false;
      state.section.classList.remove('is-video-ready');
      const size = narrowScreen.matches ? 'mobil' : 'desktop';
      state.video.src = `media/${size}/${filenames[state.section.dataset.clip]}.mp4`;
      state.video.load();
    }
    schedule();
  });
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) {
      for (const state of states) {
        state.section.classList.remove('is-scroll-enabled', 'is-video-ready');
        state.video.pause();
      }
    } else {
      for (const state of states) if (!state.failed) state.section.classList.add('is-scroll-enabled');
      schedule();
    }
  });
  schedule();
})();
