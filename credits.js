/* End credits: a slow film-style roll the guest can also scroll, then the curtain closes with a
   thank-you. */
(() => {
  'use strict';
  const SPEED = 42; // px per second, a calm credits pace
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  window.WeddingCredits = {
    mount({ config = {}, bride, groom, monogram, dateLabel, guest, reducedMotion, after = false }) {
      const section = document.querySelector('#credits');
      if (!section || config.enabled === false) { if (section) section.hidden = true; return null; }
      const screen = section.querySelector('.credits-screen'), roll = section.querySelector('.credits-roll');
      const toggle = section.querySelector('#credits-toggle'), curtain = section.querySelector('.curtain-call');
      const reopen = section.querySelector('#credits-reopen');
      section.hidden = false;

      // ---- Roll content, all from wedding-config.js ----
      const block = (...children) => { const div = node('div', 'credits-block'); div.append(...children); return div; };
      const person = (label, data, child) => block(
        node('p', 'credits-label', label), node('p', 'credits-name', data.fullName),
        node('p', 'credits-note', `${child} ${data.childOrder} dari Bapak ${data.father} & Ibu ${data.mother}`));
      const list = items => { const ul = node('ul', 'credits-list'); ul.append(...items); return ul; };
      const blocks = [
        block(node('p', 'credits-label', 'A Love Story'), node('p', 'credits-title', `${bride.nickname} & ${groom.nickname}`), node('p', 'credits-date', dateLabel)),
        person(bride.title || 'Mempelai Wanita', bride, 'Putri'),
        person(groom.title || 'Mempelai Pria', groom, 'Putra')
      ];
      const inviters = (config.inviters || []).filter(group => group?.names?.length);
      if (inviters.length) {
        blocks.push(block(node('p', 'credits-label', 'Turut Mengundang'), ...(config.invitersNote ? [node('p', 'credits-note', config.invitersNote)] : [])));
        inviters.forEach(group => blocks.push(block(node('p', 'credits-label', group.title || ''), list(group.names.map(name => node('li', '', name))))));
      }
      blocks.push(block(node('p', 'credits-label', 'Bintang Tamu Istimewa'),
        node('p', 'credits-name', guest || 'Seluruh keluarga, sahabat, dan tamu undangan')));
      const farewell = after ? 'Terima kasih telah menjadi bagian dari hari bahagia kami.' : 'Sampai jumpa di hari bahagia kami.';
      blocks.push(block(node('p', 'credits-note', farewell), node('p', 'credits-label', monogram)));
      roll.replaceChildren(...blocks);

      // ---- Roll playback: the screen is a real scroll area. It rolls by itself while in view and
      // steps aside whenever the guest scrolls it, picking up again from where they left it. ----
      const HOLD = 2500; // ms of quiet after the guest's last touch before the roll resumes
      let started = false, finished = false, visible = false, userPaused = false, timer = 0;
      let position = 0, last = 0, heldUntil = 0, frame = 0;
      const still = () => reducedMotion.matches;
      const end = () => screen.scrollHeight - screen.clientHeight;
      function step(now) {
        frame = 0;
        if (still() || !visible || userPaused || finished) return;
        if (now >= heldUntil) {
          // After the guest scrolled, continue from their position.
          if (Math.abs(screen.scrollTop - position) > 2) position = screen.scrollTop;
          position = Math.min(end(), position + SPEED * Math.min(now - last, 100) / 1000);
          screen.scrollTop = position;
        }
        last = now;
        if (screen.scrollTop >= end() - 1) { finished = true; sync(); closeCurtain(); return; }
        frame = requestAnimationFrame(step);
      }
      function sync() {
        section.classList.toggle('credits-static', still());
        toggle.hidden = still() || !started || finished;
        toggle.setAttribute('aria-pressed', String(userPaused));
        toggle.querySelector('span').textContent = userPaused ? 'Lanjutkan credit' : 'Jeda credit';
        if (!still() && visible && !started && !finished) { started = true; position = screen.scrollTop = 0; }
        if (!frame && started) { last = performance.now(); frame = requestAnimationFrame(step); }
      }
      const hold = () => { heldUntil = performance.now() + HOLD; };
      ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown'].forEach(type => screen.addEventListener(type, hold, { passive: true }));
      screen.tabIndex = 0;
      toggle.addEventListener('click', () => { userPaused = !userPaused; sync(); });
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= .5; sync(); },
        { threshold: [0, .5, 1] }).observe(screen);
      reducedMotion.addEventListener('change', sync);

      // ---- Curtain call ----
      function closeCurtain() {
        if (still()) return;
        clearTimeout(timer);
        curtain.hidden = false;
        curtain.classList.remove('is-parting', 'is-closed');
        curtain.classList.add('is-closing');
        timer = setTimeout(() => { curtain.classList.replace('is-closing', 'is-closed'); }, 2250);
      }
      reopen.addEventListener('click', () => {
        clearTimeout(timer);
        curtain.classList.remove('is-closing', 'is-closed');
        curtain.classList.add('is-parting');
        timer = setTimeout(() => {
          curtain.classList.remove('is-parting'); curtain.hidden = true;
          started = false; finished = false; userPaused = false; sync();
        }, 2400);
      });
      sync();
      return { get state() { return { started, finished, visible, userPaused }; } };
    }
  };
})();
