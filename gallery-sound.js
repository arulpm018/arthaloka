/* Photobooth sound effect, synthesised with Web Audio (nothing extra to download).
   It follows the music toggle: silent whenever the background music is paused.
   Event from gallery.js:
     wedding:gallery-flash  -> flash whine + shutter + film wind
   The paper strip itself prints silently. */
(() => {
  'use strict';
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  /* The voice is built against a context + output, so it can also be rendered offline. */
  function makeKit(ctx, out) {
    const sr = ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, sr * 2, sr);
    const nd = noiseBuffer.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    function env(t, peak, attack, dur) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      return g;
    }
    function noise(t, dur, { type = 'bandpass', freq = 2000, to = 0, q = 1, gain = .3, attack = .002 } = {}) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer;
      const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(freq, t);
      if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
      src.connect(f).connect(env(t, gain, attack, dur)).connect(out);
      src.start(t, Math.random() * 1.5); src.stop(t + dur + .05);
    }
    function tone(t, { freq, to = 0, dur, gain, type = 'sine', attack = .004 }) {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      o.connect(env(t, gain, attack, dur)).connect(out);
      o.start(t); o.stop(t + dur + .05);
    }

    // Vintage camera: capacitor whine, shutter at +0.7 s (with the visual flash), film-advance ratchet.
    function flash(t0) {
      const whine = ctx.createOscillator(), wg = ctx.createGain();
      whine.type = 'sine';
      whine.frequency.setValueAtTime(650, t0);
      whine.frequency.exponentialRampToValueAtTime(5400, t0 + .64);
      wg.gain.setValueAtTime(.0001, t0);
      wg.gain.exponentialRampToValueAtTime(.07, t0 + .3);
      wg.gain.setValueAtTime(.07, t0 + .62);
      wg.gain.exponentialRampToValueAtTime(.0001, t0 + .7);
      whine.connect(wg).connect(out); whine.start(t0); whine.stop(t0 + .75);
      const shot = t0 + .7;
      noise(shot, .04, { freq: 3800, q: .9, gain: .95 });                       // blades open
      tone(shot, { freq: 240, to: 90, dur: .08, gain: .55 });
      noise(shot + .004, .14, { type: 'highpass', freq: 5200, q: .5, gain: .22 }); // flash pop
      noise(shot + .058, .055, { freq: 2100, q: 1.1, gain: .8 });              // blades close
      tone(shot + .058, { freq: 170, to: 70, dur: .1, gain: .5 });
      for (let i = 0; i < 7; i++) {                                           // winding the film on
        noise(shot + .46 + i * .056, .026, { freq: i % 2 ? 3100 : 2600, q: 2.2, gain: .36 - i * .03 });
      }
      tone(shot + .88, { freq: 320, to: 180, dur: .12, gain: .12, type: 'triangle' });
    }
    return { flash };
  }

  let ctx = null, kit = null;
  function ensure() {
    if (!ctx) {
      try { ctx = new AudioCtx(); } catch { return null; }
      const out = ctx.createGain(); out.gain.value = 1.15;
      // Keeps the effect loud but never clipping on top of the music.
      const glue = ctx.createDynamicsCompressor();
      glue.threshold.value = -12; glue.knee.value = 6; glue.ratio.value = 5; glue.attack.value = .002; glue.release.value = .15;
      out.connect(glue).connect(ctx.destination);
      kit = makeKit(ctx, out);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // Browsers (iOS especially) only let audio start inside a user gesture.
  ['pointerdown', 'keydown', 'touchend'].forEach(type => window.addEventListener(type, ensure, { capture: true, passive: true }));

  const music = () => document.getElementById('background-music');
  function audible() {
    const m = music();
    return !!ctx && ctx.state === 'running' && !!m && !m.paused && !m.muted;
  }

  document.addEventListener('wedding:gallery-flash', () => { if (ensure() && audible()) kit.flash(ctx.currentTime + .02); });

  // For tuning: render the voice offline and inspect its level.
  window.WeddingGallerySound = { makeKit };
})();
