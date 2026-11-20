// GET: seluruh RSVP & konfirmasi transfer untuk halaman rekap.
// Hanya Arul & Fifi — whitelist UID dan email sama dengan firestore.rules app arthafiloka.
const { db, auth, RSVP, GIFTS } = require('./_firebase');

const ALLOWED = {
  RPS8bvX5eGerNJDm20RvQS0tnHI2: 'fifi.work27@gmail.com',
  UIioxgSjFceo0lmwAWWnrFLm6uJ2: 'arulpm010@gmail.com'
};

const rows = snap => snap.docs.map(doc => {
  const data = doc.data();
  return { id: doc.id, ...data, createdAt: data.createdAt.toDate().toISOString() };
});

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
  let user;
  try { user = await auth().verifyIdToken(token); }
  catch { return res.status(401).json({ error: 'login' }); }
  if (!ALLOWED[user.uid] || ALLOWED[user.uid] !== user.email) return res.status(403).json({ error: 'forbidden' });
  try {
    const [rsvp, gifts] = await Promise.all([
      db().collection(RSVP).orderBy('createdAt', 'desc').get(),
      db().collection(GIFTS).orderBy('createdAt', 'desc').get()
    ]);
    return res.status(200).json({ rsvp: rows(rsvp), gifts: rows(gifts) });
  } catch (error) {
    console.error('rekap', error);
    return res.status(500).json({ error: 'server' });
  }
};
