/* Opening film between the curtain and the cover: "Buka Tirai" parts the curtain on the film,
   which eases to a stop on the burgundy envelope lying on the table. The cover's own envelope
   then takes its place exactly, rises off the table to its spot on the cover and sways there,
   while the shot pushes in and the table falls out of focus; only then does "Buka Undangan"
   appear. */
(() => {
  'use strict';
  // The envelope body in the film's last frame, as fractions of the frame: TL, TR, BR, BL.
  const ENVELOPE = [[.2764, .5315], [.8911, .5028], [.942, .7543], [.276, .7731]];
  const FRAME = { w: 720, h: 1280 };
  const LIFT = 'transform 1.8s cubic-bezier(.45,.05,.25,1)';
  const PUSH = 'transform 2.8s cubic-bezier(.45,.05,.25,1)';
  const PUSH_IN = 1.12;
  const STILL_FADE = 'opacity .7s ease';
  // The film plays faster than it was rendered; the keyframes below stay in film time.
  const SPEED = 1.5;
  // Name captions above each closeup: [film second, x, y] of the caption's centre as fractions
  // of the frame, following the head as the shot drifts. Shown between the first and last key.
  const NAME_TRACKS = {
    bride: [[14.4, .66, .2], [15, .64, .19], [15.5, .615, .18], [16, .595, .172], [16.5, .575, .165], [17, .575, .162], [17.3, .6, .162], [17.6, .66, .162], [17.9, .73, .162]],
    groom: [[19.5, .3, .19], [19.6, .34, .19], [19.8, .4, .19], [20, .444, .19], [20.2, .475, .19], [20.4, .494, .19], [20.6, .503, .19], [20.8, .503, .187], [21, .503, .172], [21.2, .503, .157]]
  };
  const NAME_FADE = .35;

  // Homography taking the four src points onto the four dst points (row-major 3x3).
  function homography(src, dst) {
    const A = [], b = [];
    src.forEach(([x, y], i) => {
      const [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    });
    for (let c = 0; c < 8; c++) {
      let p = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      [b[c], b[p]] = [b[p], b[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const h = b.map((v, i) => v / A[i][i]);
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  }

  window.WeddingIntro = {
    mount({ reducedMotion, onStart = () => {} }) {
      const cover = document.querySelector('#cover');
      const film = cover?.querySelector('.intro-film');
      const video = film?.querySelector('video');
      const still = film?.querySelector('.intro-still');
      const plate = film?.querySelector('.intro-plate');
      const stage = cover?.querySelector('.opening-stage');
      const start = document.querySelector('#open-curtain');
      const skip = document.querySelector('#skip-intro');
      const open = document.querySelector('#open-invitation');
      const skipLink = document.querySelector('.skip-link');
      if (!film || !video || !still || !plate || !stage || !start || !skip || !open) return null;
      const media = [video, still, plate];
      const names = [...film.querySelectorAll('[data-intro-name]')].map(node => ({ node, track: NAME_TRACKS[node.dataset.introName] }));
      let nameFrame = 0;
      // Each caption sits on its track at the film's current time and fades at both ends.
      function placeNames() {
        const t = video.currentTime;
        names.forEach(({ node, track }) => {
          const first = track[0][0], last = track[track.length - 1][0];
          if (phase !== 'video' || t <= first || t >= last) { node.style.opacity = 0; return; }
          const i = track.findIndex(key => key[0] > t), [t0, x0, y0] = track[i - 1], [t1, x1, y1] = track[i];
          const f = (t - t0) / (t1 - t0);
          node.style.left = `${(x0 + (x1 - x0) * f) * 100}%`;
          node.style.top = `${(y0 + (y1 - y0) * f) * 100}%`;
          node.style.opacity = Math.min(1, (t - first) / NAME_FADE, (last - t) / NAME_FADE);
        });
        nameFrame = phase === 'video' ? requestAnimationFrame(placeNames) : 0;
      }
      // A guest whose connection cannot keep the film going this long gets the envelope instead.
      const STALL_LIMIT = 8000;
      let phase, stallTimer, handoffTimers = [];

      function setPhase(next) {
        if (phase) cover.classList.remove(`intro-${phase}`);
        phase = next;
        cover.classList.add(`intro-${next}`);
      }
      // Before the gate opens, the skip link leads to whichever entry control is on screen.
      function pointSkipLink(target, label) {
        if (!document.documentElement.classList.contains('invitation-locked')) return;
        skipLink.href = `#${target.id}`;
        skipLink.textContent = label;
      }
      function watchStall() {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(toEnvelope, STALL_LIMIT);
      }
      function load(img) {
        if (img.getAttribute('src')) return;
        img.addEventListener('load', () => img.classList.add('is-ready'), { once: true });
        img.src = img.dataset.src;
      }

      // The cover envelope laid exactly over the one lying on the table in the last frame.
      function poseOnTable() {
        stage.style.transform = 'none';
        const box = still.getBoundingClientRect();
        const scale = Math.max(box.width / FRAME.w, box.height / FRAME.h);
        const left = box.left + (box.width - FRAME.w * scale) / 2;
        const top = box.top + (box.height - FRAME.h * scale) / 2;
        const slot = stage.getBoundingClientRect();
        const dst = ENVELOPE.map(([x, y]) => [left + x * FRAME.w * scale - slot.left, top + y * FRAME.h * scale - slot.top]);
        const h = homography([[0, 0], [slot.width, 0], [slot.width, slot.height], [0, slot.height]], dst);
        return `matrix3d(${h[0]},${h[3]},0,${h[6]},${h[1]},${h[4]},0,${h[7]},0,0,1,0,${h[2]},${h[5]},0,${h[8]})`;
      }
      function settle() {
        handoffTimers.forEach(clearTimeout);
        handoffTimers = [];
        cover.classList.remove('intro-handoff', 'intro-holding', 'intro-arriving');
        ['transition', 'transform', 'transform-origin'].forEach(property => stage.style.removeProperty(property));
        media.forEach(node => { node.style.transition = STILL_FADE; node.style.transform = `scale(${PUSH_IN})`; });
      }
      function lift() {
        // The envelope rises to its place on the cover and starts to sway; the shot pushes in
        // past it and the table falls out of focus while the cover copy arrives.
        stage.style.transition = LIFT;
        stage.style.transform = 'none';
        cover.classList.remove('intro-handoff');
        cover.classList.replace('intro-holding', 'intro-arriving');
        media.forEach(node => { node.style.transition = `${PUSH}, ${STILL_FADE}`; node.style.transform = `scale(${PUSH_IN})`; });
      }
      function handOff() {
        load(plate);
        const [cx, cy] = ENVELOPE.reduce(([x, y], [px, py]) => [x + px / 4, y + py / 4], [0, 0]);
        media.forEach(node => { node.style.transformOrigin = `${cx * 100}% ${cy * 100}%`; });
        if (reducedMotion.matches) { settle(); return; }
        stage.style.transition = 'none';
        stage.style.transformOrigin = '0 0';
        stage.style.transform = poseOnTable();
        cover.classList.add('intro-handoff', 'intro-holding');
        handoffTimers.push(setTimeout(lift, 600));
        handoffTimers.push(setTimeout(settle, 600 + 2900));
      }

      function toEnvelope() {
        if (phase === 'envelope') return;
        clearTimeout(stallTimer);
        video.pause();
        film.classList.remove('is-buffering');
        load(still);
        start.hidden = true;
        skip.hidden = true;
        open.hidden = false;
        setPhase('envelope');
        placeNames();
        handOff();
        pointSkipLink(open, 'Ke tombol Buka Undangan');
        open.focus({ preventScroll: true });
      }
      function play() {
        setPhase('video');
        start.hidden = true;
        skip.hidden = false;
        pointSkipLink(skip, 'Lewati animasi');
        skip.focus({ preventScroll: true });
        // The ending frame and the backdrop have the whole film to arrive before they are needed.
        load(still);
        load(plate);
        watchStall();
        video.playbackRate = SPEED;
        video.play().catch(toEnvelope);
        if (!nameFrame) placeNames();
      }

      setPhase('curtain');
      open.hidden = true;
      start.hidden = false;
      pointSkipLink(start, 'Ke tombol Buka Tirai');
      // Reduced motion never plays the film, so it is not downloaded either.
      video.defaultPlaybackRate = SPEED;
      if (!reducedMotion.matches) video.src = video.dataset.src;

      start.addEventListener('click', () => {
        if (phase !== 'curtain') return;
        onStart();
        if (video.getAttribute('src') && !reducedMotion.matches) play();
        else toEnvelope();
      });
      skip.addEventListener('click', toEnvelope);
      // "Buka Undangan" leaves for the names at once; finish the hand-off first if it is running.
      open.addEventListener('click', () => { if (handoffTimers.length) settle(); });

      video.addEventListener('ended', toEnvelope);
      video.addEventListener('error', () => { if (phase === 'video') toEnvelope(); });
      video.addEventListener('playing', () => {
        clearTimeout(stallTimer);
        film.classList.remove('is-buffering');
      });
      video.addEventListener('waiting', () => {
        if (phase !== 'video') return;
        film.classList.add('is-buffering');
        watchStall();
      });
      document.addEventListener('visibilitychange', () => {
        if (phase !== 'video') return;
        if (document.hidden) {
          clearTimeout(stallTimer);
          video.pause();
        } else {
          watchStall();
          video.play().catch(toEnvelope);
        }
      });
      reducedMotion.addEventListener('change', () => { if (reducedMotion.matches && phase === 'video') toEnvelope(); });

      return { get phase() { return phase; } };
    }
  };
})();
