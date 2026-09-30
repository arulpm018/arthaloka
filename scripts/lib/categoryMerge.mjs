/**
 * Logika murni penggabungan kategori duplikat (sisa era kategori per pemilik).
 * Dipisah dari script supaya bisa di-test tanpa Firestore.
 */

/** Kunci duplikat: nama (lowercase, spasi dirapikan) + tipe. */
export function duplicateKey(category) {
  return `${category.name.trim().toLowerCase().replace(/\s+/g, " ")}|${category.type}`;
}

/**
 * @param {{ id: string, name: string, type: string, order?: number, budgetAmount?: number }[]} categories kategori aktif
 * @param {Record<string, number>} txCountByCategory jumlah transaksi per id kategori
 * @returns {{ keep: object, remove: object[], budgetAmount: number }[]}
 */
export function planCategoryMerges(categories, txCountByCategory) {
  const groups = new Map();
  for (const category of categories) {
    const key = duplicateKey(category);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(category);
  }

  const plans = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) =>
        (txCountByCategory[b.id] ?? 0) - (txCountByCategory[a.id] ?? 0) ||
        (a.order ?? 0) - (b.order ?? 0)
    );
    const [keep, ...remove] = sorted;
    plans.push({
      keep,
      remove,
      budgetAmount: Math.max(...group.map((c) => c.budgetAmount ?? 0)),
    });
  }
  return plans;
}
