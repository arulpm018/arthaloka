/* Fit live names and three Arabic lines inside compact, scalloped stationery. */
(() => {
  'use strict';
  const frames = [
    { frame: document.querySelector('.verse-card'), copy: document.querySelector('.verse-copy') }
  ];
  const nameHeadings = [...document.querySelectorAll('#couple .profile-copy h3')];
  const arabic = document.querySelector('#verse-arabic');
  const header = document.querySelector('.site-header');
  let scheduled = false;
  function drawVerseFrame(frame) {
    const svg = frame.querySelector('.verse-lace-frame');
    const width = frame.offsetWidth, height = frame.offsetHeight;
    if (!svg || !width || !height) return;
    const size = `${width} ${height}`;
    if (svg.dataset.size === size) return;
    svg.dataset.size = size;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const radius = Math.min(12, Math.max(7, width * .021));
    const inset = radius + 3, cx = width / 2;
    const rx = cx - inset, ry = Math.min(88, width * .16, (height - 2 * inset) / 2);
    const top = inset, bottom = height - inset;
    const path = offset => {
      const x = inset + offset, right = width - x, y = top + offset, base = bottom - offset;
      const curveX = Math.max(1, rx - offset), curveY = Math.max(1, ry - offset);
      return `M ${x} ${y + curveY} A ${curveX} ${curveY} 0 0 1 ${right} ${y + curveY} L ${right} ${base - curveY} A ${curveX} ${curveY} 0 0 1 ${x} ${base - curveY} Z`;
    };
    // Sample the two oval end caps and straight sides for evenly spaced lace.
    const points = [];
    for(let i=0;i<=100;i++) { const a=Math.PI+i*Math.PI/100; points.push([cx+rx*Math.cos(a),top+ry+ry*Math.sin(a)]); }
    points.push([width-inset,bottom-ry]);
    for(let i=1;i<=100;i++) { const a=i*Math.PI/100; points.push([cx+rx*Math.cos(a),bottom-ry+ry*Math.sin(a)]); }
    points.push(points[0]);
    const distances = [0];
    for(let i=1;i<points.length;i++) distances.push(distances[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
    const length = distances[distances.length-1], count = Math.ceil(length/(radius*1.9));
    let lace = '';
    let segment = 1;
    for (let i = 0; i < count; i++) {
      const distance=i/count*length;
      while(segment<distances.length-1 && distances[segment]<distance) segment++;
      const t=(distance-distances[segment-1])/(distances[segment]-distances[segment-1]||1);
      const x=(points[segment-1][0]+(points[segment][0]-points[segment-1][0])*t).toFixed(2);
      const y=(points[segment-1][1]+(points[segment][1]-points[segment-1][1])*t).toFixed(2);
      lace += `<circle cx="${x}" cy="${y}" r="${radius}" fill="#F5F0E4" stroke="#D6C8B8" stroke-width=".6"/><circle cx="${x}" cy="${y}" r="${radius * .69}" fill="none" stroke="#C4B3A2" stroke-width=".7" stroke-dasharray=".8 2"/><circle cx="${x}" cy="${y}" r="${radius * .24}" fill="#D9C8BA"/>`;
    }
    // Coordinates are generated locally; live text is never inserted into this SVG.
    svg.innerHTML = `<path d="${path(0)}" fill="#F5F0E4"/>${lace}<path d="${path(radius*.4)}" fill="#F5F0E4"/><path d="${path(radius*1.2)}" fill="none" stroke="#B99D93" stroke-width=".8"/>`;
  }
  function fit() {
    scheduled = false;
    for (const heading of nameHeadings) {
      const name = heading.querySelector('[data-fullname]');
      if (!name || !heading.clientWidth) continue;
      // Measure untransformed lettering; leave extra room for script strokes/sway.
      heading.style.removeProperty('font-size');
      const style = window.getComputedStyle(heading);
      const base = parseFloat(style.fontSize);
      const available = heading.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0) - 6;
      const natural = name.scrollWidth;
      if (base && natural && available > 0 && natural > available) {
        heading.style.fontSize = `${Math.floor(base * available / natural * 100) / 100}px`;
      }
    }
    const arabicLines = arabic ? [...arabic.querySelectorAll('.verse-arabic-line')] : [];
    if(arabicLines.length === 3 && arabic.clientWidth) {
      arabic.style.removeProperty('font-size');
      arabic.classList.remove('verse-wrap-lines');
      const base=parseFloat(window.getComputedStyle(arabic).fontSize);
      const widest=Math.max(...arabicLines.map(line=>line.scrollWidth));
      const rootSize=parseFloat(window.getComputedStyle(document.documentElement).fontSize)||16;
      const minimum=rootSize*.875;
      const size=Math.min(base,base*(arabic.clientWidth-4)/(widest||1));
      if(size<base) arabic.style.fontSize=`${Math.max(minimum,Math.floor(size*100)/100)}px`;
      // At enlarged text settings, readability takes precedence over forced rows.
      if(size<minimum) arabic.classList.add('verse-wrap-lines');
    }
    // A text-enlarged header must not overlap the first invitation title.
    // Font-relative badge dimensions handle the monogram without shrinking text.
    if (header?.offsetHeight) {
      const safeTop = Math.ceil(header.offsetHeight + 24) + 'px';
      const root = document.documentElement;
      if (root.style.getPropertyValue('--header-safe-top') !== safeTop) {
        root.style.setProperty('--header-safe-top', safeTop);
      }
    }
    for (const { frame, copy } of frames) {
      if (!frame || !copy || !copy.offsetWidth) continue;
      drawVerseFrame(frame);
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(fit);
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    frames.forEach(({ copy, frame }) => { if (copy) observer.observe(copy); if (frame) observer.observe(frame); });
    nameHeadings.forEach(heading => observer.observe(heading.parentElement));
    if (header) observer.observe(header);
  }
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('wedding:unlocked', fit);
  document.fonts?.ready.then(schedule);
  schedule();
})();
