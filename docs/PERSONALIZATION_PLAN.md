# 💕 Arthafiloka — Personalization Plan

> Bikin app ini berasa "milik kita berdua" — bukan finance app generik.
> Foto Arul, foto Fifi, foto bareng, plus meme GIF reaksi sesuai kondisi keuangan.

---

## 1. Filosofi & Guardrails

Tetap **Notion-minimalist** (lihat `arthafiloka-context.md` & `component-patterns.md`).
Personalisasi **bumbu**, bukan main course. Aturan main:

- ✅ Foto/meme muncul di moment yang **bermakna** (hero, milestone, alert) — bukan tebar di tiap row transaksi.
- ✅ Reaction meme **state-driven** (over budget → kucing kaget; nabung tercapai → joget). Bukan random.
- ✅ Semua aset opsional dengan fallback graceful (kalau gambar gagal load, layout nggak rusak).
- ✅ Touch hit-target & WCAG contrast tetep aman — gambar pakai `alt` deskriptif, bukan emoji-only.
- ✅ Performance: lazy-load + `next/image`, total weight aset < 2 MB di first paint.
- ❌ Jangan pakai meme yang mengandung teks Inggris doang kalau personalisasi-nya Indo. Pilih yang universal (kucing, kapibara, dll).

---

## 2. Asset Strategy

### 2.1 Strategi Sumber Asset — Hybrid

Ada 3 jalur, kita pakai kombinasi:

| Tipe asset | Sumber | Storage |
|---|---|---|
| Foto pribadi (Arul, Fifi, couple) | Drop manual oleh user | `public/photos/` (lokal) |
| Meme reaction (kucing nangis, stonks, dll) | **Tenor direct media URL** | Remote — config di `src/lib/constants/memes.ts` |
| Special celebration (wishlist 100% tercapai) | Tenor **embed** (boleh) | Remote dengan attribution |

**Kenapa Tenor untuk meme:**
- ✅ Update gampang — ganti URL, ga perlu commit gambar baru.
- ✅ CDN Tenor cepet, kompresi auto (GIF→MP4).
- ✅ Bundle repo tetep ringan.

**Kenapa lokal untuk foto pribadi:**
- ✅ Privasi — foto Arul/Fifi/couple jangan ada di server pihak ketiga.
- ✅ Selalu available, no broken link risk.

### 2.2 Tenor: Embed vs Direct URL — Default Pakai Direct URL

Embed Tenor (script `tenor.com/embed.js` + `<div class="tenor-gif-embed">`) **boleh dipake**, tapi ada cost yang signifikan kalau dipake di banyak tempat. Kita sebagian besar pakai **direct media URL** dengan `<MemeReaction>` component.

**Direct URL pattern (rekomendasi default):**
```
https://media.tenor.com/{ID}/{slug}.gif    ← classic GIF
https://media.tenor.com/{ID}/{slug}.mp4    ← jauh lebih ringan, jalan di iOS
```

Cara ambil: Tenor → tombol Share → "Copy GIF URL" atau "Copy MP4 URL".

**Trade-off (singkat):**

| Aspek | Direct URL + `<img>`/`<video>` | Embed iframe |
|---|---|---|
| Berat per render | ~50–500 KB (cuma asset) | + 30 KB script + iframe overhead |
| Layout shift | Zero (kita reserve aspect-ratio) | Ada (div kosong di-inject async) |
| Offline | Pecah | Pecah |
| Attribution Tenor | Manual di link | Otomatis tampil |
| Look-and-feel | Clean, sesuai Notion vibe | Ada Tenor "Sticker" frame |
| Banyak instance per page | Aman | Janky di mobile |

**Kapan boleh pakai embed:** spot one-shot yang butuh attribution mencolok (modal celebration wishlist tercapai). Sisanya pakai direct URL.

### 2.3 Konfigurasi CSP & next.config

Tenor butuh whitelist origin di Next config supaya `<img>`/`<video>` dan (opsional) script-nya tidak diblok. Tambahin ke `next.config.mjs`:

```js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'media.tenor.com' },
    { protocol: 'https', hostname: 'media1.tenor.com' },
    { protocol: 'https', hostname: 'c.tenor.com' },
  ],
},
```

Untuk embed (jika dipake): tambahin script-src CSP `https://tenor.com` dan frame-src `https://tenor.com` di response headers.

### 2.4 Folder & Konstanta

```
public/
├── photos/
│   ├── arul.jpg              # foto profile arul (square, 256px)
│   ├── fifi.jpg              # foto profile fifi
│   └── couple/
│       └── default.jpg       # primary couple photo (4:3 atau 1:1)
└── memes/                    # OPSIONAL — fallback offline assets
    └── empty/kucing-bingung.gif  # 1–2 essential aja
```

```ts
// src/lib/constants/memes.ts
export type MoodKey =
  | "broke" | "rich" | "warning"
  | "celebrate" | "sad" | "romance" | "empty";

export interface MemeAsset {
  type: "tenor-direct" | "tenor-embed" | "local";
  src: string;          // media URL atau path lokal
  alt: string;          // a11y wajib
  postId?: string;      // untuk embed
  format?: "gif" | "mp4";
  width?: number;
  height?: number;
}

export const MEMES_BY_MOOD: Record<MoodKey, MemeAsset[]> = {
  broke: [
    {
      type: "tenor-direct",
      src: "https://media.tenor.com/xxxxx/kucing-nangis.gif",
      alt: "Kucing nangis karena uang dikit",
      format: "gif",
      width: 320,
      height: 320,
    },
  ],
  // ... mood lain
};
```

### 2.5 Format & Optimasi

| Tipe | Format pilihan | Alasan |
|---|---|---|
| Foto profile | `.jpg` 256×256, q85 | Avatar kecil, ringan |
| Couple photo hero | `.jpg` 1080×1080 atau 4:3 | Pakai `next/image` + blur placeholder |
| Meme reaction | **MP4** dari Tenor (preferred) atau GIF | MP4 ~10x lebih kecil, mulus di mobile |

Untuk MP4 dari Tenor, render pakai:
```html
<video autoplay loop muted playsinline preload="metadata" />
```

`muted` + `playsinline` wajib biar autoplay jalan di iOS Safari.

---

## 3. Spot Personalisasi (Mapping ke Komponen Existing)

### 3.1 Login Page — `src/app/(auth)/login/page.tsx`
**Sekarang:** Logo SVG generic + text "Hanya untuk Arul & Fifi 💕".
**Tambah:**
- Foto couple jadi **background blur** atau hero image di atas card.
- Rotasi foto setiap reload (array of couple photos, pick random).
- Caption tetep: "Hanya untuk Arul & Fifi 💕".

```
┌────────────────────────────────┐
│ [foto couple — blur 8px, dim] │
│                                │
│   ┌──────────────────┐        │
│   │  Logo            │        │
│   │  Arthafiloka     │        │
│   │  [Login Google]  │        │
│   └──────────────────┘        │
└────────────────────────────────┘
```

### 3.2 Onboarding Role Picker — `src/app/(auth)/onboarding/page.tsx`
**Sekarang:** Button `👨 Arul` / `👩 Fifi` — emoji generic.
**Tambah:** Replace emoji dengan foto profile beneran. Hover/selected → tampil GIF version.

```tsx
// pseudocode
<Button>
  <Image src="/photos/arul.jpg" /> Arul
</Button>
```

### 3.3 Header Owner Indicator — `src/components/layout/Header.tsx`
**Sekarang:** Dot kecil pakai `OWNER_COLORS[owner]`.
**Tambah:** Optional `ownerAvatar` prop. Render foto bulet 24px di samping dot. Foto lebih kuat sebagai identitas owner section daripada warna doang.

### 3.4 Owner Switcher di BottomNav — `src/components/layout/BottomNav.tsx`
**Sekarang:** Icon `User` / `Heart` / `Users` dari lucide.
**Tambah:** Tampilkan avatar foto owner aktif (24px round) menggantikan icon. Dropdown long-press tetap tampil tiga opsi dengan avatar masing-masing.

Trade-off: avatar bulet di nav butuh resolusi yang konsisten — bikin component `<OwnerAvatar size="sm|md|lg" />` yang reuse di semua tempat.

### 3.5 Settings Profile Block — `src/app/(app)/settings/page.tsx`
**Sekarang:** Lucide `User` icon di placeholder.
**Tambah:** Render foto user dari `currentUser.photoURL` (atau fallback foto lokal berdasarkan `currentUser.role`). Klik foto → buka picker untuk upload foto baru (Phase 2, simpan ke Firebase Storage).

### 3.6 Together Page Hero — `src/app/(app)/together/page.tsx` via `OwnerOverview`
**Sekarang:** Header pakai `OWNER_SWITCHER` + total balance di body.
**Tambah:** Saat owner = `shared`, render **CoupleHero** card di atas summary:
- Foto couple full-width 16:9 atau 1:1 dengan radius 16px.
- Overlay subtle: "Berdua Sejak [tanggal jadian]" — bisa jadi field di settings.
- GIF kecil (40px) di pojok kanan bawah → ganti tergantung saldo "Pacaran" account (banyak → 💃, dikit → 🥺).

### 3.7 Owner Page Hero (Arul / Fifi) — `OwnerOverview`
**Sekarang:** "Total Balance" sebagai tipografi besar.
**Tambah:** Avatar + nama owner + meme reaction berdasarkan net bulan ini.

```
┌────────────────────────────────┐
│ [avatar 48px] Arul             │
│ Total: Rp 2,358,932            │
│ +Rp 8.5M  -Rp 3.2M  [meme 32px]│ ← meme kecil, sesuai net
└────────────────────────────────┘
```

### 3.8 Dashboard Hero — `src/components/dashboard/SummaryCards.tsx`
**Sekarang:** Hero card dengan total kekayaan + tap → breakdown sheet.
**Tambah:** Mood indicator di pojok hero — emoji/GIF kecil yang map ke total balance threshold:

| Threshold | Mood |
|---|---|
| > 100M IDR | 🤑 stonks |
| 50–100M | 😎 chill |
| 10–50M | 🙂 normal |
| < 10M | 😅 hati-hati |
| < 1M | 🥺 kucing nangis |

Threshold disimpan di `src/lib/constants/memeThresholds.ts`, customizable.

### 3.9 Budget Alerts — `src/components/dashboard/BudgetAlerts.tsx`
**Sekarang:** Icon `AlertTriangle` static di header.
**Tambah:** GIF reaksi yang escalate sesuai jumlah kategori over-budget:
- 1 kategori warning → 🤔 kapibara mikir
- 2+ kategori warning → 😬 kucing keringetan
- Ada kategori over (>100%) → 🔥 kucing kaget / dompet meledak

GIF rotate per render biar nggak monoton.

### 3.10 Wishlist Progress — `src/components/wishlist/`
**Sekarang:** Progress bar standar.
**Tambah:**
- 0–25%: foto/GIF nabung kalem.
- 25–75%: kapibara semangat.
- 75–99%: hampir nyampe — countdown vibe.
- 100% tercapai: **confetti GIF + foto couple** (karena ini tujuan bareng). Modal kecil muncul sekali, ada button "Yay rayain 🎉".

### 3.11 Empty States — `src/components/shared/EmptyState.tsx`
**Sekarang:** Lucide icon dalam circle muted.
**Tambah:** Optional `meme?: string` prop. Kalau provided, render image instead of icon. Default tetap icon (biar non-meme context masih clean).

```tsx
<EmptyState
  meme="/memes/empty/kucing-bingung.gif"
  title="Belum ada transaksi"
  description="Tambah expense pertama bulan ini"
/>
```

### 3.12 Transaction Filter — Empty Result
Saat user filter dan zero result: "Hmm, nggak ada yang nyangkut" + GIF kucing nyari.

### 3.13 Login Welcome Toast (Returning User)
Setelah login, cek jam:
- Pagi (5–11): "Pagi, [nama]" + GIF kopi.
- Siang (11–15): "Lapar nggak?" + GIF makan.
- Malam (18–22): "Udah bayar tagihan?" + GIF kapibara santai.

Pakai `sonner` toast yang udah ada. Skip kalau ngerasa toxic — bisa di-toggle di settings.

### 3.14 (Bonus) Per-Owner Theme Tint
Saat user login sebagai Fifi, dot owner di nav + accent halus pakai `OWNER_COLORS.fifi` (pink). Saat Arul, biru. Subtle tint, jangan ganti tema utama.

---

## 4. Komponen Baru yang Perlu Dibikin

| Component | Lokasi | Tugas |
|---|---|---|
| `OwnerAvatar` | `src/components/shared/OwnerAvatar.tsx` | Render foto bulet by `owner` prop. Fallback ke initial / OWNER_COLORS dot kalau foto gagal. Size: `sm` (24px) / `md` (40px) / `lg` (80px). |
| `CoupleHero` | `src/components/shared/CoupleHero.tsx` | Hero foto couple dengan overlay caption. Pakai `next/image` + blur placeholder. |
| `MemeReaction` | `src/components/shared/MemeReaction.tsx` | Render GIF berdasarkan `mood` prop. Smart switching antara `<video>` (MP4 Tenor — default), `<img>` (GIF lokal/remote), atau `<TenorEmbed>` sesuai `MemeAsset.type`. Built-in lazy + reserve aspect-ratio (no CLS). |
| `TenorEmbed` | `src/components/shared/TenorEmbed.tsx` | Wrapper untuk Tenor embed script. Cuma di-load sekali per session (idempotent script injection). Pakai HANYA di spot khusus (modal celebration). |
| `getMoodForBalance(balance)` | `src/lib/utils/memeMood.ts` | Util pure function — ambil number, return `MoodKey`. |
| `getMoodForBudget(percentage)` | `src/lib/utils/memeMood.ts` | Same, untuk budget. |
| `getMoodForNet(income, expense)` | `src/lib/utils/memeMood.ts` | Same, untuk net bulanan. |

### 4.1 Sketch `<MemeReaction>`

```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { MEMES_BY_MOOD, MoodKey, MemeAsset } from "@/lib/constants/memes";

interface MemeReactionProps {
  mood: MoodKey;
  size?: "sm" | "md" | "lg";   // 32 / 64 / 128 px
  seed?: string;                // deterministic pick (hindari jitter)
  className?: string;
}

export const MemeReaction = ({ mood, size = "md", seed, className }: MemeReactionProps) => {
  const [asset, setAsset] = useState<MemeAsset | null>(null);

  useEffect(() => {
    const list = MEMES_BY_MOOD[mood];
    if (!list?.length) return;
    const idx = seed
      ? [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % list.length
      : Math.floor(Math.random() * list.length);
    setAsset(list[idx]);
  }, [mood, seed]);

  if (!asset) return <div className={cn(sizeClass[size], className)} aria-hidden />;

  const dim = { sm: 32, md: 64, lg: 128 }[size];
  const common = {
    width: dim,
    height: dim,
    className: cn("rounded-md object-cover", sizeClass[size], className),
  };

  if (asset.type === "tenor-direct" && asset.format === "mp4") {
    return (
      <video
        {...common}
        src={asset.src}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={asset.alt}
      />
    );
  }

  // GIF (Tenor direct or local)
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...common} src={asset.src} alt={asset.alt} loading="lazy" />;
};

const sizeClass = { sm: "w-8 h-8", md: "w-16 h-16", lg: "w-32 h-32" };
```

### 4.2 Sketch `<TenorEmbed>` (one-shot)

```tsx
"use client";

import { useEffect } from "react";

interface TenorEmbedProps {
  postId: string;
  aspectRatio?: number;  // default 1
  className?: string;
}

let scriptLoaded = false;

export const TenorEmbed = ({ postId, aspectRatio = 1, className }: TenorEmbedProps) => {
  useEffect(() => {
    if (scriptLoaded) {
      // re-trigger Tenor parser kalau script udah ada
      // @ts-expect-error tenor's global API
      window.tenorEmbed?.parse?.();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://tenor.com/embed.js";
    s.async = true;
    s.onload = () => { scriptLoaded = true; };
    document.body.appendChild(s);
  }, []);

  return (
    <div
      className={className}
      style={{ aspectRatio }}  // reserve space — hindari CLS
    >
      <div
        className="tenor-gif-embed"
        data-postid={postId}
        data-share-method="host"
        data-aspect-ratio={String(aspectRatio)}
        data-width="100%"
      />
    </div>
  );
};
```

Konfigurasi list meme per mood dipisah di `src/lib/constants/memes.ts` (lihat Section 2.4). Important: **deterministic per render-cycle**. Random meme tiap re-render = jitter visual nggak enak. Solusi: pick once di parent, pass via prop, atau seed pakai `format(date, 'yyyyMMdd')` biar gak ganti dalam 1 hari.

---

## 5. Skema Data yang Perlu Diperluas

### User document — nambah field opsional

```ts
interface User {
  // ... existing
  preferences: {
    // ... existing
    showMemes?: boolean;        // default true, bisa di-off lewat settings
    customAvatarUrl?: string;   // override foto upload sendiri (Phase 2)
  };
  // optional, untuk together page
  relationship?: {
    anniversaryDate?: Timestamp;  // tampil di CoupleHero overlay
  };
}
```

### Settings page — toggle baru

- ☑️ Tampilkan meme reaction
- ☑️ Foto couple di halaman Bersama
- 📅 Tanggal jadian (untuk caption "Berdua sejak ...")

---

## 6. Phasing — Roll-out Aman

### Phase 1 — Foundation (1 sitting)
- [ ] Bikin folder `public/photos/`, `public/memes/` + drop foto kamu (placeholder dulu).
- [ ] Component `OwnerAvatar` + util `memeMood`.
- [ ] Constants: `MEMES_BY_MOOD`, threshold balance/budget.
- [ ] Toggle `showMemes` di settings (default ON).

### Phase 2 — Profile Touch (1 sitting)
- [ ] Login: foto couple sebagai background blur.
- [ ] Onboarding: button role pakai foto.
- [ ] Settings profile: render foto + ganti placeholder.
- [ ] Header: tambah `ownerAvatar` di owner pages.

### Phase 3 — Meme Reactions (1 sitting)
- [ ] Dashboard hero: mood indicator.
- [ ] BudgetAlerts: GIF reaction.
- [ ] Empty states: prop `meme` di shared `EmptyState`.

### Phase 4 — Together Page Special (1 sitting)
- [ ] CoupleHero component.
- [ ] Pacaran tab: GIF mood by saldo.
- [ ] Anniversary date di settings.

### Phase 5 — Wishlist & Celebrations (1 sitting)
- [ ] Wishlist progress milestone GIF.
- [ ] Confetti modal saat 100% tercapai.

### Phase 6 — Optional Polish
- [ ] Rotate couple photos di login.
- [ ] Welcome toast time-based.
- [ ] Owner switcher pakai foto kecil.

---

## 7. Pertanyaan untuk Kamu Sebelum Eksekusi

1. **Berapa banyak foto couple** yang kamu mau drop? (1 sebagai default, atau koleksi 3–5 untuk rotasi di login?)
2. **Tanggal jadian** mau ditaruh hardcode di constant atau editable di settings?
3. **Toggle meme** — default ON atau OFF? (Aku saranin ON, plus user bisa off di settings.)
4. **Resolusi foto profile** — kamu kasih JPG square aja atau perlu aku auto-crop?
5. Mau aku **mulai dari Phase 1** dulu (pasang foundation, kamu drop aset)? Atau prefer gue scaffold semua component shell + pakai placeholder dulu, lo isi aset belakangan?

---

## 8. Risk & Mitigation

| Risk | Mitigation |
|---|---|
| Bundle size membengkak | Foto di `public/`, di-load on-demand. Total < 2 MB. Pakai `next/image` `priority` cuma untuk hero. |
| Meme jadi annoying | Toggle `showMemes` + threshold sengaja konservatif (jangan setiap saldo turun → meme). |
| GIF lag di mobile | Limit 1 GIF per screen. Untuk kasus banyak (e.g., budget alerts), cukup 1 di header section. |
| Aset privat ke-commit ke repo public | `public/photos/` di-`.gitignore` kalau repo public, atau host di Firebase Storage. **Meme dari Tenor: aman** karena cuma URL string. |
| GIF format inconsistency | Standar: prefer MP4 dari Tenor (lebih ringan), fallback GIF. Max 720px width per asset. |
| Tenor URL pecah (broken link) | Bikin **fallback chain** di `<MemeReaction>`: kalau `onError`, render emoji unicode default per mood. Untuk meme essential (e.g., empty state), simpan local copy di `public/memes/empty/` sebagai backup. |
| Tenor down / region-blocked | Sama — fallback ke emoji + local copy. App nggak crash. |

---

## 9. Quick Wins (Kalau Cuma Sempat 30 Menit)

Kalau mau impact gede tanpa banyak kerjaan, prioritas:
1. Login background couple photo.
2. Dashboard hero mood emoji (cukup pakai emoji unicode dulu, GIF nyusul).
3. Settings profile foto.

Tiga itu udah bikin app berasa "milik kita berdua" tanpa nunggu kurasi meme lengkap.

---

*Disusun: Mei 2026 — pelengkap `plan.md` (system design) dan `UI_UX_CRITIQUE_V2_PLAN.md`.*
