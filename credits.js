/* End credits: a slow film-style roll, then the curtain closes with a thank-you. */
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
      const inviters = (config.inviters || []).filter(Boolean);
      if (inviters.length) blocks.push(block(node('p', 'credits-label', 'Turut Mengundang'), list(inviters.map(name => node('li', '', name)))));
      const thanks = (config.thanks || []).filter(item => item?.name);
      if (thanks.length) {
        blocks.push(block(node('p', 'credits-label', 'Dengan Terima Kasih Kepada'), list(thanks.map(item => {
          const li = node('li'); li.append(node('span', 'credits-role', item.role || ''), node('span', '', item.name)); return li;
        }))));
      }
      blocks.push(block(node('p', 'credits-label', 'Bintang Tamu Istimewa'),
        node('p', 'credits-name', guest || 'Seluruh keluarga, sahabat, dan tamu undangan')));
      const farewell = after ? 'Terima kasih telah menjadi bagian dari hari bahagia kami.' : 'Sampai jumpa di hari bahagia kami.';
      blocks.push(block(node('p', 'credits-note', farewell), node('p', 'credits-label', monogram)));
      roll.replaceChildren(...blocks);

      // ---- Roll playback: runs only while the screen is in view ----
      let started = false, finished = false, visible = false, userPaused = false, timer = 0;
      const still = () => reducedMotion.matches;
      function measure() {
        const from = screen.clientHeight, height = roll.offsetHeight;
        roll.style.setProperty('--credits-from', `${from}px`);
        roll.style.setProperty('--credits-to', `${-height}px`);
        roll.style.setProperty('--credits-duration', `${((from + height) / SPEED).toFixed(1)}s`);
      }
      function sync() {
        section.classList.toggle('credits-static', still());
        toggle.hidden = still() || !started || finished;
        toggle.setAttribute('aria-pressed', String(userPaused));
        toggle.querySelector('span').textContent = userPaused ? 'Lanjutkan credit' : 'Jeda credit';
        roll.classList.toggle('is-paused', !visible || userPaused);
        if (!still() && visible && !started && !finished) {
          started = true; measure();
          roll.classList.remove('is-rolling'); void roll.offsetWidth; roll.classList.add('is-rolling');
          sync();
        }
      }
      roll.addEventListener('animationend', event => {
        if (event.target !== roll) return;
        finished = true; sync(); closeCurtain();
      });
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
