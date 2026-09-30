#!/usr/bin/env node
/**
 * Gabungkan kategori duplikat (nama + tipe sama) sisa era kategori per pemilik.
 *
 *   node scripts/merge-duplicate-categories.mjs           # dry-run (hanya tampilkan rencana)
 *   node scripts/merge-duplicate-categories.mjs --apply   # eksekusi
 *
 * Kredensial: lihat scripts/lib/admin.mjs.
 */
import { createBatchWriter, initAdminDb } from "./lib/admin.mjs";
import { planCategoryMerges } from "./lib/categoryMerge.mjs";

const apply = process.argv.includes("--apply");
let db;
try {
  db = initAdminDb();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const catSnap = await db.collection("categories").where("isActive", "==", true).get();
const categories = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

const txSnap = await db.collection("transactions").select("categoryId").get();
const txCount = {};
const txIds = {};
for (const d of txSnap.docs) {
  const categoryId = d.get("categoryId");
  if (!categoryId) continue;
  txCount[categoryId] = (txCount[categoryId] ?? 0) + 1;
  (txIds[categoryId] ??= []).push(d.id);
}

const plans = planCategoryMerges(categories, txCount);
if (plans.length === 0) {
  console.log("Tidak ada kategori duplikat. Selesai.");
  process.exit(0);
}

for (const p of plans) {
  console.log(
    `\n• ${p.keep.name} [${p.keep.type}] → pertahankan ${p.keep.id} (${txCount[p.keep.id] ?? 0} transaksi), limit ${p.budgetAmount}`
  );
  for (const r of p.remove) {
    console.log(`    gabungkan ${r.id} (scope ${r.budgetScope ?? "-"}, ${txCount[r.id] ?? 0} transaksi)`);
  }
}

if (!apply) {
  console.log("\nDry-run. Jalankan lagi dengan --apply untuk eksekusi.");
  process.exit(0);
}

const { queue, flush } = createBatchWriter(db);

for (const p of plans) {
  for (const r of p.remove) {
    for (const txId of txIds[r.id] ?? []) {
      await queue((b) =>
        b.update(db.collection("transactions").doc(txId), {
          categoryId: p.keep.id,
          categoryName: p.keep.name,
          categoryIcon: p.keep.icon,
        })
      );
    }
    await queue((b) => b.update(db.collection("categories").doc(r.id), { isActive: false }));
  }
  await queue((b) =>
    b.update(db.collection("categories").doc(p.keep.id), { budgetAmount: p.budgetAmount, budgetScope: "shared" })
  );
}
await flush();

console.log(`\nSelesai: ${plans.length} grup kategori digabung.`);
