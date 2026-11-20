(() => {
  'use strict';
  const config = window.weddingConfig;
  const dates = window.WeddingDates;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const text = (selector, value) => { const node = $(selector); if(node) node.textContent = value; };
  let toastTimer;
  function notify(message) {
    text('#toast', message); $('#toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500);
  }
  const safeURL = (value, externalOnly = false) => {
    if(!value || typeof value !== 'string') return null;
    try { const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) && (!externalOnly || url.protocol === 'https:') ? url.href : null; }
    catch { return null; }
  };
  const names = `${config.bride.nickname} & ${config.groom.nickname}`;
  document.title = `The Wedding of ${names}`;
  $$('.monogram').forEach(el => el.textContent = config.monogram);
  $$('[data-name]').forEach(el => el.textContent = config[el.dataset.name].nickname);
  $$('[data-fullname]').forEach(el => el.textContent = config[el.dataset.fullname].fullName);
  $$('[data-parents]').forEach(el => {
    const role = el.dataset.parents, person = config[role];
    el.append(document.createTextNode(`${role === 'bride' ? 'Putri' : 'Putra'} ${person.childOrder} dari`),document.createElement('br'),document.createTextNode(`Bapak ${person.father} & Ibu ${person.mother}`));
  });
  // Minang titles (Anak Daro, Marapulai) above the full names; an empty title hides its line.
  $$('[data-role]').forEach(el => { const title = config[el.dataset.role].title || ''; el.textContent = title; el.hidden = !title; });
  const params = new URLSearchParams(location.search);
  const suppliedGuest = params.get('to')?.trim().slice(0,120);
  text('#guest-name', suppliedGuest || config.guestDefault || 'Bapak/Ibu/Saudara/i');

  // Time-based phase: before → eve (H-1) → day (hari H) → after. ?fase=… previews one.
  const phase = { sebelum: 'before', 'h-1': 'eve', 'hari-h': 'day', selesai: 'after' }[params.get('fase')] || dates.phaseOf(config);
  const after = phase === 'after';
  document.documentElement.dataset.phase = phase;
  // Reception session for this guest: ?sesi=2 picks the second entry of reception.sessions.
  const sessionNumber = Number.parseInt(params.get('sesi'), 10);
  const sessionEntry = (config.reception.sessions || [])[sessionNumber - 1];
  const session = sessionEntry ? { ...sessionEntry, label: sessionEntry.name || `Sesi ${sessionNumber}`, number: sessionNumber } : null;
  const ribbon = { eve: 'Besok kami menikah', day: 'Hari ini kami menikah' }[phase];
  if (ribbon) { text('#phase-ribbon', ribbon); $('#phase-ribbon').hidden = false; }
  if (after) {
    text('.cover-top > .eyebrow', 'WITH LOVE & GRATITUDE'); text('#cover-title', 'Thank You'); text('.cover-subtitle', 'for being part of our day');
  }
  text('#opening-text', after && config.after?.openingText || config.openingText);
  text('#closing-text', after && config.after?.closingText || config.closingText);
  $$('[data-asset]').forEach(img => {
    const url = safeURL(config.illustrations[img.dataset.asset]);
    // Keep an HTML-started image request intact when config uses the same asset.
    if(url && safeURL(img.getAttribute('src')) !== url) img.src=url;
  });
  $$('[data-flower]').forEach(img => { const url = safeURL(config.decorations.flowers); if(url)img.src=url; img.setAttribute('decoding','async'); });
  $$('[data-decoration]').forEach(img => {
    const url = safeURL(config.decorations[img.dataset.decoration]);
    if(url) img.src=url;
    img.setAttribute('decoding','async');
  });
  const envelopePaper = safeURL(config.decorations.envelopePaper);
  if(envelopePaper) ['#cover','#names'].forEach(selector => {
    $(selector).style.setProperty('--envelope-paper',`url(${JSON.stringify(envelopePaper)})`);
  });
  const stage = safeURL(config.decorations.stage); if(stage) $('.stage').style.backgroundImage = `url(${JSON.stringify(stage)})`;
  for (const role of ['bride','groom']) {
    const img=$(`.${role}-crop img`), src=safeURL(config.illustrations[role]);
    if(src){img.src=src;img.parentElement.classList.add('single-portrait');}
  }
  text('#verse-title', config.verse.reference);
  if(config.verse.arabic?.trim()){
    const arabic = $('#verse-arabic');arabic.textContent=config.verse.arabic;arabic.classList.remove('arabic-placeholder');arabic.classList.add('arabic-text');arabic.lang='ar';arabic.dir='rtl';
    const lines = config.verse.arabicLines;
    const normalize = value => value.trim().replace(/\s+/g, ' ');
    if(Array.isArray(lines) && lines.length === 3 && lines.every(line => typeof line === 'string') && normalize(lines.join(' ')) === normalize(config.verse.arabic)) {
      arabic.replaceChildren();
      lines.forEach((line,index) => {
        if(index) arabic.append(document.createTextNode(' '));
        const span=document.createElement('span');span.className='verse-arabic-line';
        // An end-of-ayah sign (۝) + number becomes the gold medallion; the number stays live text.
        const mark=line.match(/\s*۝\s*([٠-٩]+)\s*$/);
        span.textContent=mark?line.slice(0,mark.index):line;
        if(mark){const ayah=document.createElement('span');ayah.className='verse-ayah';ayah.textContent=mark[1];span.append(' ',ayah);}
        arabic.append(span);
      });
    }
  }
  if(config.verse.translation?.trim())text('#verse-translation', config.verse.translation);

  const eventValue = config.date || config.akad.start || config.reception.start;
  const eventDate = dates.countdownDate(eventValue,config.timeZone);
  const fmt = (value,options) => dates.formatDate(value,config.timeZone,options);
  if(eventDate){
    text('.date-short',fmt(eventValue,{day:'2-digit',month:'long',year:'numeric'}));
  }
  const calendarWeek = dates.calendarWeek(config.date || config.akad.start || config.reception.start || config.calendar?.date, config.timeZone);
  if (calendarWeek) {
    text('#date-calendar-month', calendarWeek.month);
    $('#date-calendar').setAttribute('aria-label', `Kalender pernikahan, ${calendarWeek.fullDate}`);
    $$('#date-calendar [data-calendar-day]').forEach((cell, index) => {
      const day = calendarWeek.days[index];
      const stamp = cell.querySelector('time');
      stamp.dateTime = day.dateKey; stamp.setAttribute('datetime', day.dateKey);
      stamp.setAttribute('aria-label', day.fullDate + (day.selected ? ', hari pernikahan' : ''));
      stamp.querySelector('.vv-date-numeral').textContent = day.day;
      cell.classList.toggle('is-wedding-day', day.selected);
    });
  }
  const timezoneLabel = config.timeZoneLabel || 'WIB';
  for(const key of ['akad','reception']){
    const event=config[key];
    const start=dates.validDate(event.start);
    const end=dates.validDate(event.end);
    const day = event.start || event.date || eventValue;
    if(day)text(`#${key}-date`,fmt(day,{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
    if(start){text(`#${key}-date`,fmt(start,{weekday:'long',day:'numeric',month:'long',year:'numeric'}));text(`#${key}-time`,`Pukul ${fmt(start,{hour:'2-digit',minute:'2-digit'})}${end ? '–'+fmt(end,{hour:'2-digit',minute:'2-digit'}) : '–selesai'} ${timezoneLabel}`);}
  }
  // A guest's own session replaces the general reception hours.
  if(session){
    const start=dates.validDate(session.start), end=dates.validDate(session.end);
    const hours=start ? `${fmt(start,{hour:'2-digit',minute:'2-digit'})}${end ? '–'+fmt(end,{hour:'2-digit',minute:'2-digit'}) : '–selesai'} ${timezoneLabel}` : `[JAM MULAI]–[JAM SELESAI] ${timezoneLabel}`;
    text('#reception-time',`${session.label} · Pukul ${hours}`);
  }
  function openMap(url){
    const target=safeURL(url,true);
    if(target){window.open(target,'_blank','noopener,noreferrer');}
    else notify('Lokasi acara akan segera diumumkan.');
  }
  text('#akad-title',config.akad.title || 'Akad Nikah');
  text('#reception-title',config.reception.title || 'Resepsi Pernikahan');
  text('#reception-subtitle',config.reception.subtitle || '');$('#reception-subtitle-line').hidden=!config.reception.subtitle;
  text('#venue-name',config.reception.venue || config.akad.venue);
  text('#venue-address',config.reception.address || config.akad.address);
  $('#view-location').addEventListener('click',()=>openMap(config.reception.mapUrl || config.akad.mapUrl));
  const differentVenues = config.akad.venue !== config.reception.venue || config.akad.address !== config.reception.address;
  if(differentVenues){
    const area=$('#akad-separate-venue');area.hidden=false;area.className='separate-venue';
    const venue=document.createElement('p');venue.textContent=config.akad.venue;
    const address=document.createElement('p');address.textContent=config.akad.address;
    const button=document.createElement('button');button.type='button';button.className='button outline-button';button.textContent='Lokasi Akad';button.addEventListener('click',()=>openMap(config.akad.mapUrl));
    area.append(venue,address,button);
    $('#view-location').lastChild.textContent='Lokasi Resepsi';
  }
  // Live stream: announced before, highlighted on the day, a recording (if any) afterwards.
  const live = config.live || {}, liveURL = after ? safeURL(live.recordingUrl, true) : safeURL(live.url, true);
  if(liveURL){
    const via = live.platform ? ` melalui ${live.platform}` : '';
    $('#live-stream').hidden=false; $('#live-stream').classList.toggle('is-live', phase === 'day'); $('#live-link').href=liveURL;
    text('#live-note', after ? 'Rekaman acara kami dapat ditonton kembali.'
      : phase === 'day' ? `Saksikan pernikahan kami secara langsung${via}.`
      : `Bagi keluarga dan sahabat yang berhalangan hadir, pernikahan kami dapat disaksikan secara langsung${via} ${phase === 'eve' ? 'besok' : 'pada hari H'}.`);
    text('#live-link span:last-child', after ? 'Tonton Rekaman' : phase === 'day' ? 'Tonton Sekarang' : 'Buka Tautan Siaran');
    if(phase === 'day'){ $('#cover-live').href=liveURL; $('#cover-live').hidden=false; }
  }
  // Dress code swatches in the invitation's own palette; no longer needed once the wedding is over.
  const dress = config.dressCode || {};
  const swatches = (dress.colors || []).filter(color => color?.name && window.CSS?.supports?.('color', color.hex || ''));
  if(dress.enabled !== false && swatches.length && !after){
    $('#dress-code').hidden=false;
    text('#dress-title', dress.title || 'Dress Code'); text('#dress-note', dress.note || '');
    $('#dress-note').hidden=!dress.note;
    $('#dress-swatches').style.setProperty('--dress-count', String(swatches.length));
    $('#dress-swatches').replaceChildren(...swatches.map((color,index)=>{
      const item=document.createElement('li'); item.style.setProperty('--i', String(index));
      const chip=document.createElement('span'); chip.className='dress-chip'; chip.style.setProperty('--chip', color.hex); chip.setAttribute('aria-hidden','true');
      const name=document.createElement('span'); name.className='dress-name'; name.textContent=color.name;
      item.append(chip,name); return item;
    }));
    if(dress.extra?.trim()){ text('#dress-extra', dress.extra.trim()); $('#dress-extra').hidden=false; }
  }
  // Saving the date only makes sense before the day itself.
  $('#save-date').hidden = phase === 'day' || after;
  $('#save-date').addEventListener('click',()=>{
    const reception=session ? {...config.reception,start:session.start||config.reception.start,end:session.end||config.reception.end,subtitle:[config.reception.subtitle,session.label].filter(Boolean).join(', ')} : config.reception;
    const calendar=dates.createCalendar({...config,reception});
    if(!calendar){notify('Tanggal acara akan segera diumumkan.');return;}
    const blob=new Blob([calendar],{type:'text/calendar;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='undangan-pernikahan.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notify('File kalender siap ditambahkan ke kalender Anda.');
  });
  function updateCountdown(){
    if(!config.countdown.enabled){$('#countdown').hidden=true;return;}
    if(phase === 'day' || after){text('#countdown', after ? 'A day we’ll cherish forever.' : 'Hari ini, hari bahagia kami.');return;}
    if(!eventDate)return;
    const gap=eventDate.getTime()-Date.now();
    if(gap<=0){text('#countdown','A day we’ll cherish forever.');return;}
    const seconds=Math.floor(gap/1000);
    text('#countdown',`${Math.floor(seconds/86400)} Hari · ${Math.floor(seconds/3600)%24} Jam · ${Math.floor(seconds/60)%60} Menit · ${seconds%60} Detik`);
  }
  updateCountdown();if(eventDate && config.countdown.enabled && phase !== 'day' && !after)setInterval(()=>{if(!document.hidden)updateCountdown()},1000);

  // A truthful media control: the icon follows the actual HTML audio element.
  const audio=$('#background-music'), musicButton=$('#music-toggle');
  const musicURL=safeURL(config.music.src);if(musicURL)audio.src=musicURL;
  audio.volume=Math.max(0,Math.min(1,Number(config.music.volume)||0.22));
  function syncMusic(){const playing=!audio.paused&&!audio.ended;musicButton.setAttribute('aria-pressed',String(playing));musicButton.setAttribute('aria-label',playing?'Jeda musik':'Putar musik');}
  async function playMusic(showError=false){
    if(!musicURL){if(showError)notify('Musik belum tersedia.');return;}
    try{await audio.play();}catch{if(showError)notify('Musik belum dapat diputar. Silakan coba lagi.');syncMusic();}
  }
  ['playing','pause','ended','error','emptied'].forEach(event=>audio.addEventListener(event,syncMusic));
  musicButton.addEventListener('click',()=>audio.paused?playMusic(true):audio.pause());
  syncMusic();

  // CSS owns the opening; the reading tour begins after the portrait sequence.
  // Keep the button functional if the enhancement script is unavailable.
  const autoScroll = window.WeddingAutoScroll?.mount({ config: config.autoScroll, reducedMotion });
  let intro;
  const motion = window.WeddingMotion?.mount({
    reducedMotion,
    onOpen: () => { autoScroll?.prepare(); playMusic(); },
    onOpened: () => autoScroll?.afterOpening(),
    onCancel: () => { autoScroll?.pause(); autoScroll?.afterOpening(); },
    // After the opening film the envelope is already on the table; "Buka Undangan" goes to slide 01.
    skipOpening: () => intro?.phase === 'envelope'
  });
  window.WeddingCurtain?.mount({ reducedMotion });
  // The opening film is silent, so the backsound starts with "Buka Tirai" and plays under it.
  intro = window.WeddingIntro?.mount({ reducedMotion, onStart: () => playMusic() });
  if (!motion) $('#open-invitation').addEventListener('click', () => {
    autoScroll?.prepare();
    playMusic();
    $('#names').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    setTimeout(() => autoScroll?.afterOpening(), 1200);
  });

  // The gallery is one printer strip before the closing; it mounts before navigation.
  // After the wedding, photos of the day (config.after.photos) replace the pre-wedding set.
  const afterPhotos = after ? (config.after?.photos || []).filter(photo => photo?.src) : [];
  window.WeddingGallery?.mount({ config: afterPhotos.length ? { ...config.gallery, photos: afterPhotos } : config.gallery, reducedMotion });
  document.addEventListener('wedding:lightbox-change', event => { if (event.detail?.open) autoScroll?.pause(); });

  // Optional RSVP. Endpoint contract: only {saved:true} confirms persistence.
  if(config.rsvp.enabled){
    $('#rsvp').hidden=false;
    const form=$('#rsvp-form'), submit=form.querySelector('button[type="submit"]');
    const maxGuests=Math.max(1,Math.min(20,Number(config.rsvp.maxGuests)||4));
    form.elements.guests.max=String(maxGuests);
    if(suppliedGuest)form.elements.name.value=suppliedGuest;
    form.elements.attendance.addEventListener('change',()=>{const present=form.elements.attendance.value==='Hadir';$('#guests-field').hidden=!present;form.elements.guests.required=present;});
    const whatsapp=String(config.rsvp.whatsapp||'').replace(/\D/g,'');
    const endpoint=safeURL(config.rsvp.endpoint,true);
    // Wishes come back from the same endpoint (GET, see apps-script/rsvp.gs) and render as plain text.
    const wishes=$('#rsvp-wishes'), wishList=$('#rsvp-wish-list');
    async function loadWishes(){
      if(!endpoint||config.rsvp.showWishes===false)return;
      try{
        const response=await fetch(endpoint,{cache:'no-store'});
        if(!response.ok)throw new Error('server');
        const list=(await response.json()).wishes;
        if(!Array.isArray(list))throw new Error('format');
        wishList.replaceChildren(...list.filter(item=>typeof item?.wish==='string'&&item.wish.trim()).map(item=>{
          const row=document.createElement('li');row.className='rsvp-wish';
          const name=document.createElement('p');name.className='rsvp-wish-name';name.textContent=String(item.name||'Tamu undangan').slice(0,120);
          const body=document.createElement('p');body.className='rsvp-wish-text';body.textContent=item.wish.slice(0,1500);
          const when=fmt(item.time,{day:'numeric',month:'long',year:'numeric'});
          row.append(name,body);
          if(when){const time=document.createElement('time');time.className='rsvp-wish-time';time.dateTime=item.time;time.textContent=when;row.append(time);}
          return row;
        }));
        text('#rsvp-wish-empty',wishList.children.length||after?'':'Jadilah yang pertama menuliskan doa untuk kami.');
        wishes.hidden=false;
      }catch{if(!wishList.children.length)wishes.hidden=true;}
    }
    loadWishes();
    $('#rsvp-wish-hint').hidden=!endpoint||config.rsvp.showWishes===false;
    if(!endpoint && whatsapp)submit.textContent='Konfirmasi via WhatsApp';
    if(!endpoint && !whatsapp){submit.disabled=true;text('#rsvp-status','Konfirmasi kehadiran akan segera dibuka.');}
    // After the wedding the form closes; the wishes stay as a keepsake.
    if(after){
      form.hidden=true; $('#rsvp').dataset.nav='Doa & Ucapan';
      text('#rsvp .scene-number','07 / WARM WISHES'); text('#rsvp .rsvp-card > .eyebrow','WITH LOVE & GRATITUDE');
      text('#rsvp .rsvp-card > p','Terima kasih atas doa dan ucapan yang telah dikirimkan untuk kami.');
      if(!endpoint||config.rsvp.showWishes===false)$('#rsvp').hidden=true;
    }
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const payload={name:form.elements.name.value.trim(),attendance:form.elements.attendance.value,guests:form.elements.attendance.value==='Hadir'?Math.max(1,Math.min(maxGuests,Number(form.elements.guests.value)||1)):0,wish:form.elements.wish.value.trim(),session:session?.label||''};
      if(!payload.name){text('#rsvp-status','Mohon isi nama Anda.');form.elements.name.focus();return;}
      if(!endpoint){
        if(!whatsapp){text('#rsvp-status','Konfirmasi kehadiran akan segera dibuka.');return;}
        const message=`Konfirmasi Undangan ${names}\n\nNama: ${payload.name}${payload.session?`\nSesi: ${payload.session}`:''}\nKehadiran: ${payload.attendance}\nJumlah tamu: ${payload.guests}\nUcapan: ${payload.wish}`;
        window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
        text('#rsvp-status','Pesan sudah disiapkan. Silakan kirim melalui WhatsApp untuk menyelesaikan konfirmasi.');return;
      }
      submit.disabled=true;text('#rsvp-status','Mengirim konfirmasi…');
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
      try{
        // text/plain keeps this a "simple" request: Apps Script cannot answer a CORS preflight.
        const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal});
        if(!response.ok)throw new Error('server');
        const result=await response.json();if(result.saved!==true)throw new Error('not-persisted');
        text('#rsvp-status','Terima kasih. Konfirmasi dan doa Anda telah tersimpan.');form.reset();$('#guests-field').hidden=true;
        if(suppliedGuest)form.elements.name.value=suppliedGuest;
        if(payload.wish)loadWishes();
      }catch{text('#rsvp-status','Konfirmasi belum tersimpan. Silakan coba kembali.');}
      finally{clearTimeout(timeout);submit.disabled=false;}
    });
  }

  // Optional digital envelope. Copy buttons copy digits only, ready for banking apps.
  const gift=config.gift;
  if(gift?.enabled){
    $('#gift').hidden=false;
    text('#gift-text',gift.text||'Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Namun jika Anda ingin memberikan tanda kasih, kami menyediakan amplop digital berikut.');
    const copy=async(value,message)=>{
      try{await navigator.clipboard.writeText(value);}
      catch{
        const area=document.createElement('textarea');area.value=value;area.readOnly=true;area.style.cssText='position:fixed;top:0;opacity:0';
        document.body.append(area);area.select();const copied=document.execCommand('copy');area.remove();
        if(!copied){notify('Belum dapat menyalin. Silakan salin secara manual.');return;}
      }
      notify(message);
    };
    const toggle=$('#gift-toggle'),details=$('#gift-details'),copyIcon=$('#gift-copy-address svg');
    toggle.addEventListener('click',()=>{
      const open=details.hidden;details.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
      toggle.querySelector('span').textContent=open?'Tutup Amplop':'Buka Amplop Digital';
    });
    $('#gift-accounts').replaceChildren(...(gift.accounts||[]).filter(account=>account?.number).map(account=>{
      const digits=String(account.number).replace(/\D/g,''), label=account.bank||'rekening';
      const row=document.createElement('li');row.className='gift-account';
      const bank=document.createElement('p');bank.className='gift-bank';bank.textContent=account.bank||'';
      const number=document.createElement('p');number.className='gift-number';number.textContent=account.number;
      const holder=document.createElement('p');holder.className='gift-holder';holder.textContent=account.holder?`a.n. ${account.holder}`:'';
      const button=document.createElement('button');button.type='button';button.className='button outline-button gift-copy';
      const caption=document.createElement('span');caption.textContent='Salin Nomor';button.append(copyIcon.cloneNode(true),caption);
      button.setAttribute('aria-label',`Salin nomor ${label}`);button.disabled=!digits;
      button.addEventListener('click',()=>copy(digits,`Nomor ${label} telah disalin.`));
      row.append(bank,number,holder,button);return row;
    }));
    const address=gift.address;
    if(address?.text){
      $('#gift-address').hidden=false;
      text('#gift-recipient',[address.recipient,address.phone].filter(Boolean).join(' · '));
      text('#gift-address-text',address.text);
      $('#gift-copy-address').disabled=/^\[.*\]$/.test(address.text.trim());
      $('#gift-copy-address').addEventListener('click',()=>copy([address.recipient,address.phone,address.text].filter(Boolean).join('\n'),'Alamat telah disalin.'));
    }
  }

  // End credits after the farewell; the curtain closes over them once the roll ends.
  window.WeddingCredits?.mount({
    config: config.credits, bride: config.bride, groom: config.groom, monogram: config.monogram, guest: suppliedGuest, reducedMotion, after,
    dateLabel: (fmt(eventValue, { day: '2-digit', month: '2-digit', year: 'numeric' }) || '').replace(/\//g, ' . ')
  });

  // Section numbers follow the sections actually shown (gallery, RSVP, gift and credits are optional).
  $$('#invitation-content > .scene:not([hidden]) > .scene-number').forEach((label,index)=>{
    label.textContent=label.textContent.replace(/^\d+/,String(index+1).padStart(2,'0'));
  });

  // The navigation is derived from active sections, including optional sections.
  const scenes=$$('.scene').filter(scene=>!scene.hidden), nav=$('#scene-nav');
  scenes.forEach((scene,index)=>{
    const a=document.createElement('a');a.href='#'+scene.id;a.setAttribute('aria-label',scene.dataset.nav);a.setAttribute('aria-current',String(index===0));
    const label=document.createElement('span');label.textContent=scene.dataset.nav;a.append(label);a.addEventListener('click',()=>motion?.finish(false));nav.append(a);
  });
  if('IntersectionObserver' in window){
    const reveals=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(motion)motion.revealFrame(entry.target,entry.isIntersecting);else entry.target.classList.toggle('is-visible',entry.isIntersecting||reducedMotion.matches);})},{threshold:0,rootMargin:'0px 0px -30px 0px'});
    $$('.reveal').forEach(el=>reveals.observe(el));
    const visibleScenes=new Map();
    const sceneObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{entry.target.classList.toggle('in-view',entry.isIntersecting);visibleScenes.set(entry.target.id,entry.intersectionRatio);motion?.visibility(entry.target,entry.isIntersecting)});
      const active=[...visibleScenes].sort((a,b)=>b[1]-a[1])[0];
      if(active && active[1]>0)nav.querySelectorAll('a').forEach(a=>a.setAttribute('aria-current',String(a.hash==='#'+active[0])));
    },{threshold:[0,.1,.25,.4,.6,.8,1]});
    scenes.forEach(scene=>sceneObserver.observe(scene));
    document.documentElement.classList.add('js');
  }
  // Subtle stage parallax follows user scroll, never overrides it.
  let pending=false;
  window.addEventListener('scroll',()=>{
    if(reducedMotion.matches||pending)return;pending=true;
    requestAnimationFrame(()=>{const offset=Math.min(12,Math.max(-12,(scrollY/(document.body.scrollHeight-innerHeight||1)-.5)*18));$('.stage').style.transform=`translateY(${offset}px) scale(1.025)`;pending=false;});
  },{passive:true});
})();
