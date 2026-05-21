---
inclusion: auto
---

# Arthaloka — Project Context

Arthaloka adalah personal finance tracker web app untuk Arul & Fifi (pasangan). Referensi utama system design ada di:

#[[file:plan.md]]

## Quick Reference

- **Nama project**: Arthaloka ("Artha" = harta, "Loka" = dunia)
- **Tech stack**: Next.js 14 (App Router) + Tailwind + shadcn/ui + Firebase (Auth + Firestore) + Vercel
- **Users**: Hanya 2 orang (Arul & Fifi), free tier Firebase cukup
- **Design**: Notion-inspired, mobile-first, bottom sheet forms
- **Database**: Firestore NoSQL dengan denormalized fields
- **State**: Zustand + Firestore realtime listeners
- **Balance updates**: Atomic batch writes (transaction + balance dalam 1 batch)
- **Auth**: Firebase Auth (email/password + Google), partner linking via invite code
- **Deploy**: Vercel (auto-deploy from GitHub main branch)

## Conventions

- Semua amount dalam IDR (integer, no decimal)
- Owner values: "arul" | "fifi" | "shared"
- Soft delete (isActive: false), bukan hard delete
- Denormalize accountName & categoryName di transactions (hemat reads)
- Bottom sheets untuk semua forms (bukan page navigation)
- Mobile breakpoint: < 768px (bottom nav), Desktop: >= 768px (sidebar)
