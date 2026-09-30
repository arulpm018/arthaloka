/**
 * Firestore Admin untuk script maintenance.
 *
 * Kredensial (salah satu):
 *   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'   (JSON satu baris)
 *   FIREBASE_SERVICE_ACCOUNT=/path/ke/service-account.json
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/ke/service-account.json
 */
import { existsSync, readFileSync } from "node:fs";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const HOW_TO_GET_KEY =
  "Buat key: Firebase Console → Project settings → Service accounts → Generate new private key, " +
  "lalu jalankan dengan FIREBASE_SERVICE_ACCOUNT=<lokasi file .json itu>.";

export function initAdminDb() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  let credential;
  if (raw) {
    if (!raw.startsWith("{") && !existsSync(raw)) {
      throw new Error(`File service account tidak ditemukan: ${raw}\n${HOW_TO_GET_KEY}`);
    }
    credential = cert(JSON.parse(raw.startsWith("{") ? raw : readFileSync(raw, "utf8")));
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = applicationDefault();
  } else {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT belum di-set.\n${HOW_TO_GET_KEY}`);
  }
  initializeApp({ credential });
  return getFirestore();
}

const BATCH_LIMIT = 450;

/** Kumpulkan operasi tulis ke batch, commit tiap BATCH_LIMIT operasi. */
export function createBatchWriter(db) {
  let batch = db.batch();
  let ops = 0;
  return {
    async queue(fn) {
      fn(batch);
      ops += 1;
      if (ops >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    },
    async flush() {
      if (ops > 0) await batch.commit();
      ops = 0;
    },
  };
}
