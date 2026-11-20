// POST: tamu mengonfirmasi transfer tanda kasih (nama, nominal, rekening tujuan, pesan).
const { db, readBody, clean, GIFTS } = require('./_firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  try {
    const body = readBody(req);
    const name = clean(body.name, 120);
    const amount = Math.floor(Number(body.amount));
    if (!name || !(amount >= 1000 && amount <= 1e9)) return res.status(400).json({ saved: false, error: 'invalid' });
    await db().collection(GIFTS).add({
      name,
      amount,
      account: clean(body.account, 120),
      note: clean(body.note, 500),
      createdAt: new Date()
    });
    return res.status(200).json({ saved: true });
  } catch (error) {
    console.error('gift', error);
    return res.status(500).json({ saved: false, error: 'server' });
  }
};
