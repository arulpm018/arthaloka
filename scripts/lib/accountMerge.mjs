/**
 * Logika murni penggabungan satu rekening ke rekening lain (mis. "Pacaran"
 * → "Jago Bersama"). Dipisah dari script supaya bisa di-test tanpa Firestore.
 */

const normalize = (s) => s.trim().toLowerCase();

/** Cari rekening aktif berdasarkan id atau nama persis (case-insensitive). */
export function findAccount(accounts, key) {
  const byId = accounts.find((a) => a.id === key);
  if (byId) return byId;
  const matches = accounts.filter((a) => normalize(a.name) === normalize(key));
  if (matches.length === 0) throw new Error(`Rekening "${key}" tidak ditemukan.`);
  if (matches.length > 1) {
    throw new Error(`Nama "${key}" dipakai ${matches.length} rekening — pakai id: ${matches.map((a) => a.id).join(", ")}`);
  }
  return matches[0];
}

/**
 * @param {{
 *   from: { id: string, name: string, owner: string, balance: number },
 *   to: { id: string, name: string, owner: string, balance: number },
 *   toOwner?: "arul" | "fifi" | "shared",
 *   transactions: { id: string, accountId: string }[],
 *   transfers: { id: string, fromAccountId: string, toAccountId: string }[],
 * }} input transaksi & transfer yang menyentuh rekening asal/tujuan
 */
export function planAccountMerge({ from, to, toOwner, transactions, transfers }) {
  if (from.id === to.id) throw new Error("Rekening asal dan tujuan sama.");
  const owner = toOwner ?? to.owner;
  const ownerChanged = owner !== to.owner;

  const transactionUpdates = [];
  for (const tx of transactions) {
    if (tx.accountId === from.id) {
      transactionUpdates.push({ id: tx.id, data: { accountId: to.id, accountName: to.name, owner } });
    } else if (tx.accountId === to.id && ownerChanged) {
      transactionUpdates.push({ id: tx.id, data: { owner } });
    }
  }

  const transferUpdates = [];
  const transferDeletes = [];
  for (const tf of transfers) {
    const touchesSource = tf.fromAccountId === from.id || tf.toAccountId === from.id;
    const touchesTarget = tf.fromAccountId === to.id || tf.toAccountId === to.id;
    if (!touchesSource && !(touchesTarget && ownerChanged)) continue;

    const newFrom = tf.fromAccountId === from.id ? to.id : tf.fromAccountId;
    const newTo = tf.toAccountId === from.id ? to.id : tf.toAccountId;
    // Transfer antara asal ↔ tujuan jadi transfer ke diri sendiri — hapus.
    // Saldo tidak terpengaruh karena saldo gabungan = jumlah kedua saldo.
    if (newFrom === newTo) {
      transferDeletes.push(tf.id);
      continue;
    }

    const data = {};
    if (tf.fromAccountId === from.id) Object.assign(data, { fromAccountId: to.id, fromAccountName: to.name });
    if (newFrom === to.id) Object.assign(data, { fromAccountOwner: owner, owner });
    if (tf.toAccountId === from.id) Object.assign(data, { toAccountId: to.id, toAccountName: to.name });
    if (newTo === to.id) Object.assign(data, { toAccountOwner: owner });
    transferUpdates.push({ id: tf.id, data });
  }

  return {
    transactionUpdates,
    transferUpdates,
    transferDeletes,
    target: {
      id: to.id,
      balanceIncrement: from.balance,
      data: { owner, category: owner === "shared" ? "shared" : "personal" },
    },
    source: { id: from.id, data: { isActive: false, balance: 0 } },
  };
}
