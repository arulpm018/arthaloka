// Firebase Admin untuk API undangan. Kredensial sama dengan app arthafiloka:
// env FIREBASE_SERVICE_ACCOUNT berisi JSON service account satu baris.
// Admin SDK melewati rules Firestore, jadi koleksi undangan tetap tertutup untuk klien.
const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

function app() {
  if (getApps()[0]) return getApps()[0];
  const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
  if (!account) throw new Error('FIREBASE_SERVICE_ACCOUNT belum di-set');
  if (typeof account.private_key === 'string') account.private_key = account.private_key.replace(/\\n/g, '\n');
  return initializeApp({ credential: cert(account) });
}

// Form undangan mengirim JSON sebagai text/plain, jadi body bisa berupa string.
function readBody(req) {
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body && typeof req.body === 'object' ? req.body : {};
}

const clean = (value, max) => String(value ?? '').trim().slice(0, max);

module.exports = {
  db: () => getFirestore(app()),
  auth: () => getAuth(app()),
  readBody,
  clean,
  RSVP: 'wedding_rsvp',
  GIFTS: 'wedding_gifts'
};
