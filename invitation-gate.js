/* The cover is the only scrollable content until its open button is activated. */
(() => {
  'use strict';
  const root = document.documentElement;
  let locked = true;
  const restoration = window.history.scrollRestoration;
  root.classList.add('invitation-locked');
  window.history.scrollRestoration = 'manual';

  function resetEntry() {
    if (!locked) return;
    // A shared fragment or restored browser position must not bypass the cover.
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  function unlock() {
    if (!locked) return;
    locked = false;
    const main = document.querySelector('main');
    const coverOffset = main.scrollTop || 0;
    const content = document.querySelector('#invitation-content');
    content.removeAttribute('inert');
    content.removeAttribute('aria-hidden');
    root.classList.remove('invitation-locked');
    main.scrollTop = 0;
    window.scrollTo({ top: coverOffset, left: 0, behavior: 'instant' });
    window.history.scrollRestoration = restoration;
    document.querySelector('#open-invitation').setAttribute('aria-expanded', 'true');
    const skip = document.querySelector('.skip-link');
    skip.href = '#names';
    skip.textContent = 'Lewati ke isi undangan';
    document.dispatchEvent(new Event('wedding:unlocked'));
  }
  // The opening film shows one entry control at a time: Buka Tirai, Lewati animasi, Buka Undangan.
  function entryControl() {
    return document.querySelector(':is(#open-curtain, #skip-intro, #open-invitation):not([hidden])')
      || document.querySelector('#open-invitation');
  }
  function ready() {
    if (!locked) return;
    const content = document.querySelector('#invitation-content');
    content.setAttribute('inert', '');
    content.setAttribute('aria-hidden', 'true');
    resetEntry();
  }
  // Capture runs before the existing envelope/music/auto-scroll click handlers.
  document.addEventListener('click', event => {
    if (!locked) return;
    if (event.target.closest?.('#open-invitation')) { unlock(); return; }
    const anchor = event.target.closest?.('a[href^="#"]');
    if (anchor && !['#cover', '#open-curtain', '#skip-intro', '#open-invitation'].includes(anchor.getAttribute('href'))) {
      event.preventDefault();
      entryControl().focus();
    }
  }, true);
  window.addEventListener('hashchange', resetEntry);
  window.addEventListener('pageshow', resetEntry);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
