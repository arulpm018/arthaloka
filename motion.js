/* CSS owns every animation. Native observers only toggle visibility classes. */
(() => {
  'use strict';
  window.WeddingMotion = {
    mount({ reducedMotion, onOpen, onOpened = () => {}, onCancel = () => {}, skipOpening = () => false }) {
      const cover = document.querySelector('#cover');
      const target = document.querySelector('#names');
      const button = document.querySelector('#open-invitation');
      const skip = document.querySelector('#skip-animation');
      let openingTimer, resetTimer, active = false;

      function resetCover() {
        cover.classList.remove('is-opening');
        cover.classList.add('opening-done');
        button.disabled = false;
        cover.removeAttribute('aria-busy');
      }
      function finish(navigate = true) {
        if (!active) return;
        active = false;
        clearTimeout(openingTimer);
        skip.hidden = true;
        if (navigate) {
          target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
          const heading = document.querySelector('#names-title');
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
          // Keep the card in its final pose while the next scene enters.
          resetTimer = setTimeout(() => { resetCover(); onOpened(); }, reducedMotion.matches ? 100 : 1200);
        } else {
          // User-directed scrolling never triggers another automatic navigation.
          resetCover();
          onCancel();
        }
      }
      function open() {
        if (active) return;
        clearTimeout(resetTimer);
        if (skipOpening()) {
          // The opening film already ended on the envelope: go straight to the names scene.
          active = true;
          button.disabled = true;
          onOpen();
          finish();
          return;
        }
        // Reset the CSS timeline so the cover can be opened again from its anchor.
        cover.classList.remove('is-opening', 'opening-done');
        void cover.offsetWidth;
        active = true;
        button.disabled = true;
        cover.setAttribute('aria-busy', 'true');
        cover.classList.add('is-opening');
        skip.hidden = false;
        onOpen();
        // Reveal the existing burgundy portrait card before continuing to names.
        // Preserve the full portrait-card moment before entering Slide 2.
        openingTimer = setTimeout(() => finish(), reducedMotion.matches ? 1600 : 7150);
      }

      skip.addEventListener('click', () => finish());
      button.addEventListener('click', open);
      window.addEventListener('wheel', () => finish(false), { passive: true });
      window.addEventListener('touchmove', () => finish(false), { passive: true });
      document.addEventListener('keydown', event => {
        if (!active) return;
        if (event.key === 'Escape') finish();
        else if (['ArrowDown', 'PageDown', 'End', ' '].includes(event.key)) finish(false);
      });
      document.addEventListener('click', event => {
        if (event.target.closest?.('a[href^="#"]')) finish(false);
      });

      const details = Array.from(document.querySelectorAll('[data-vv-motion]'));
      let detailObserver;
      if ('IntersectionObserver' in window) {
        detailObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if(entry.target.dataset.vvOnce === 'true' && entry.target.classList.contains('motion-visible')) return;
            entry.target.classList.toggle('motion-visible', entry.isIntersecting || reducedMotion.matches);
          });
        }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
        details.forEach(node => detailObserver.observe(node));
        document.documentElement.classList.add('vv-motion-ready');
      } else {
        details.forEach(node => node.classList.add('motion-visible'));
      }
      function revealFrame(node, visible = true) {
        node.classList.toggle('is-visible', visible || reducedMotion.matches);
      }
      function visibility(scene, visible) {
        scene.classList.toggle('motion-paused', !visible);
      }
      reducedMotion.addEventListener('change', () => {
        if (!reducedMotion.matches) return;
        finish();
        document.querySelectorAll('.reveal').forEach(node => node.classList.add('is-visible'));
        details.forEach(node => node.classList.add('motion-visible'));
      });
      document.addEventListener('visibilitychange', () => {
        document.documentElement.classList.toggle('motion-suspended', document.hidden);
        if (document.hidden) finish(false);
      });
      return { finish, revealFrame, visibility, get active() { return active; } };
    }
  };
})();
