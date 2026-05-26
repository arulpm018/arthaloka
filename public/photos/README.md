# Personal Photos

Tempat drop foto pribadi untuk app personalization. Lihat
`docs/PERSONALIZATION_PLAN.md` §2.4 untuk spec lengkap.

## File yang diharapkan

| Path | Spec | Dipakai di |
|---|---|---|
| `arul.jpg` | 256×256, square, q85 | `<OwnerAvatar owner="arul" />` |
| `fifi.jpg` | 256×256, square, q85 | `<OwnerAvatar owner="fifi" />` |
| `couple/default.jpg` | 1080×1080 atau 16:9 | Login background, Together hero |

## Catatan

- Semua opsional — tanpa file, app fallback ke initial chip (avatar) atau
  gradient (login bg). Layout nggak rusak.
- Foto pribadi: pertimbangkan privasi sebelum commit. Repo ini private,
  jadi aman, tapi kalau di-share / fork, ganti ke Firebase Storage atau
  add `public/photos/*` ke `.gitignore`.
