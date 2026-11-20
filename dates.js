/* Date helpers shared by calendar, countdown and displayed event details. */
(function (global) {
  'use strict';
  const validDate = value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const zone = value => {
    try { new Intl.DateTimeFormat('id-ID', {timeZone:value}).format(); return value; }
    catch { return 'Asia/Jakarta'; }
  };
  const isDateOnly = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const formatDate = (value, timeZone, options) => {
    const civil = isDateOnly(value);
    const date = validDate(civil ? value + 'T12:00:00Z' : value);
    return date ? new Intl.DateTimeFormat('id-ID', {timeZone:civil ? 'UTC' : zone(timeZone), ...options}).format(date) : null;
  };
  // Count down to the beginning of the configured local date, not UTC midnight.
  const countdownDate = (value, timeZone) => {
    if (!isDateOnly(value)) return validDate(value);
    const target = validDate(value + 'T00:00:00Z');
    if (!target || target.toISOString().slice(0,10) !== value) return null;
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone:zone(timeZone),
      year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' });
    let instant = target.getTime();
    for (let i = 0; i < 3; i++) {
      const p = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type,part.value]));
      const local = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
      const next = target.getTime() - (local - instant);
      if (next === instant) break;
      instant = next;
    }
    return new Date(instant);
  };
  // A civil date is kept separate from an event time; no invented ceremony hour.
  const calendarWeek = (value, timeZone) => {
    let key;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) key = value;
    else {
      const date = validDate(value);
      if (!date) return null;
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: zone(timeZone), year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(date);
      const get = type => parts.find(part => part.type === type).value;
      key = `${get('year')}-${get('month')}-${get('day')}`;
    }
    const selected = new Date(key + 'T12:00:00Z');
    if (Number.isNaN(selected.getTime()) || selected.toISOString().slice(0,10) !== key) return null;
    const monday = new Date(selected);
    monday.setUTCDate(selected.getUTCDate() - (selected.getUTCDay() + 6) % 7);
    const labels = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
    const days = labels.map((label, index) => {
      const date = new Date(monday); date.setUTCDate(monday.getUTCDate() + index);
      const dateKey = date.toISOString().slice(0,10);
      return { label, day: date.getUTCDate(), dateKey, selected: dateKey === key,
        fullDate: formatDate(date, 'UTC', {weekday:'long',day:'numeric',month:'long',year:'numeric'}) };
    });
    return { dateKey: key, days,
      month: formatDate(selected,'UTC',{month:'long',year:'numeric'}),
      fullDate: formatDate(selected,'UTC',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) };
  };
  // Invitation phase in the event's own time zone: before → eve (H-1) → day (hari H) → after.
  // The day ends at the latest configured end time, or at local midnight when no end is set.
  const addDays = (key, days) => { const date = new Date(key + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0,10); };
  const phaseOf = (config, now = new Date()) => {
    const key = calendarWeek(config.date || config.calendar?.date, config.timeZone)?.dateKey;
    if (!key) return 'before';
    const dayStart = countdownDate(key, config.timeZone), eveStart = countdownDate(addDays(key, -1), config.timeZone);
    const sessionEnds = (config.reception?.sessions || []).map(session => session?.end);
    const ends = [config.reception?.end, ...sessionEnds].map(validDate).filter(end => end && end > dayStart);
    const dayEnd = ends.length ? new Date(Math.max(...ends)) : countdownDate(addDays(key, 1), config.timeZone);
    return now >= dayEnd ? 'after' : now >= dayStart ? 'day' : now >= eveStart ? 'eve' : 'before';
  };
  const escapeICS = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const utcStamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  // RFC 5545 line folding at 75 UTF-8 octets without splitting a character.
  const foldLine = value => {
    const lines = []; let line = '', count = 0;
    for (const char of value) {
      const bytes = new TextEncoder().encode(char).length;
      if (count + bytes > 75) { lines.push(line); line = ' '; count = 1; }
      line += char; count += bytes;
    }
    lines.push(line); return lines.join('\r\n');
  };
  const createCalendar = (config, now = new Date()) => {
    const base = isDateOnly(config.date) ? null : validDate(config.date);
    // Event names follow the invitation, e.g. "Baralek (Resepsi Pernikahan)".
    const named = (event, fallback) => event?.title ? event.title + (event.subtitle ? ` (${event.subtitle})` : '') : fallback;
    const events = [['reception',named(config.reception,'Resepsi Pernikahan')]].flatMap(([key,title],i) => {
      const event = config[key] || {};
      const start = validDate(event.start) || (i === 0 ? base : null);
      if (!start) return [];
      const requestedEnd = validDate(event.end);
      const end = requestedEnd && requestedEnd > start ? requestedEnd : new Date(start.getTime() + 3600000);
      return ['BEGIN:VEVENT',`UID:${start.getTime()}-${key}@wedding-invitation.local`,`DTSTAMP:${utcStamp(now)}`,`DTSTART:${utcStamp(start)}`,`DTEND:${utcStamp(end)}`,`SUMMARY:${escapeICS(title + ' — ' + config.bride.nickname + ' & ' + config.groom.nickname)}`,`LOCATION:${escapeICS([event.venue,event.address].filter(Boolean).join(', '))}`,`DESCRIPTION:${escapeICS('Dengan cinta dan rasa syukur, kami menantikan kehadiran Anda.')}`,'END:VEVENT'];
    });
    if (!events.length) {
      const calendar = calendarWeek(config.date || config.calendar?.date, config.timeZone);
      if (!calendar) return null;
      const nextDay = new Date(calendar.dateKey + 'T12:00:00Z');
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      events.push('BEGIN:VEVENT',`UID:${calendar.dateKey}-wedding@wedding-invitation.local`,
        `DTSTAMP:${utcStamp(now)}`,`DTSTART;VALUE=DATE:${calendar.dateKey.replace(/-/g,'')}`,
        `DTEND;VALUE=DATE:${nextDay.toISOString().slice(0,10).replace(/-/g,'')}`,
        `SUMMARY:${escapeICS('Pernikahan — ' + config.bride.nickname + ' & ' + config.groom.nickname)}`,
        'DESCRIPTION:Jam dan lokasi acara mengikuti informasi undangan.','END:VEVENT');
    }
    return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Velvet Vows//Wedding Invitation//ID','CALSCALE:GREGORIAN','METHOD:PUBLISH',...events,'END:VCALENDAR'].map(foldLine).join('\r\n')+'\r\n';
  };
  global.WeddingDates = {validDate,zone,formatDate,countdownDate,calendarWeek,createCalendar,phaseOf};
})(globalThis);
