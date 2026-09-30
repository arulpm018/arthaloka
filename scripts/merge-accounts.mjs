#!/usr/bin/env node
/**
 * Gabungkan satu rekening ke rekening lain lalu nonaktifkan rekening asal
 * (mis. "Pacaran" → "Jago Bersama").
 *
 *   node scripts/merge-accounts.mjs                                   # daftar rekening aktif
 *   node scripts/merge-accounts.mjs --from "Pacaran" --to "Jago"      # dry-run (tampilkan rencana)
 *   node scripts/merge-accounts.mjs --from … --to … --to-owner shared # sekalian jadikan milik Bersama
 *   node scripts/merge-accounts.mjs --from … --to … --apply           # eksekusi
 *
 * --from / --to menerima nama persis rekening (tidak peka huruf besar) atau id-nya.
 * Kredensial: lihat scripts/lib/admin.mjs. Jangan mencatat transaksi di app
 * selama --apply berjalan.
 */
import { FieldValue } from "firebase-admin/firestore";
import { createBatchWriter, initAdminDb } from "./lib/admin.mjs";
import { findAccount, planAccountMerge } from "./lib/accountMerge.mjs";

const OWNERS = ["arul", "fifi", "shared"];
const OWNER_LABELS = { arul: "Arul", fifi: "Fifi", shared: "Bersama" };

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const apply = process.argv.includes("--apply");
const fromKey = arg("--from");
const toKey = arg("--to");
const toOwner = arg("--to-owner");
if (toOwner && !OWNERS.includes(toOwner)) {
  console.error(`--to-owner harus salah satu: ${OWNERS.join(", ")}`);
  process.exit(1);
}

const rupiah = (n) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
let db;
try {
  db = initAdminDb();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const accountSnap = await db.collection("accounts").where("isActive", "==", true).get();
const accounts = accountSnap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

if (!fromKey || !toKey) {
  console.log("Rekening aktif:\n");
  for (const a of accounts) {
    console.log(`  ${a.id}  ${a.name}  [${OWNER_LABELS[a.owner] ?? a.owner}]  ${rupiah(a.balance ?? 0)}`);
  }
  console.log('\nContoh: node scripts/merge-accounts.mjs --from "Pacaran (Jago)" --to "Jago Bersama"');
  process.exit(0);
}

let from;
let to;
try {
  from = findAccount(accounts, fromKey);
  to = findAccount(accounts, toKey);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Semua transaksi & transfer yang menyentuh rekening asal atau tujuan.
const byId = (snaps) => {
  const map = new Map();
  snaps.forEach((snap) => snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() })));
  return Array.from(map.values());
};
const txCol = db.collection("transactions");
const tfCol = db.collection("transfers");
const transactions = byId(
  await Promise.all([txCol.where("accountId", "==", from.id).get(), txCol.where("accountId", "==", to.id).get()])
);
const transfers = byId(
  await Promise.all([
    tfCol.where("fromAccountId", "==", from.id).get(),
    tfCol.where("toAccountId", "==", from.id).get(),
    tfCol.where("fromAccountId", "==", to.id).get(),
    tfCol.where("toAccountId", "==", to.id).get(),
  ])
);

let plan;
try {
  plan = planAccountMerge({
    from: { ...from, balance: from.balance ?? 0 },
    to: { ...to, balance: to.balance ?? 0 },
    toOwner,
    transactions,
    transfers,
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const finalOwner = plan.target.data.owner;
const movedCount = plan.transactionUpdates.filter((u) => u.data.accountId).length;
console.log(`Gabung "${from.name}" [${OWNER_LABELS[from.owner]}] → "${to.name}" [${OWNER_LABELS[finalOwner]}]\n`);
console.log(`  Transaksi dipindah       : ${movedCount}`);
console.log(`  Transaksi diperbarui     : ${plan.transactionUpdates.length - movedCount} (pemilik rekening tujuan berubah)`);
console.log(`  Transfer diarahkan ulang : ${plan.transferUpdates.length}`);
console.log(`  Transfer dihapus         : ${plan.transferDeletes.length} (antar kedua rekening ini)`);
console.log(
  `  Saldo "${to.name}"        : ${rupiah(to.balance ?? 0)} + ${rupiah(from.balance ?? 0)} = ${rupiah((to.balance ?? 0) + (from.balance ?? 0))}`
);
console.log(`  "${from.name}" dinonaktifkan (hilang dari app, saldo jadi 0)`);

if (!apply) {
  console.log("\nDry-run. Jalankan lagi dengan --apply untuk eksekusi.");
  process.exit(0);
}

const writer = createBatchWriter(db);
for (const u of plan.transactionUpdates) {
  await writer.queue((b) => b.update(txCol.doc(u.id), { ...u.data, updatedAt: FieldValue.serverTimestamp() }));
}
for (const u of plan.transferUpdates) {
  await writer.queue((b) => b.update(tfCol.doc(u.id), u.data));
}
for (const id of plan.transferDeletes) {
  await writer.queue((b) => b.delete(tfCol.doc(id)));
}
await writer.queue((b) =>
  b.update(db.collection("accounts").doc(plan.target.id), {
    ...plan.target.data,
    balance: FieldValue.increment(plan.target.balanceIncrement),
    updatedAt: FieldValue.serverTimestamp(),
  })
);
await writer.queue((b) =>
  b.update(db.collection("accounts").doc(plan.source.id), {
    ...plan.source.data,
    updatedAt: FieldValue.serverTimestamp(),
  })
);
await writer.flush();

console.log(`\nSelesai: "${from.name}" digabung ke "${to.name}".`);
