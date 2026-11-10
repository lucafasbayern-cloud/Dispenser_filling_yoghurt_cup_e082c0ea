/* MIYO — menu, scroll reveals and the scroll-scrubbed cup film. */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- menu ---------- */

  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('site-menu');

  if (toggle && menu) {
    let closeTimer = 0;

    const setOpen = (open, returnFocus = false) => {
      window.clearTimeout(closeTimer);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.classList.toggle('is-open', open);

      if (open) {
        menu.hidden = false;
        window.requestAnimationFrame(() => menu.classList.add('is-open'));
      } else {
        menu.classList.remove('is-open');
        closeTimer = window.setTimeout(() => {
          menu.hidden = true;
        }, 220);
      }

      if (returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('pointerdown', (event) => {
      if (
        toggle.getAttribute('aria-expanded') === 'true' &&
        !menu.contains(event.target) &&
        !toggle.contains(event.target)
      ) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false, true);
      }
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });
  }

  /* ---------- section reveals ---------- */

  const reveals = [...document.querySelectorAll('.reveal')];

  if (reveals.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-in'));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-in');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
      );

      reveals.forEach((el) => observer.observe(el));
    }
  }

  /* ---------- scroll film ---------- */

  const stage = document.getElementById('filmStage');
  const canvas = document.getElementById('filmCanvas');

  if (!stage || !canvas) return;

  const FRAME_COUNT = 192;
  const DURATION = 8.043;
  const chapters = [...document.querySelectorAll('#filmChapters .chapter')];
  const N = chapters.length;
  const LAST = N - 1;
  const times = chapters.map((el) => parseFloat(el.dataset.at) || 0);

  const ctx = canvas.getContext('2d');
  const statusText = document.getElementById('filmStatusText');
  const timeEl = document.getElementById('filmTime');
  const cue = document.getElementById('filmCue');
  const fill = document.getElementById('filmFill');
  const railButtons = [...document.querySelectorAll('#filmRail button')];
  const again = document.getElementById('filmAgain');

  const images = new Array(FRAME_COUNT);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const frameSrc = (index) => `frames/f_${String(index + 1).padStart(3, '0')}.webp`;

  let loaded = 0;
  let drawn = -1;
  let stageTop = 0;
  let scrollSpan = 1;
  let active = -1;
  let lastTime = -1;

  /* Load the type first, then a few frames at a time. A cold page should not
     make 192 image requests compete with the webfonts or the preview host. */
  function preloadFrames() {
    const CONCURRENCY = 6;
    const MAX_RETRIES = 2;
    let next = 0;

    const startNext = () => {
      if (next >= FRAME_COUNT) return;
      const i = next++;
      const image = new Image();
      image.decoding = 'async';
      images[i] = image;

      let attempt = 0;
      let settled = false;

      const settle = () => {
        if (settled) return;
        settled = true;
        loaded += 1;
        const pct = Math.round((loaded / FRAME_COUNT) * 100);
        statusText.textContent = loaded === FRAME_COUNT ? 'Live build' : `Loading the cup · ${pct}%`;
        if (i === 0) resize();
        startNext();
      };

      image.onload = settle;
      image.onerror = () => {
        if (settled) return;
        if (attempt < MAX_RETRIES) {
          attempt += 1;
          window.setTimeout(() => {
            image.src = `${frameSrc(i)}?retry=${attempt}`;
          }, 300 * attempt);
        } else {
          settle();
        }
      };

      image.src = frameSrc(i);
    };

    for (let i = 0; i < CONCURRENCY; i++) startNext();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (width !== canvas.width || height !== canvas.height) {
      canvas.width = width;
      canvas.height = height;
      drawn = -1;
    }
  }

  function paint(index) {
    const image = images[index];
    if (!image || !image.naturalWidth || !canvas.width) return;

    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    drawn = index;

    if (!document.body.classList.contains('film-ready')) {
      document.body.classList.add('film-ready');
    }
  }

  function measure() {
    const rect = stage.getBoundingClientRect();
    stageTop = window.scrollY + rect.top;
    scrollSpan = Math.max(stage.offsetHeight - window.innerHeight, 1);
    resize();
  }

  function readProgress() {
    return clamp((window.scrollY - stageTop) / scrollSpan, 0, 1);
  }

  /* Each chapter owns an equal slice of scroll. Inside a slice the clip glides
     from that chapter's timestamp to the next, so titles never outrun the cup. */
  function timeFor(progress) {
    const scaled = clamp(progress, 0, 1) * N;
    const index = Math.min(LAST, Math.floor(scaled));
    const local = scaled - index;
    const from = times[index];
    const to = index === LAST ? DURATION : times[index + 1];
    return clamp(from + (to - from) * local, 0, DURATION);
  }

  function setActive(index) {
    if (index === active) return;
    active = index;

    chapters.forEach((el, i) => {
      const isActive = i === index;
      el.classList.toggle('is-active', isActive);
      el.classList.toggle('is-past', i < index);
      el.setAttribute('aria-hidden', String(!isActive));
    });

    railButtons.forEach((btn, i) => {
      if (i === index) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
  }

  function render(progress) {
    setActive(Math.min(LAST, Math.floor(clamp(progress, 0, 1) * N)));

    const time = timeFor(progress);
    const frame = Math.round((time / DURATION) * (FRAME_COUNT - 1));
    if (frame !== drawn) paint(frame);

    fill.style.transform = `scaleX(${progress})`;

    const second = Math.floor(time);
    if (second !== lastTime) {
      lastTime = second;
      timeEl.textContent = `00:${String(second).padStart(2, '0')} / 00:08`;
    }

    cue.classList.toggle('is-hidden', progress > 0.012);
  }

  let target = 0;
  let current = 0;

  function tick() {
    target = readProgress();
    current = reduceMotion ? target : current + (target - current) * 0.14;
    if (Math.abs(target - current) < 0.0003) current = target;
    render(current);
    window.requestAnimationFrame(tick);
  }

  function goToChapter(index) {
    const top = stageTop + (index / N) * scrollSpan + 2;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  railButtons.forEach((button) => {
    button.addEventListener('click', () => goToChapter(Number(button.dataset.goto)));
  });

  if (again) {
    again.addEventListener('click', () => goToChapter(0));
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measure();
      target = readProgress();
      drawn = -1;
    }, 140);
  });

  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure).catch(() => {});
  }

  measure();
  target = readProgress();
  current = target;
  render(current);
  window.requestAnimationFrame(tick);

  let preloadStarted = false;
  const startPreload = () => {
    if (preloadStarted) return;
    preloadStarted = true;
    preloadFrames();
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(startPreload).catch(startPreload);
    window.setTimeout(startPreload, 1500);
  } else {
    startPreload();
  }
})();
