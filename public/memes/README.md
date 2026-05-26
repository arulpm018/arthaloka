# Local Meme Fallbacks

Folder ini OPSIONAL. Strategi default: meme di-load dari Tenor direct URL
(via `src/lib/constants/memes.ts`). Folder ini buat aset essential yang
butuh available offline / saat Tenor down.

Saran isi (kalau mau):

- `empty/kucing-bingung.gif` — fallback untuk empty states (mood `empty`).
- `celebrate/confetti.gif` — modal saat wishlist 100% (mood `celebrate`).

Cara pakai: register di `MEMES_BY_MOOD` dengan `type: "local"`:

```ts
empty: [{
  type: "local",
  src: "/memes/empty/kucing-bingung.gif",
  alt: "Kucing bingung lihat layar kosong",
  format: "gif",
  width: 240, height: 240,
}],
```

Tanpa file di sini, `<MemeReaction>` fallback ke emoji unicode dari
`MOOD_EMOJI`. Aman zero-day.
