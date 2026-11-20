/* Front curtain on the cover: closed until "Buka Tirai", then parts on the opening film.
   Without the film (intro-video.js unavailable) the first "Buka Undangan" parts it instead. */
(() => {
  'use strict';
  window.WeddingCurtain = {
    mount({ reducedMotion }) {
      const cover = document.querySelector('#cover');
      const curtain = cover?.querySelector('.theatre-curtain');
      const buttons = document.querySelectorAll('#open-curtain, #open-invitation');
      if (!curtain || !buttons.length) return null;
      let parted = false;
      // invitation-gate.js unlocks in the capture phase of a "Buka Undangan" click, before this
      // listener runs, so adding is-parting here keeps the curtain on screen without a flash.
      function part(event) {
        if (parted) return;
        parted = true;
        curtain.classList.add('is-parting');
        if (event.currentTarget.id === 'open-invitation') {
          // Hold the compact first-screen layout until the copy has faded (0.4 s), so the name
          // and button never jump; the envelope regains its space behind the barely-open curtain.
          cover.classList.add('cover-compact');
          setTimeout(() => cover.classList.remove('cover-compact'), 420);
        }
        setTimeout(() => { curtain.classList.remove('is-parting'); curtain.hidden = true; }, reducedMotion.matches ? 450 : 2400);
      }
      buttons.forEach(button => button.addEventListener('click', part));
      return { get parted() { return parted; } };
    }
  };
})();
