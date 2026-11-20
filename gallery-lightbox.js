/* Full-screen photo viewer. Kept outside the printer's clipped animation layer. */
(() => {
  'use strict';
  window.WeddingPhotoViewer = {
    mount({ photos }) {
      const dialog = document.querySelector('#gallery-lightbox');
      if (!dialog || typeof dialog.showModal !== 'function') return null;
      const image = dialog.querySelector('img');
      const caption = dialog.querySelector('figcaption');
      const status = dialog.querySelector('[data-viewer-status]');
      const count = dialog.querySelector('[data-viewer-count]');
      const closeButton = dialog.querySelector('[data-viewer-close]');
      const prev = dialog.querySelector('[data-viewer-prev]');
      const next = dialog.querySelector('[data-viewer-next]');
      let index = 0, trigger = null, touchStart = null, open = false;
      const safeSource = value => {
        if (typeof value !== 'string' || !value.trim()) return '';
        try { const url = new URL(value, window.location.href); return /^https?:$/.test(url.protocol) ? url.href : ''; }
        catch { return ''; }
      };
      function announce(value) {
        document.dispatchEvent(new CustomEvent('wedding:lightbox-change', { detail: { open: value } }));
      }
      function showPhoto(position) {
        index = Math.max(0, Math.min(photos.length - 1, position));
        const photo = photos[index];
        image.style.opacity = '0'; image.hidden = false;
        image.alt = photo.alt || `Foto ${index + 1}`;
        caption.textContent = photo.alt || `Momen kami, foto ${index + 1}`;
        count.textContent = `${index + 1} / ${photos.length}`;
        prev.disabled = index === 0; next.disabled = index === photos.length - 1;
        status.textContent = 'Memuat foto…';
        const done = () => { status.textContent = ''; image.style.opacity = '1'; };
        image.onload = done;
        image.onerror = () => { image.hidden = true; status.textContent = 'Foto belum dapat dimuat. Silakan pilih foto lainnya.'; };
        image.src = safeSource(photo.fullSrc) || safeSource(photo.src);
        if (image.complete && image.naturalWidth) done();
      }
      function close() { if (dialog.open) dialog.close(); }
      closeButton.addEventListener('click', close);
      prev.addEventListener('click', () => showPhoto(index - 1));
      next.addEventListener('click', () => showPhoto(index + 1));
      dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
      dialog.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault(); showPhoto(index + (event.key === 'ArrowRight' ? 1 : -1));
        }
      });
      dialog.addEventListener('touchstart', event => {
        const touch = event.touches[0]; touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }, { passive: true });
      dialog.addEventListener('touchend', event => {
        const touch = event.changedTouches[0];
        if (touchStart && touch) {
          const dx = touch.clientX - touchStart.x, dy = touch.clientY - touchStart.y;
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) showPhoto(index + (dx < 0 ? 1 : -1));
        }
        touchStart = null;
      }, { passive: true });
      dialog.addEventListener('close', () => {
        if (!open) return; open = false;
        document.documentElement.classList.remove('vv-photo-viewer-open');
        // Resume the printer only after returning focus to its stationary photo.
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
        announce(false);
      });
      return {
        open(position, source) {
          if (!safeSource(photos[position]?.src || '')) return;
          trigger = source; showPhoto(position);
          if (!dialog.open) {
            dialog.showModal(); open = true;
            document.documentElement.classList.add('vv-photo-viewer-open');
            announce(true); closeButton.focus({ preventScroll: true });
          }
        }
      };
    }
  };
})();
