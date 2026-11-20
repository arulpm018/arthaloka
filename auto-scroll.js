/* User-controlled reading tour; no external animation library. */
(() => {
  'use strict';
  window.WeddingAutoScroll = {
    mount({ config = {}, reducedMotion }) {
      const button = document.querySelector('#auto-scroll-toggle');
      const label = button.querySelector('span');
      const enabled = config.enabled !== false;
      const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
      const transitionMs = clamp(Number(config.transitionMs) || 1500, 900, 4000);
      const speed = clamp(Number(config.pixelsPerSecond) || 110, 40, 160);
      const TAIL = 110; // px: a scene's bottom padding plus the 20px margin endOf() adds
      let running = false, armed = false, opened = false, completed = false;
      let timer = 0, frame = 0, index = 0, generation = 0, scenes = [];
      let viewportWidth = window.innerWidth;
      let scrollPort = null, coverShown = false;

      function findScrollPort() {
        let node = document.querySelector('#invitation-content');
        while (node && node !== document.body && node !== document.documentElement) {
          if (node.scrollHeight > node.clientHeight + 2 && /auto|scroll/.test(window.getComputedStyle?.(node).overflowY || '')) return node;
          node = node.parentElement;
        }
        return null;
      }
      const viewport = () => scrollPort ? scrollPort.clientHeight : window.innerHeight;
      const position = () => scrollPort ? scrollPort.scrollTop : (document.scrollingElement?.scrollTop ?? window.scrollY ?? 0);
      const maxScroll = () => Math.max(0, (scrollPort ? scrollPort.scrollHeight : Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0, document.scrollingElement?.scrollHeight || 0)) - viewport());
      const portTop = () => scrollPort ? scrollPort.getBoundingClientRect().top + (scrollPort.clientTop || 0) : 0;
      const topOf = scene => clamp(scene.getBoundingClientRect().top - portTop() + position() - 20, 0, maxScroll());
      const endOf = scene => clamp(scene.getBoundingClientRect().bottom - portTop() + position() - viewport() + 20, topOf(scene), maxScroll());
      const dwell = scene => clamp(Number(config.pauses?.[scene.id]) || 3000, 1200, 15000);
      function setPosition(top) {
        if (scrollPort) scrollPort.scrollTop = top;
        else {
          window.scrollTo({ top, behavior: 'instant' });
          // Some embedded renderers expose the document scroller instead of window scrolling.
          if (Math.abs(position() - top) > 2 && document.scrollingElement) document.scrollingElement.scrollTop = top;
        }
      }
      function sync() {
        // The cover has its own open button; an idle tour control would sit on its last line.
        button.hidden = !enabled || !opened || (coverShown && !running);
        button.setAttribute('aria-pressed', String(running));
        const text = running ? 'Jeda scroll' : completed ? 'Putar ulang' : 'Lanjut scroll';
        label.textContent = text;
        button.setAttribute('aria-label', running ? 'Jeda scroll otomatis' : completed ? 'Putar ulang undangan otomatis' : 'Lanjutkan scroll otomatis');
        document.documentElement.classList.toggle('vv-auto-scrolling', running);
      }
      function pause() {
        running = false; armed = false; generation++;
        clearTimeout(timer); cancelAnimationFrame(frame);
        timer = 0; frame = 0;
        sync();
      }
      function wait(ms, next) {
        clearTimeout(timer);
        const run = generation;
        timer = setTimeout(() => { timer = 0; if (running && run === generation) next(); }, ms);
      }
      function moveTo(destination, duration, next) {
        const from = position(), distance = destination - from, run = generation;
        if (Math.abs(distance) < 2) { next(); return; }
        // Preserve the reading tour with discrete steps when motion is reduced.
        if (reducedMotion.matches) { setPosition(destination); next(); return; }
        let started;
        function tick(now) {
          if (!running || run !== generation) return;
          if (started === undefined) started = now;
          const t = Math.min(1, (now - started) / duration);
          const ease = t * t * (3 - 2 * t);
          setPosition(clamp(from + distance * ease, 0, maxScroll()));
          if (t < 1) frame = requestAnimationFrame(tick);
          else { frame = 0; next(); }
        }
        frame = requestAnimationFrame(tick);
      }
      // A move between scenes takes transitionMs for a full screen and proportionally less for a
      // shorter hop, so a small correction never crawls.
      function glide(destination, next) {
        const share = Math.abs(destination - position()) / Math.max(1, viewport());
        moveTo(destination, clamp(share * transitionMs, 350, transitionMs), next);
      }
      function arrived() {
        // Stop at the form until the visitor explicitly chooses to continue (it closes after the wedding).
        if (scenes[index].id === 'rsvp' && !scenes[index].querySelector('#rsvp-form')?.hidden) { pause(); return; }
        // The photobooth stays still while its paper prints.
        if (scenes[index].dataset.autoScrollStop === 'true') {
          if (index === scenes.length - 1) { completed = true; pause(); return; }
          holdForPrint(scenes[index]); return;
        }
        wait(dwell(scenes[index]), advance);
      }
      // A photobooth mid-tour: bring its whole print window into view, wait for
      // the strip to finish, then read on. A still (non-animated) strip just dwells.
      function holdForPrint(scene) {
        const frameEl = scene.querySelector('.vv-print-window') || scene;
        const rect = frameEl.getBoundingClientRect();
        const overflow = rect.bottom - portTop() - viewport() + 24;
        const destination = overflow > 0 ? clamp(position() + Math.min(overflow, rect.top - portTop() - 20), 0, maxScroll()) : position();
        const run = generation;
        glide(destination, () => {
          const printing = scene.classList.contains('vv-gallery-enhanced') && scene.querySelector('[data-gallery-replay]')?.hidden !== false;
          if (!printing) { wait(dwell(scene), advance); return; }
          scene.addEventListener('wedding:gallery-finished', () => {
            if (running && run === generation) wait(dwell(scene), advance);
          }, { once: true });
        });
      }
      function advance() {
        if (!running) return;
        const rest = endOf(scenes[index]) - position();
        // A tall card is read in one even glide down to its foot. A tail no taller than the
        // scene's own bottom padding holds nothing to read, so it is not worth a separate nudge.
        if (rest > TAIL) {
          moveTo(position() + rest, clamp(rest / speed * 1000, 900, 30000), () => wait(900, advance));
        } else if (index < scenes.length - 1) {
          index++;
          glide(topOf(scenes[index]), arrived);
        } else {
          completed = true;
          pause();
        }
      }
      function start() {
        if (!enabled || document.hidden || running) return;
        scrollPort = findScrollPort();
        scenes = Array.from(document.querySelectorAll('#invitation-content > .scene')).filter(scene => !scene.hidden);
        if (!scenes.length) return;
        opened = true;
        const replay = completed;
        completed = false; generation++; running = true;
        index = 0;
        if (!replay) {
          scenes.forEach((scene, i) => { if (topOf(scene) <= position() + 50) index = i; });
        }
        sync();
        if (replay || position() < topOf(scenes[index]) - 4) glide(topOf(scenes[index]), arrived);
        else if (scenes[index].dataset.autoScrollStop === 'true') arrived();
        else wait(dwell(scenes[index]), advance);
      }
      function prepare() {
        pause(); completed = false; armed = enabled; sync();
      }
      function afterOpening() {
        opened = true;
        const shouldStart = armed;
        armed = false;
        sync();
        if (shouldStart) start();
      }
      button.addEventListener('click', () => running ? pause() : start());
      const isControl = target => target?.closest?.('#auto-scroll-toggle, #open-curtain, #skip-intro, #open-invitation, #skip-animation, #music-toggle');
      const interrupt = event => { if (running && !isControl(event.target)) pause(); };
      window.addEventListener('wheel', pause, { passive: true });
      window.addEventListener('touchstart', interrupt, { passive: true });
      window.addEventListener('touchmove', event => { if (!isControl(event.target)) pause(); }, { passive: true });
      document.addEventListener('pointerdown', interrupt, { passive: true });
      document.addEventListener('focusin', event => {
        if (event.target.matches?.('input, textarea, select, [contenteditable="true"]')) pause();
      });
      document.addEventListener('click', event => {
        if (event.target.closest?.('a[href], #gallery button')) pause();
      });
      document.addEventListener('keydown', event => {
        if (!isControl(event.target) && ['Tab', 'Escape', ' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) pause();
      });
      document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
      window.addEventListener('pagehide', pause);
      window.addEventListener('resize', () => {
        // Mobile address bars change viewport height while scrolling.
        // Only a width/orientation change requires the visitor to resume.
        if (running && Math.abs(window.innerWidth - viewportWidth) > 80) pause();
        viewportWidth = window.innerWidth;
      });
      reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) pause(); else sync(); });
      const cover = document.querySelector('#cover');
      if (cover && 'IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          coverShown = entry.intersectionRect.height > window.innerHeight * .5;
          sync();
        }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) }).observe(cover);
      }
      sync();
      return { prepare, afterOpening, pause, get running() { return running; } };
    }
  };
})();
