import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin untuk route handler (bypass rules — selalu verifikasi user
 * dulu lewat `verifyRequest`). Kredensial: env FIREBASE_SERVICE_ACCOUNT berisi
 * JSON service account satu baris (`jq -c . sa.json`).
 */
function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT belum di-set");
  const parsed = JSON.parse(raw);
  // Beberapa dashboard env menyimpan newline private key sebagai "\\n" literal.
  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}

export function adminApp(): App {
  return getApps()[0] ?? initializeApp({ credential: cert(serviceAccount()) });
}

export const adminDb = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());
