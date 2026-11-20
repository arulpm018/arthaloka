/* One physical paper strip, with position-based fading owned by its viewport. */
(() => {
  'use strict';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  // Integrated velocity: one-second acceleration/deceleration, steady in between.
  function travel(time, duration) {
    const t = clamp(time, 0, duration), ramp = Math.min(1000, duration / 5);
    if (t < ramp) return t * t / (2 * ramp * (duration - ramp));
    if (t > duration - ramp) return 1 - (duration - t) ** 2 / (2 * ramp * (duration - ramp));
    return (t - ramp / 2) / (duration - ramp);
  }
  const countWords = {
    id: ['Nol', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan'],
    en: ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  };
  window.WeddingGallery = {
    mount({ config = {}, reducedMotion }) {
      const section = document.querySelector('#gallery');
      if (!section || config.enabled === false) { if (section) section.hidden = true; return null; }
      const paper = section.querySelector('.vv-photo-paper');
      const aperture = section.querySelector('.vv-print-window');
      const pauseButton = section.querySelector('[data-gallery-pause]');
      const replayButton = section.querySelector('[data-gallery-replay]');
      const status = section.querySelector('.vv-gallery-status');
      const items = (config.photos || []).map((photo, i) => ({ ...photo, order: Number(photo.order) || i + 1 }))
        .sort((a, b) => a.order - b.order).slice(0, 9);
      // The strip holds the configured photos (up to 9); with none yet, it shows 9 empty frames.
      const photos = Array.from({ length: items.length || 9 }, (_, i) => items[i] || { order: i + 1, src: '', alt: `Foto ${i + 1}` });
      const countId = countWords.id[photos.length], countEn = countWords.en[photos.length];
      const momentsId = `${countId} momen, satu cerita. Gulir untuk melihat semuanya.`;
      const viewer = window.WeddingPhotoViewer?.mount({ photos });
      const duration = clamp(Number(config.durationMs) || 28000, 20000, 45000);
      const maskSupported = window.CSS?.supports?.('mask-image', 'linear-gradient(#000,transparent)') ||
        window.CSS?.supports?.('-webkit-mask-image', 'linear-gradient(#000,transparent)');
      const canAnimate = !!(maskSupported && window.requestAnimationFrame);
      let elapsed = 0, frame = 0, lastTime = null, visible = false, userPaused = false, viewerOpen = false;
      let ready = false, finished = false, metrics = { start: 0, end: 0, photoHeight: 0 };
      let restarting = false, resetElapsed = 0, resetPhase = 'out';
      // A ~2 s camera flash precedes every print run; photos then announce themselves as they emerge.
      const FLASH_MS = 2000;
      let flashed = false, flashTimer = 0, emerged = 0, printing = 0, moving = false;
      let enhanced = canAnimate && !reducedMotion.matches;
      let failed = 0, imageCount = 0;

      section.hidden = false;
      section.classList.toggle('vv-gallery-enhanced', enhanced);
      paper.replaceChildren();
      paper.setAttribute('aria-label', `${countId} foto kenangan, sesuai urutan pengiriman`);
      section.setAttribute('aria-busy', 'true');
      status.textContent = 'Menyiapkan momen kita…';
      const safeSource = value => {
        if (typeof value !== 'string' || !value.trim()) return '';
        try { const url = new URL(value, window.location.href); return /^https?:$/.test(url.protocol) ? url.href : ''; }
        catch { return ''; }
      };
      const loading = photos.map((photo, i) => {
        const row = document.createElement('li'); row.className = 'vv-shot'; row.dataset.photoOrder = String(i + 1);
        const figure = document.createElement('figure');
        const box = document.createElement('button'); box.className = 'vv-photo'; box.type = 'button'; box.disabled = true;
        box.setAttribute('aria-label', `Buka foto ${i + 1} layar penuh: ${photo.alt || 'Momen kami'}`);
        box.setAttribute('aria-haspopup', 'dialog'); box.setAttribute('aria-controls', 'gallery-lightbox');
        const placeholder = document.createElement('div'); placeholder.className = 'vv-photo-placeholder';
        placeholder.textContent = `Foto ${i + 1}`;
        const caption = document.createElement('figcaption'); caption.className = 'vv-photo-description';
        caption.textContent = `Foto ${i + 1} — ${photo.alt || 'Momen kami'}`;
        box.append(placeholder); figure.append(box, caption); row.append(figure); paper.append(row);
        const src = safeSource(photo.src);
        if (!src) return Promise.resolve();
        box.addEventListener('click', () => {
          if (viewer) viewer.open(i, box);
          else window.open(src, '_blank', 'noopener,noreferrer');
        });
        imageCount++;
        const img = document.createElement('img'); img.alt = photo.alt || `Momen kami, foto ${i + 1}`;
        img.width = Number(photo.width) || 1200; img.height = Number(photo.height) || 800;
        img.loading = 'eager'; img.decoding = 'async'; img.setAttribute('fetchpriority', 'low');
        img.style.objectFit = photo.fit === 'cover' ? 'cover' : 'contain';
        const focus = photo.focus || [50, 50];
        img.style.objectPosition = `${clamp(Number(focus[0]) || 0, 0, 100)}% ${clamp(Number(focus[1]) || 0, 0, 100)}%`;
        box.append(img);
        return new Promise(resolve => {
          let settled = false;
          function settle(ok) {
            if (settled) return; settled = true;
            if (ok) { row.classList.add('has-image'); box.disabled = false; }
            else { failed++; img.remove(); const note = document.createElement('small'); note.textContent = 'Foto belum dapat dimuat'; placeholder.append(note); }
            resolve();
          }
          async function loaded() {
            try { if (img.decode) await img.decode(); } catch { /* A loaded image can still be painted if decode rejects. */ }
            settle(img.naturalWidth > 0);
          }
          img.addEventListener('load', loaded, { once: true });
          img.addEventListener('error', () => settle(false), { once: true });
          img.src = src;
          if (img.complete) { if (img.naturalWidth > 0) loaded(); else settle(false); }
        });
      });

      function measure() {
        if (!enhanced) return;
        const first = paper.querySelector('.vv-photo');
        const height = first?.getBoundingClientRect().height || 0;
        const total = paper.offsetHeight;
        if (!height || !total) return;
        section.style.setProperty('--vv-photo-height', `${height}px`);
        // Stop with the leading paper edge still beneath the printer lip.
        // A positive end translation would detach the last photo from the slot.
        metrics = { start: -total, end: 0, photoHeight: height };
        render();
      }
      function render(announce = false) {
        if (!enhanced) return;
        const y = metrics.start + (metrics.end - metrics.start) * travel(elapsed, duration);
        paper.style.transform = `translate3d(0,${y.toFixed(3)}px,0)`;
        // Keyboard users can reach the photos currently clear of the printer/fade.
        let out = 0, feeding = 0;
        paper.querySelectorAll('.vv-shot').forEach(row => {
          const top = y + row.offsetTop;
          if (top >= -2) out++;
          if (top + metrics.photoHeight > 2) feeding++;
          const clear = top >= 0 && top + metrics.photoHeight <= (aperture.clientHeight || metrics.photoHeight * 2.8) * .72;
          row.querySelector('.vv-photo').tabIndex = clear ? 0 : -1;
        });
        // A photo whose edge leaves the slot starts printing; fully out, it is a new memory on screen.
        if (announce && feeding > printing) {
          section.dispatchEvent(new CustomEvent('wedding:gallery-print', { bubbles: true, detail: { index: feeding - 1, total: photos.length } }));
        }
        if (announce && out > emerged) {
          section.dispatchEvent(new CustomEvent('wedding:gallery-photo', { bubbles: true, detail: { index: out - 1, total: photos.length } }));
        }
        emerged = out; printing = feeding;
      }
      // Tells listeners (sound) whether the paper is physically moving right now.
      function setMoving(on) {
        if (on === moving) return;
        moving = on;
        section.dispatchEvent(new CustomEvent('wedding:gallery-feed', { bubbles: true, detail: { active: on } }));
      }
      function flash() {
        if (flashTimer) return;
        const camera = section.querySelector('.vv-printer');
        const box = section.getBoundingClientRect(), cam = camera?.getBoundingClientRect();
        // Light the whole scene from the camera's flash window (70% / 28% of the art).
        if (cam) {
          section.style.setProperty('--vv-flash-x', `${(cam.left - box.left + cam.width * .698).toFixed(1)}px`);
          section.style.setProperty('--vv-flash-y', `${(cam.top - box.top + cam.height * .278).toFixed(1)}px`);
        }
        section.classList.remove('vv-flashing'); void section.offsetWidth; section.classList.add('vv-flashing');
        status.textContent = 'Senyum… cekrek!';
        section.dispatchEvent(new CustomEvent('wedding:gallery-flash', { bubbles: true, detail: { duration: FLASH_MS } }));
        flashTimer = window.setTimeout(() => {
          flashTimer = 0; flashed = true; section.classList.remove('vv-flashing');
          if (!userPaused && !finished) status.textContent = 'A few moments, a lifetime of meaning.';
          reconcile();
        }, FLASH_MS);
      }
      function stop() { if (frame) window.cancelAnimationFrame(frame); frame = 0; lastTime = null; setMoving(false); }
      function syncControls() {
        pauseButton.hidden = !enhanced || !ready || finished;
        replayButton.hidden = !enhanced || !finished;
        pauseButton.querySelector('span').textContent = userPaused ? 'Lanjutkan' : 'Jeda';
        pauseButton.setAttribute('aria-label', userPaused ? 'Lanjutkan cetak foto' : 'Jeda cetak foto');
        pauseButton.setAttribute('aria-pressed', String(userPaused));
        pauseButton.querySelector('svg').innerHTML = userPaused ? '<path d="m8 5 11 7-11 7Z"/>' : '<path d="M8 5v14M16 5v14"/>';
      }
      function eligible() {
        return enhanced && ready && visible && !userPaused && !viewerOpen && !document.hidden &&
          !document.documentElement.classList.contains('invitation-locked') && (!finished || restarting);
      }
      function tick(now) {
        frame = 0;
        if (!eligible()) { lastTime = null; setMoving(false); return; }
        const delta = lastTime === null ? 0 : Math.max(0, Math.min(100, now - lastTime));
        lastTime = now;
        if (restarting) {
          resetElapsed += delta;
          const progress = Math.min(1, resetElapsed / 350);
          paper.style.opacity = String(resetPhase === 'out' ? 1 - progress : progress);
          if (progress === 1 && resetPhase === 'out') {
            elapsed = 0; render(); resetElapsed = 0; resetPhase = 'in';
          } else if (progress === 1) {
            // Fresh strip is back inside the camera: flash again before printing.
            restarting = false; paper.style.removeProperty('opacity');
            flashed = false; emerged = 0; printing = 0; stop(); reconcile(); return;
          }
        } else {
          elapsed = Math.min(duration, elapsed + delta); render(true); setMoving(elapsed < duration);
          if (elapsed === duration) {
            finished = true; stop(); syncControls();
            status.textContent = failed ? 'Rangkaian selesai. Beberapa foto belum dapat dimuat.' :
              `${countEn} ${photos.length === 1 ? 'moment' : 'moments'}. One beautiful story.`;
            section.dispatchEvent(new CustomEvent('wedding:gallery-finished', { bubbles: true }));
            return;
          }
        }
        frame = window.requestAnimationFrame(tick);
      }
      function reconcile() {
        if (eligible()) {
          measure();
          if (!flashed) { flash(); return; }
          if (metrics.photoHeight && !frame) frame = window.requestAnimationFrame(tick);
        }
        else stop();
      }
      function checkVisibility() {
        const rect = aperture.getBoundingClientRect();
        const height = rect.height || 1;
        const intersection = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        visible = intersection / Math.min(height, window.innerHeight) >= .6;
        reconcile();
      }
      let observer;
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          const entry = entries.find(item => item.target === aperture);
          if (!entry) return;
          visible = entry.isIntersecting && entry.intersectionRatio >= .55;
          reconcile();
        }, { threshold: [0, .25, .55, .75, 1] });
        observer.observe(aperture);
      } else {
        window.addEventListener('scroll', checkVisibility, { passive: true });
      }
      pauseButton.addEventListener('click', () => {
        userPaused = !userPaused;
        status.textContent = userPaused ? 'Momen ini boleh dinikmati lebih lama.' : 'A few moments, a lifetime of meaning.';
        syncControls(); reconcile();
      });
      replayButton.addEventListener('click', () => {
        if (!enhanced || !ready) return;
        finished = false; userPaused = false; restarting = true; resetPhase = 'out'; resetElapsed = 0;
        status.textContent = 'Mengulang momen kita…'; syncControls();
        pauseButton.focus({ preventScroll: true }); reconcile();
      });
      document.addEventListener('visibilitychange', reconcile);
      document.addEventListener('wedding:lightbox-change', event => {
        viewerOpen = !!event.detail?.open; reconcile();
      });
      window.addEventListener('pagehide', stop);
      window.addEventListener('pageshow', () => { measure(); checkVisibility(); });
      document.addEventListener('wedding:unlocked', () => { measure(); checkVisibility(); });
      window.addEventListener('resize', () => { measure(); checkVisibility(); }, { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); reconcile(); }).observe(paper);
      reducedMotion.addEventListener('change', () => {
        stop(); enhanced = canAnimate && !reducedMotion.matches;
        section.classList.toggle('vv-gallery-enhanced', enhanced);
        paper.style.removeProperty('transform'); paper.style.removeProperty('opacity');
        restarting = false;
        if (!enhanced) paper.querySelectorAll('.vv-photo').forEach(button => { button.tabIndex = 0; });
        if (enhanced) { measure(); render(); }
        status.textContent = enhanced ? 'A few moments, a lifetime of meaning.' : momentsId;
        syncControls(); checkVisibility();
      });
      measure(); syncControls();
      const loaded = Promise.all(loading).then(() => {
        ready = true; section.removeAttribute('aria-busy'); section.classList.add('vv-gallery-ready');
        status.textContent = failed ? `${failed} foto belum dapat dimuat. Rangkaian tetap dapat dilihat.` :
          !enhanced ? momentsId :
          imageCount ? 'A few moments, a lifetime of meaning.' : `${countId} tempat untuk cerita kita.`;
        measure(); syncControls(); if (!observer) checkVisibility(); else reconcile();
      });
      return { loaded, pause: () => { userPaused = true; syncControls(); reconcile(); },
        get state() { return { elapsed, duration, ready, finished, visible, userPaused, viewerOpen, enhanced, restarting, metrics: { ...metrics } }; } };
    }
  };
})();
