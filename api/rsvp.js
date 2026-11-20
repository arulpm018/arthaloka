// GET: daftar ucapan untuk ditampilkan di undangan. POST: simpan konfirmasi kehadiran.
// Ucapan bisa disembunyikan dengan memberi field hidden: true di Firebase Console.
const { db, readBody, clean, RSVP } = require('./_firebase');

const ATTENDANCE = ['Hadir', 'Tidak dapat hadir', 'Masih belum pasti'];

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const snap = await db().collection(RSVP).orderBy('createdAt', 'desc').limit(300).get();
      const wishes = snap.docs.map(doc => doc.data())
        .filter(row => row.wish && !row.hidden)
        .map(row => ({ name: row.name, wish: row.wish, time: row.createdAt.toDate().toISOString() }));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ wishes });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

    const body = readBody(req);
    const name = clean(body.name, 120);
    const attendance = ATTENDANCE.includes(body.attendance) ? body.attendance : '';
    if (!name || !attendance) return res.status(400).json({ saved: false, error: 'invalid' });
    await db().collection(RSVP).add({
      name,
      attendance,
      guests: attendance === 'Hadir' ? Math.max(1, Math.min(20, Math.floor(Number(body.guests)) || 1)) : 0,
      wish: clean(body.wish, 1500),
      session: clean(body.session, 80),
      createdAt: new Date()
    });
    return res.status(200).json({ saved: true });
  } catch (error) {
    console.error('rsvp', error);
    return res.status(500).json({ saved: false, error: 'server' });
  }
};
