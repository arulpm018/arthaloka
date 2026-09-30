# Redesign: Keuangan Rumah Tangga Tunggal

Tanggal: 2026-09-30 · Status: disetujui di chat, menunggu review spec

## Tujuan

Arul & Fifi sudah satu rumah tangga. App cukup satu tampilan keuangan bersama,
tetap tahu **rekening milik siapa**, dengan budget bersama dan alur catat yang
minimalis supaya tidak kewalahan. Fitur non-keuangan dibuang. Asisten AI cukup
teks, pakai DeepSeek (lebih cepat). Notifikasi muncul di HP beneran.

### Kriteria sukses

1. Tidak ada lagi halaman/pilihan Arul/Fifi/Bersama; semua data tampil bersama.
2. Rekening tetap berlabel pemilik (Arul/Fifi/Bersama) dan dikelompokkan per pemilik.
3. Catat pengeluaran = nominal → kategori → Simpan (3 tap), tanpa field wajib lain.
4. Budget per kategori berlaku otomatis tiap bulan; Beranda menampilkan sisa budget bulan ini.
5. Chat AI teks-only via DeepSeek dari Vercel; tanpa service Python.
6. Push notification tampil di HP (Android Chrome PWA; iPhone iOS ≥16.4 via Home Screen) untuk 4 pemicu.
7. `npm test`, `npm run lint`, `npm run build` hijau.

### Keputusan (dari user)

| Topik | Keputusan |
|---|---|
| Login | Tetap login Google masing-masing; satu tampilan rumah tangga |
| Budget | Limit per kategori, berulang tiap bulan, tanpa scope pemilik |
| Form catat | Wajib nominal + kategori; rekening/tanggal/catatan default |
| Notifikasi | Semua: pasangan mencatat, budget 80/100%, pengingat harian, ringkasan bulanan |
| AI | Pindah ke API route Next.js/Vercel, DeepSeek, teks saja |
| Deploy | Vercel saja; Docker & ai-service tidak dipakai lagi |

## Fase

Tiap fase bisa di-deploy sendiri, dikerjakan berurutan.

1. **Pangkas** modul non-keuangan.
2. **Rumah tangga tunggal**: model data, halaman, form catat, budget. (prioritas utama)
3. **AI** DeepSeek teks-only di Vercel.
4. **Push notification**.

---

## Fase 1 — Pangkas modul non-keuangan

Hapus seluruh file, route, hook, lib, type, schema, test milik:

- **Produktivitas**: `src/app/productivity/**`, `src/components/productivity/**`,
  `useTasks/useEvents/useHabits`, `lib/firestore/{tasks,events,habits}.ts`,
  `lib/utils/{productivity,habitIcons}.ts`, schema task/event/habit,
  `types/productivity.ts`, `lib/utils/__tests__/productivity.test.ts`.
- **Wishlist**: `src/app/(app)/wishlist`, `src/components/wishlist/**`,
  `components/categories/WishlistCategoryList.tsx`, `useWishlist*`,
  `lib/firestore/wishlist*.ts`, `lib/utils/wishlist.ts`, schema wishlist*,
  `types/wishlist.ts`, test wishlist (unit + property), `.kiro/specs/wishlist`.
  Lepas coupling di store (`wishlistAddRequest`, `prefillSource`,
  `openSheetWithPrefill`), `TransactionSheet`, `ActionSheet`, `QuickAddDropdown`,
  `GlobalFAB`, `AppShell`, `BottomNav`, `Sidebar`, halaman kategori.
- **Meme**: `MemeReaction`, `CustomMemesProvider`, `MemeManager(+Sheet)`,
  `useCustomMemes`, `lib/firestore/memes.ts`, `constants/{memes,memeThresholds}.ts`,
  `utils/memeMood.ts`, `types/meme.ts`, `public/memes`, tenor `remotePatterns`
  di `next.config.mjs`, prop `mood` di `EmptyState`, `preferences.showMemes`.
- **Foto couple / anniversary**: `CoupleHero`, `CouplePhotoProvider`,
  `useCouplePhoto`, `lib/firestore/couplePhoto.ts`, `CouplePhotoSection/Sheet`,
  `AnniversaryRow`, `usersService.updateRelationship`, `User.relationship`.
  `ImageUploader`/`imageProcessing` tetap kalau masih dipakai `AvatarSection`.
- **Launcher**: `src/app/page.tsx` jadi redirect ke `/dashboard`; hapus
  `AppSwitcher` dan semua referensinya (Header, DesktopTopbar,
  CollapsibleSidebar, SidebarUserCard "Ganti Modul", More). Login & onboarding
  redirect ke `/dashboard`. `manifest.start_url` = `/dashboard`.
- **SettingsScreen**: buang prop `module` dan section non-keuangan.
- **Halaman per-pemilik & navigasi baru** (dipindah dari fase 2 supaya tidak
  mengedit file yang akan dihapus): hapus `/arul`, `/fifi`, `/together`,
  `/more`, `OwnerOverview`, `OwnerSwitcherTitle`, `GlobalFAB`, `FAB`,
  `ActionSheet`, `QuickAddDropdown`. Navigasi bawah baru langsung dipasang
  (item Budget menunjuk `/categories` sampai fase 2 membuat `/budget`).
  Route lama di-redirect ke `/dashboard` lewat `next.config.mjs`.

Data Firestore koleksi lama (`tasks`, `events`, `habits`, `wishlist*`, `memes`,
`appConfig`) **tidak dihapus**; rules-nya dibiarkan. Hanya kode yang dibuang.

Verifikasi: `grep` nama-nama di atas kosong; test/lint/build hijau.

---

## Fase 2 — Rumah tangga tunggal

### Model data (tanpa migrasi skema)

| Field | Perilaku baru |
|---|---|
| `Account.owner` | Tetap `arul/fifi/shared`; label "Rekening Arul / Fifi / Bersama" |
| `Transaction.owner` | Tidak dipilih user; diisi otomatis = `owner` rekening terpilih (rules `isValidTransaction` tetap valid) |
| `Transaction.ownerUid` | Tetap = uid pencatat; ditampilkan "dicatat Arul/Fifi" |
| `Transfer.owner` | Diisi otomatis = `fromAccountOwner` |
| `Category.budgetScope` | Diabaikan di seluruh app (field lama dibiarkan; kategori baru tetap diisi `"shared"` agar data konsisten) |
| `Category.budgetAmount` | Limit pengeluaran **per bulan**, berlaku tiap bulan |

Semua query `where("owner", ...)` dihapus dari `useAccounts`, `useTransactions`,
`useSummary`, `useMonthTransactions`, `useTransactionSummary`; filter owner
client-side di `useTransfers` dihapus. `TxFilters.owner` & `TransferFilters.owner`
dihapus. `useAppStore.defaultOwner` dihapus.

`User.role` tetap dipakai untuk: label pemilik rekening, fallback rekening
default, nama pencatat, dan (fase 4) menentukan pasangan.

### Script rapikan kategori duplikat

`scripts/merge-duplicate-categories.mjs` (Node, `firebase-admin`, service
account lewat env `FIREBASE_SERVICE_ACCOUNT` atau path):

- Kelompokkan kategori aktif berdasarkan `(lowercase(trim(name)), type)`.
- Default **dry-run**: cetak grup duplikat, kategori yang dipertahankan (yang
  paling banyak transaksinya; seri → `order` terkecil), jumlah transaksi yang
  akan dipindah, dan budget hasil gabungan (**maks** dari grup).
- `--apply`: update `categoryId/categoryName/categoryIcon` transaksi ke kategori
  yang dipertahankan (batch ≤ 450), set `budgetAmount` = maks, set kategori
  lain `isActive: false`.
- Dijalankan manual oleh user sekali setelah fase 2 deploy.

### Informasi arsitektur

Navigasi bawah (mobile): **Beranda · Transaksi · [+] · Budget · Rekening**.
Sidebar desktop: item sama + Rekap + Settings. Settings dibuka dari avatar di
header (mobile) / kartu user sidebar (desktop).

| Route | Isi |
|---|---|
| `/dashboard` Beranda | Kartu utama "Sisa budget {bulan}: Rp X" + progress + "jatah Rp Y/hari" (sisa ÷ hari tersisa termasuk hari ini; kalau sisa ≤ 0 tampil "Lewat Rp Z"); daftar kategori ≥80% (maks 3, link ke Budget); 5 transaksi terakhir; total saldo kecil + toggle mata; link Rekap bulanan |
| `/transactions` | Seperti sekarang (list + tab kalender). Chip filter **Pemilik → Rekening**. Item menampilkan "dicatat X" |
| `/budget` (baru, menggantikan `/categories`) | Kategori pengeluaran: nama, progress bulan ini (terpakai / limit), tanpa limit tampil "Tanpa limit". Tap → sheet edit (nama, ikon, limit). Section bawah: kategori pemasukan (tanpa progress). Tombol tambah kategori |
| `/accounts` Rekening | Grup **Arul / Fifi / Bersama**, subtotal per grup + total. Form rekening tetap punya pilihan pemilik |
| `/recap` | Tetap, dibuka dari Beranda / sidebar |
| `/settings` | Profil, tema, notifikasi (fase 4), logout |

Dihapus: `/arul`, `/fifi`, `/together`, `/more`, `/categories`,
`OwnerOverview`, `OwnerSwitcherTitle`, owner switcher long-press BottomNav
(beserta `useLongPress` kalau jadi tak terpakai), grouping owner di
`SummaryCards` (diganti komponen Beranda baru). `OwnerAvatar` disederhanakan
(tanpa foto couple) kalau masih dipakai.

### Budget

`useBudgetStatus(month)` dipertahankan (sudah tanpa filter owner): hitung
terpakai per kategori expense bulan itu. Tambahan turunan:

- `totalBudget` = Σ `budgetAmount` kategori expense aktif yang > 0.
- `totalSpentBudgeted` = Σ terpakai pada kategori ber-limit.
- `remaining = totalBudget − totalSpentBudgeted`.
- `perDay = max(0, remaining) / hariTersisa` (termasuk hari ini).
- Status per kategori: `normal` <80%, `warning` ≥80%, `over` ≥100%
  (ambang 75% lama diganti 80% agar sama dengan notifikasi).

Pengeluaran kategori tanpa limit tidak dihitung ke sisa budget, tapi tetap
tampil di Rekap. Logika hitung dipindah ke fungsi murni
`lib/utils/budget.ts` supaya bisa di-test.

### Form catat (`TransactionSheet`)

Satu sheet, segmented **Keluar · Masuk · Transfer** di atas.

Keluar/Masuk:
1. Nominal besar (autofocus, keyboard angka).
2. Grid kategori sesuai tipe, urut **paling sering dipakai 90 hari terakhir**
   (dihitung dari transaksi yang sudah di-load; fallback `order`), tampil 8 +
   tombol "⋯" untuk semua + "Kategori baru" inline.
3. Baris ringkas: chip **Rekening** (default: rekening terakhir yang dipakai di
   perangkat ini — `localStorage` `lastAccountId`; fallback rekening pertama
   milik `role` user; fallback rekening pertama) dan chip **Tanggal** (default
   hari ini). Tap chip → picker.
4. "+ catatan" (opsional). `name` transaksi = catatan kalau diisi, kalau kosong
   = nama kategori.
5. Simpan aktif begitu nominal > 0 dan kategori terpilih.

Field Pemilik dihapus. Kategori tidak lagi difilter per scope.
`preferences.defaultAccountId` dan pengaturannya di Settings dihapus (diganti
rekening terakhir).

Transfer: nominal, dari, ke, tanggal, catatan opsional (`TransferSheet` digabung
sebagai tab; logika simpan tetap).

Edit transaksi memakai sheet yang sama, terisi data lama.

Entry point: tombol **+** di tengah navigasi bawah (mobile) & tombol "Catat"
di topbar (desktop) langsung membuka sheet di tab Keluar — tanpa menu pilihan.
Prometheus (AI) dibuka dari ikon maskot di header mobile / tombol topbar desktop.
Header mobile juga memuat avatar → Settings.
`/dashboard?add=1` membuka sheet (dipakai notifikasi pengingat).

### Test fase 2

- `lib/utils/budget.ts`: sisa, per hari, status 80/100, kategori tanpa limit, bulan berjalan vs lampau.
- Urutan kategori tersering dipakai (fungsi murni).
- Resolusi rekening default (fungsi murni).
- Script merge: fungsi pengelompokan duplikat + pemilihan kategori yang dipertahankan (murni, di-export).
- Verifikasi manual di browser: catat 3 tap, Beranda/Budget/Rekening benar.

---

## Fase 3 — Asisten AI DeepSeek (teks saja)

### Alur

HP → `POST /api/ai/chat` (header `Authorization: Bearer <Firebase ID token>`,
body `{ messages: {role: "user"|"assistant", content}[] }` — maks 10 giliran
terakhir) → verifikasi token + whitelist email (`firebase-admin`) → loop
DeepSeek + tool (maks 5 putaran) → respons `{ reply, actions, model }`
(bentuk sama dengan sekarang). `export const maxDuration = 60`.

### DeepSeek

- `fetch` ke `https://api.deepseek.com/chat/completions` (OpenAI-compatible), tanpa SDK.
- Model env `DEEPSEEK_MODEL`, default `deepseek-flash`; `thinking: {type: "disabled"}` untuk latensi rendah.
- Env `DEEPSEEK_API_KEY`.
- System prompt diadaptasi dari `ai-service/app/agent_service.py` (bahasa santai,
  ringkas, normalisasi nominal/tanggal, langsung eksekusi pencatatan), tanpa
  aturan owner/produktivitas/wishlist; disisipi tanggal hari ini (Asia/Jakarta),
  nama & role user, daftar rekening (nama + pemilik) dan kategori aktif agar
  model jarang perlu memanggil `list_*`.
- Error DeepSeek/timeout → 502 dengan pesan singkat Indonesia.

### Tool (8) — `src/lib/ai/tools.ts`

| Tool | Fungsi |
|---|---|
| `list_accounts` | Nama, pemilik, saldo |
| `list_categories(type?)` | Nama, tipe, limit |
| `get_monthly_summary(month?)` | Masuk/keluar/per kategori bulan itu |
| `add_transactions(items[])` | 1..n item `{type, amount, name?, category, account?, date?}`; kategori belum ada → dibuat; rekening tidak disebut → rekening default user; `owner` = pemilik rekening; `ownerUid` = uid token; saldo via batch + `FieldValue.increment` memakai `computeBalanceDelta` |
| `add_transfer` | from/to rekening (fuzzy), nominal, tanggal |
| `delete_transaction(name?, amount?)` | Hapus transaksi terbaru yang cocok + balik saldo |
| `create_account` | nama, tipe, pemilik, saldo awal |
| `create_category` | nama, tipe, limit opsional |

Helper murni (`src/lib/ai/parse.ts`): normalisasi nominal ("25rb", "25k",
"1,5jt", "1.500.000"), parsing tanggal ("hari ini", "kemarin", ISO),
pencocokan nama toleran (case/spasi/substring).

Setelah `add_transactions` sukses → panggil fungsi notifikasi fase 4
(no-op sebelum fase 4 ada).

### Client

- `AiAssistantSheet`: hapus mic/MediaRecorder/voice; riwayat pesan di state
  komponen; kirim 10 giliran terakhir; tombol reset = kosongkan state.
- `lib/ai/client.ts`: hanya `sendChat(messages)` dengan ID token.

### Dihapus

`ai-service/`, `Dockerfile`, `docker-compose.yml`, `docker-start.sh`,
`.dockerignore`, `.env.production.example` (khusus Docker), `lib/ai/service.ts`,
route `/api/ai/{voice,reset,ping}`, entri gitignore Python. Env
`AI_SERVICE_URL`, `AI_SERVICE_KEY`, `GEMINI_API_KEY` tidak dipakai lagi.

### Server Firebase Admin

`src/lib/firebase-admin.ts`: init sekali dari env `FIREBASE_SERVICE_ACCOUNT`
(JSON satu baris); `verifyRequest(req)` → `{uid, email}` atau 401; whitelist
dari `ALLOWED_EMAILS` (server) — fallback `NEXT_PUBLIC_ALLOWED_EMAILS`.

### Test fase 3

- `parse.ts` (nominal, tanggal, fuzzy).
- Loop chat dengan `fetch` di-mock: tool call → eksekusi (Firestore di-mock) → balasan final; batas 5 putaran.
- Route menolak tanpa token / email di luar whitelist.

---

## Fase 4 — Push notification (Web Push)

### Langganan

- `public/sw.js`: event `push` → `showNotification(title, {body, tag, data:{url}})`;
  `notificationclick` → fokus tab app atau buka `url`. Tanpa cache offline.
- Registrasi SW di client (Providers) saat app dimuat.
- Settings → toggle **"Notifikasi di HP ini"**: `Notification.requestPermission()`
  → `pushManager.subscribe({userVisibleOnly: true, applicationServerKey})` →
  `POST /api/push/subscribe`. Matikan → `unsubscribe()` + `DELETE /api/push/subscribe`.
  iPhone non-standalone → teks "Tambahkan ke Home Screen dulu (Share → Add to Home Screen)".
  Browser tanpa dukungan → toggle nonaktif + penjelasan.
- Firestore `pushSubscriptions/{sha256(endpoint)}` = `{uid, endpoint, keys, userAgent, createdAt}`.
  Hanya diakses server (Admin SDK); client tidak punya akses (rules default deny — tidak perlu ubah rules).

### Pengirim

`src/lib/push/send.ts`: `sendToUids(uids, payload)` via `web-push` (VAPID);
kirim paralel; status 404/410 → hapus langganan. Kegagalan kirim dicatat
(`console.error`), tidak menggagalkan request pemanggil.

### Pemicu

| Notif | Pemicu | Penerima | URL |
|---|---|---|---|
| Pasangan mencatat — "Fifi catat Rp50.000 · Makan (BCA Fifi)"; batch AI >1 item → "Arul catat 5 transaksi · Rp X" | Client setelah create transaksi sukses → `POST /api/notify/transaction {transactionIds}` (fire-and-forget, ID token). AI memanggil fungsi server yang sama langsung | Semua user kecuali pencatat | `/transactions` |
| Budget — "Makan sudah 80% (Rp1,6jt / 2jt)" / "Makan lewat budget" | Request yang sama, untuk transaksi expense berkategori ber-limit: hitung terpakai bulan ini; untuk tiap ambang (80, 100) yang tercapai, `create()` dokumen `notifLog/{YYYY-MM}_{categoryId}_{ambang}` — sukses → kirim, sudah ada → lewati | Berdua | `/budget` |
| Pengingat harian — "Udah catat pengeluaran hari ini?" | Vercel Cron `0 14 * * *` → `GET /api/cron/daily-reminder`; user yang belum punya transaksi dengan `createdAt` hari ini (WIB) | Per orang | `/dashboard?add=1` |
| Ringkasan bulanan — "September: keluar Rp X, masuk Rp Y. Paling boros: Makan" | Vercel Cron `0 1 1 * *` → `GET /api/cron/monthly-summary` | Berdua | `/recap` |

- Cron diamankan `Authorization: Bearer ${CRON_SECRET}` (standar Vercel Cron).
- Hobby plan: cron bisa jalan kapan saja di dalam jam terjadwal (21:00–21:59 WIB, 08:00–08:59 WIB).
- Query Firestore hanya rentang `date`/`createdAt`, filter lain di memori → tidak perlu index baru.
- Edit/hapus transaksi dan transfer tidak memicu notifikasi.
- Batasan diterima: transaksi yang dicatat saat HP offline tidak memicu notifikasi pasangan/budget.
- Zona waktu tetap `Asia/Jakarta`.

### Konfigurasi

- `vercel.json`: dua entri `crons`.
- Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  (`mailto:arulpm010@gmail.com`), `CRON_SECRET`. Generate VAPID:
  `npx web-push generate-vapid-keys`.
- Dependency baru: `web-push` (+ `@types/web-push`).

### Test fase 4

- Murni: ambang tercapai, rentang hari & bulan WIB, format teks notif (Rupiah ringkas).
- Route cron: tanpa/salah `CRON_SECRET` → 401; dengan Firestore & web-push di-mock → penerima benar.
- Manual: toggle di HP Android & iPhone, tiap pemicu dicoba sekali setelah deploy.

---

## Di luar cakupan

- Budget berbeda per bulan (override bulanan), budget total terpisah.
- Streaming respons AI, input suara.
- Cache offline service worker / antrean notifikasi offline.
- Hapus data Firestore koleksi lama.
- Preferensi notifikasi per jenis (cukup on/off per HP).

## Langkah manual user

1. Isi env di Vercel: `FIREBASE_SERVICE_ACCOUNT`, `DEEPSEEK_API_KEY`,
   `ALLOWED_EMAILS`, VAPID ×3, `CRON_SECRET`.
2. Jalankan `scripts/merge-duplicate-categories.mjs` (dry-run lalu `--apply`).
3. Nyalakan notifikasi di Settings pada tiap HP.
