# 🏛️ Arthaloka — Personal Finance Tracker
### System Design Document v2.0
> *"Artha" (harta/kekayaan) + "Loka" (tempat/dunia) — Dunia keuangan Arul & Fifi*

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Deployment Strategy](#3-deployment-strategy)
4. [Firebase Free Tier Analysis](#4-firebase-free-tier-analysis)
5. [Architecture Diagram](#5-architecture-diagram)
6. [Database Schema (Firestore)](#6-database-schema-firestore)
7. [Authentication Design](#7-authentication-design)
8. [Page Structure & Routing](#8-page-structure--routing)
9. [Feature Specification](#9-feature-specification)
10. [UI/UX Design System](#10-uiux-design-system)
11. [Component Architecture](#11-component-architecture)
12. [State Management](#12-state-management)
13. [Mobile-First Strategy](#13-mobile-first-strategy)
14. [API & Data Layer Design](#14-api--data-layer-design)
15. [Error Handling & Edge Cases](#15-error-handling--edge-cases)
16. [Performance Strategy](#16-performance-strategy)
17. [Testing Strategy](#17-testing-strategy)
18. [Security Considerations](#18-security-considerations)
19. [Development Roadmap](#19-development-roadmap)
20. [Folder Structure](#20-folder-structure)

---

## 1. Overview

**Arthaloka** adalah web app keuangan pribadi untuk pasangan — Arul & Fifi.

### Prinsip Utama
- ✅ **Mobile-first**: Catat pengeluaran dari HP dalam < 5 tap
- ✅ **Minimalis ala Notion**: Clean, typographic, fungsional
- ✅ **Realtime sync**: Perubahan langsung terlihat oleh keduanya
- ✅ **100% Free tier**: Firebase Spark + Vercel Hobby
- ✅ **Offline-ready**: Firestore offline persistence
- ✅ **Extensible**: Arsitektur modular, siap scale ke fitur baru

### Target Users
| User | Role | Kebutuhan Utama |
|------|------|-----------------|
| Arul | Developer, pencatat utama | Quick expense entry, overview investasi |
| Fifi | Partner | Catat pengeluaran harian, lihat budget |

### Success Metrics
- Waktu catat expense: < 10 detik
- Load time dashboard: < 2 detik (mobile 4G)
- Zero cost infrastructure
- Data selalu sinkron antara 2 device

---

## 2. Tech Stack

### Frontend
| Layer | Pilihan | Versi | Alasan |
|-------|---------|-------|--------|
| Framework | **Next.js** (App Router) | 14.x | SSR/SSG, routing, deploy Vercel gratis |
| Styling | **Tailwind CSS** | 3.4.x | Utility-first, mobile-first native |
| UI Components | **shadcn/ui** | latest | Minimalis, copy-paste, full control |
| Icons | **Lucide React** | latest | Konsisten, tree-shakeable |
| Charts | **Recharts** | 2.x | Lightweight, responsive |
| Font | **Geist** (Vercel) | - | Ultra clean, tabular nums |
| Date | **date-fns** | 3.x | Lightweight, immutable |
| Forms | **React Hook Form + Zod** | 7.x + 3.x | Type-safe validation |
| State | **Zustand** | 4.x | Minimal boilerplate |
| Animation | **Framer Motion** | 11.x | Bottom sheet, page transitions |

### Backend / Services
| Layer | Pilihan | Alasan |
|-------|---------|--------|
| Auth | **Firebase Authentication** | Email/password + Google SSO, gratis |
| Database | **Cloud Firestore** | Realtime, offline support, gratis |
| Hosting | **Vercel** | Next.js native, edge CDN, gratis |
| Future: Storage | **Firebase Storage** | Upload struk/foto |
| Future: Functions | **Firebase Cloud Functions** | Scheduled tasks, notifications |

---

## 3. Deployment Strategy

```
GitHub Repository (private)
     │
     ▼
Push to main → Vercel Auto-Deploy
Push to dev  → Vercel Preview Deploy
     │
     ▼
Production: https://arthaloka.vercel.app
Preview:    https://arthaloka-git-dev-arul.vercel.app
```

### Vercel Configuration
- **Framework Preset**: Next.js
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Node.js Version**: 20.x

### Environment Variables (Vercel Dashboard)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=arthaloka.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=arthaloka
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=arthaloka.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

### Branch Strategy
```
main     → production (auto-deploy)
dev      → preview/staging
feature/ → PR ke dev
```

---

## 4. Firebase Free Tier Analysis

### Spark Plan (Gratis Selamanya)
| Resource | Limit | Estimasi 2 Users | Status |
|----------|-------|-------------------|--------|
| Firestore reads | 50,000/hari | ~500/hari | ✅ Aman |
| Firestore writes | 20,000/hari | ~100/hari | ✅ Aman |
| Firestore deletes | 20,000/hari | ~20/hari | ✅ Aman |
| Firestore storage | 1 GB | ~50 MB/tahun | ✅ Aman |
| Auth users | Unlimited | 2 users | ✅ Aman |
| Auth verifications | 10/hari | 0-2/hari | ✅ Aman |
| Bandwidth | 10 GB/bulan | ~100 MB/bulan | ✅ Aman |

### Optimasi Reads (Hemat Quota)
- Denormalize data (accountName di transaction)
- Cache di Zustand store
- Firestore offline persistence (baca dari cache dulu)
- Pagination: load 20 transaksi per page
- Listener hanya pada collection yang aktif dilihat

**Kesimpulan: Bahkan dengan penggunaan intensif, free tier cukup untuk 10+ tahun.**

---

## 5. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Next.js 14 │  │   Zustand   │  │  React Hook │            │
│  │ App Router  │◄►│   Store     │  │    Form     │            │
│  │  (Pages)    │  │  (Cache)    │  │   + Zod     │            │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘            │
│         │                 │                                     │
│  ┌──────▼─────────────────▼─────────────────────────────────┐  │
│  │           Custom Hooks Layer (useAccounts, etc.)          │  │
│  └──────┬───────────────────────────────────────────────────┘  │
│         │                                                       │
│  ┌──────▼───────────────────────────────────────────────────┐  │
│  │           Firebase SDK v9+ (Modular, Tree-shakeable)     │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────┐     │  │
│  │  │   Auth   │  │  Firestore   │  │  Offline Cache │     │  │
│  │  └──────────┘  └──────────────┘  └────────────────┘     │  │
│  └──────┬───────────────────┬───────────────────────────────┘  │
└─────────┼───────────────────┼───────────────────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────┐  ┌──────────────────────┐
│  Firebase Auth  │  │   Cloud Firestore    │
│                 │  │                      │
│  • Email/Pass   │  │  Collections:        │
│  • Google OAuth │  │  • users/            │
│  • Session mgmt │  │  • accounts/         │
│                 │  │  • transactions/     │
│                 │  │  • categories/       │
│                 │  │  • transfers/        │
└─────────────────┘  └──────────────────────┘
```

### Data Flow Pattern
```
User Action → React Hook Form (validate)
           → Custom Hook (useTransactions.add)
           → Firestore batch write (atomic)
           → onSnapshot listener triggers
           → Zustand store updates
           → UI re-renders
```

---

## 6. Database Schema (Firestore)

### Collection: `/users/{userId}`
```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  displayName: string;            // "Arul" | "Fifi"
  email: string;
  photoURL?: string;
  partnerUid?: string;            // UID pasangan
  role: "arul" | "fifi";         // untuk labeling UI
  currency: "IDR";
  preferences: {
    theme: "light" | "dark" | "system";
    defaultAccountId?: string;    // akun default saat add expense
    quickCategories: string[];    // 6 kategori favorit untuk grid
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Collection: `/accounts/{accountId}`
```typescript
interface Account {
  accountId: string;              // auto-generated
  name: string;                   // "Bank Mandiri", "Bank Jago"
  type: "bank" | "cash" | "e-wallet" | "savings" | "investment";
  category: "personal" | "shared";
  owner: "arul" | "fifi" | "shared";
  ownerUid: string;               // UID pemilik
  balance: number;                // saldo dalam IDR (integer, no decimal)
  currency: "IDR";
  color: string;                  // hex color untuk UI
  icon: string;                   // Lucide icon name
  isActive: boolean;              // soft delete
  order: number;                  // urutan tampil di list
  createdAt: Timestamp;
  updatedAt: Timestamp;
  note?: string;
}
```

**Data Awal:**
| Nama | Owner | Type | Balance |
|------|-------|------|---------|
| Bank Mandiri | arul | bank | 25,110 |
| Bank Jago | arul | bank | 28,773 |
| Bank Wondr | arul | bank | 3,000 |
| Saving Account | arul | savings | 2,302,049 |
| Bank BRI | fifi | bank | 8,040,800 |
| SeaBank | fifi | e-wallet | 14,000 |
| Cash Wallet | fifi | cash | 500,000 |
| Saving Account | fifi | savings | 0 |
| Pacaran (Jago) | shared | bank | 335,475 |
| Investasi Tanah | shared | investment | 11,400,000 |
| Investasi Saham | shared | investment | 33,467,069 |

### Collection: `/categories/{categoryId}`
```typescript
interface Category {
  categoryId: string;
  name: string;                   // "Food & Drink", "Transport"
  icon: string;                   // emoji
  color: string;                  // hex color
  type: "expense" | "income" | "both";
  budgetAmount: number;           // budget bulanan (0 = no limit)
  budgetScope: "arul" | "fifi" | "shared" | "each";
  isActive: boolean;
  order: number;                  // urutan di grid picker
  createdBy: string;              // UID
  createdAt: Timestamp;
}
```

**Kategori Default:**
| Icon | Nama | Type | Budget Default |
|------|------|------|----------------|
| 🍔 | Food & Drink | expense | 2,000,000 |
| 🚗 | Transport | expense | 500,000 |
| 🏠 | Rent & Housing | expense | 0 |
| 💡 | Utilities | expense | 300,000 |
| 💊 | Health | expense | 0 |
| 👗 | Fashion | expense | 500,000 |
| 💄 | Beauty | expense | 300,000 |
| 🎮 | Entertainment | expense | 200,000 |
| 📚 | Education | expense | 0 |
| 💑 | Dating | expense | 500,000 |
| 🛒 | Groceries | expense | 1,000,000 |
| 🐾 | Pets | expense | 0 |
| 🎁 | Gifts | expense | 0 |
| 💼 | Salary | income | 0 |
| 💸 | Freelance | income | 0 |
| 🎯 | Bonus | income | 0 |
| 📦 | Others | both | 0 |

### Collection: `/transactions/{transactionId}`
```typescript
interface Transaction {
  transactionId: string;
  type: "expense" | "income";
  name: string;                   // "Makan siang warteg", "Gajian"
  amount: number;                 // dalam IDR (always positive)
  accountId: string;
  accountName: string;            // denormalized
  categoryId: string;
  categoryName: string;           // denormalized
  categoryIcon: string;           // denormalized
  owner: "arul" | "fifi" | "shared";
  ownerUid: string;
  date: Timestamp;                // tanggal transaksi (user input)
  note?: string;
  tags?: string[];                // optional tags untuk search
  isRecurring?: boolean;          // future feature
  recurringId?: string;           // future: link ke recurring template
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Collection: `/transfers/{transferId}`
```typescript
interface Transfer {
  transferId: string;
  name: string;                   // "Top up pacaran"
  amount: number;
  fromAccountId: string;
  fromAccountName: string;        // denormalized
  toAccountId: string;
  toAccountName: string;          // denormalized
  owner: "arul" | "fifi" | "shared";
  ownerUid: string;
  date: Timestamp;
  note?: string;
  createdAt: Timestamp;
}
```

### Indexes (Composite)
```
transactions: [owner, date DESC] → query transaksi per owner per bulan
transactions: [accountId, date DESC] → history per akun
transactions: [categoryId, date DESC] → spending per kategori
transactions: [type, owner, date DESC] → income/expense filter
transfers: [owner, date DESC] → transfer history
```

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }

    function isOwnerOrPartner(ownerUid) {
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
      return request.auth.uid == ownerUid || userDoc.data.partnerUid == ownerUid;
    }

    function isValidTransaction() {
      let data = request.resource.data;
      return data.amount > 0
        && data.name.size() > 0
        && data.type in ['expense', 'income']
        && data.owner in ['arul', 'fifi', 'shared'];
    }

    match /users/{userId} {
      allow read: if isAuth() && (request.auth.uid == userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.partnerUid == userId);
      allow write: if isAuth() && request.auth.uid == userId;
    }

    match /accounts/{accountId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update, delete: if isAuth() && isOwnerOrPartner(resource.data.ownerUid);
    }

    match /transactions/{txId} {
      allow read: if isAuth();
      allow create: if isAuth() && isValidTransaction();
      allow update, delete: if isAuth() && isOwnerOrPartner(resource.data.ownerUid);
    }

    match /transfers/{transferId} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update, delete: if isAuth() && isOwnerOrPartner(resource.data.ownerUid);
    }

    match /categories/{catId} {
      allow read, write: if isAuth();
    }
  }
}
```

---

## 7. Authentication Design

### Auth Flow
```
┌──────────┐     ┌──────────────┐     ┌─────────────┐
│  /login  │────►│ Firebase Auth │────►│  /onboarding│
│          │     │ (email/google)│     │  (first time)│
└──────────┘     └──────────────┘     └──────┬──────┘
                                              │
                                              ▼
                                      ┌──────────────┐
                                      │  /dashboard  │
                                      │  (main app)  │
                                      └──────────────┘
```

### Login Methods
1. **Email + Password** — untuk simplicity
2. **Google Sign-In** — one-tap login

### Partner Linking Flow
```
1. Arul register → create user doc → generate invite code (6 digit)
2. Fifi register → masukkan invite code Arul
3. System update: Arul.partnerUid = Fifi.uid, Fifi.partnerUid = Arul.uid
4. Keduanya sekarang bisa akses semua data
```

### Auth State Management
```typescript
// middleware.ts — protect routes
export function middleware(request: NextRequest) {
  const session = request.cookies.get('__session');
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### Session Strategy
- Firebase Auth SDK handles session persistence (IndexedDB)
- `onAuthStateChanged` listener di root layout
- Redirect ke /login kalau session expired
- No server-side session needed (pure client-side auth)

---

## 8. Page Structure & Routing

```
app/
├── (auth)/
│   ├── login/page.tsx              → Login page
│   └── onboarding/page.tsx         → First-time setup
│
├── (app)/                          → Protected routes (require auth)
│   ├── layout.tsx                  → AppShell (nav, header)
│   ├── page.tsx                    → redirect → /dashboard
│   │
│   ├── dashboard/page.tsx          → Main overview
│   │
│   ├── arul/
│   │   └── page.tsx                → Keuangan Arul
│   │
│   ├── fifi/
│   │   └── page.tsx                → Keuangan Fifi
│   │
│   ├── berdua/
│   │   └── page.tsx                → Keuangan bersama
│   │
│   ├── transactions/
│   │   └── page.tsx                → All transactions + filter
│   │
│   ├── accounts/
│   │   └── page.tsx                → Manage accounts
│   │
│   ├── categories/
│   │   └── page.tsx                → Manage categories + budget
│   │
│   └── settings/
│       └── page.tsx                → App settings
│
└── layout.tsx                      → Root layout (providers)
```

### Route Groups
- `(auth)` — public routes, no nav
- `(app)` — protected routes, with bottom nav + sidebar

---

## 9. Feature Specification

### 9.1 Dashboard

**Layout:**
```
┌─────────────────────────────────┐
│  Arthaloka          [month ▼]   │  ← Header + month picker
├─────────────────────────────────┤
│  ┌───────┐ ┌───────┐           │
│  │Total  │ │ Net   │           │  ← Summary cards (scroll horizontal)
│  │56.1M  │ │+2.3M  │           │
│  └───────┘ └───────┘           │
│  ┌───────┐ ┌───────┐           │
│  │Income │ │Expense│           │
│  │ 8.5M  │ │ 6.2M  │           │
│  └───────┘ └───────┘           │
├─────────────────────────────────┤
│  Spending by Category           │  ← Donut chart
│  [====== donut chart ======]    │
├─────────────────────────────────┤
│  Budget Alerts                  │
│  🟡 Food: 78% (1.56M/2M)       │
│  🔴 Fashion: 105% (525K/500K)  │
├─────────────────────────────────┤
│  Recent Transactions            │
│  ┌─ 🍔 Makan warteg    -15K ─┐ │
│  ├─ 🚗 Grab ke kantor  -25K ─┤ │
│  ├─ 💼 Gajian        +8.5M ─┤ │
│  └─ ...              See all ─┘ │
├─────────────────────────────────┤
│                          [+ FAB]│  ← Floating Action Button
├─────────────────────────────────┤
│ [🏠] [👤Arul] [👫Berdua] [💃Fifi] [⚙️] │  ← Bottom Nav
└─────────────────────────────────┘
```

**Interactions:**
- Month picker: tap → dropdown bulan, default current month
- Summary cards: tap → navigate ke detail (transactions filtered)
- Donut chart: tap segment → filter transactions by category
- Budget alert: tap → navigate ke categories page
- Recent transactions: tap item → edit sheet, swipe left → delete
- FAB: tap → action sheet (Expense / Income / Transfer)

### 9.2 Add Expense (Bottom Sheet)

**Priority UX: < 5 taps to complete**

```
┌─────────────────────────────────┐
│  ─── (drag handle)              │
│                                 │
│  Add Expense                    │
│                                 │
│  Amount *                       │
│  ┌─────────────────────────┐   │
│  │ Rp  [         0       ] │   │  ← Auto-focus, numpad
│  └─────────────────────────┘   │
│                                 │
│  Name *                         │
│  ┌─────────────────────────┐   │
│  │ What did you spend on?  │   │
│  └─────────────────────────┘   │
│                                 │
│  Category *                     │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐    │
│  │🍔│ │🚗│ │🏠│ │💡│ │💊│    │  ← Quick grid (6 favorites)
│  └──┘ └──┘ └──┘ └──┘ └──┘    │
│  [See all categories →]        │
│                                 │
│  Account: [Bank Jago ▼]        │  ← Default account pre-selected
│  Owner:   [Arul ▼]             │  ← Auto from logged-in user
│  Date:    [Today ▼]            │
│                                 │
│  Note (optional)                │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  [━━━━━━━ Save Expense ━━━━━━] │  ← Primary button
└─────────────────────────────────┘
```

**Smart Defaults:**
- Amount: auto-focus + numpad
- Account: user's default account (from preferences)
- Owner: current logged-in user
- Date: today
- Category: show 6 most-used categories first

### 9.3 Add Income (Bottom Sheet)
Same layout as expense, differences:
- Title: "Add Income"
- Account label: "To Account"
- Category: income-type categories only
- Button: "Save Income" (green accent)

### 9.4 Add Transfer (Bottom Sheet)
```
Amount → From Account → To Account → Date → Note → Save
```

### 9.5 Personal Page (Arul / Fifi)

```
┌─────────────────────────────────┐
│  Arul's Finance        [May ▼]  │
├─────────────────────────────────┤
│  Total Balance: Rp 2,358,932    │
│  Income: +8,500,000             │
│  Expense: -3,200,000            │
├─────────────────────────────────┤
│  Accounts                       │
│  ┌─ 🏦 Bank Mandiri    25,110 ─┐│
│  ├─ 🏦 Bank Jago       28,773 ─┤│
│  ├─ 🏦 Bank Wondr       3,000 ─┤│
│  └─ 💰 Saving       2,302,049 ─┘│
├─────────────────────────────────┤
│  Recent Transactions            │
│  (filtered: owner = arul)       │
└─────────────────────────────────┘
```

### 9.6 Berdua Page

```
┌─────────────────────────────────┐
│  Keuangan Berdua       [May ▼]  │
├─────────────────────────────────┤
│  Tab: [Pacaran] [Tabungan] [Investasi] │
├─────────────────────────────────┤
│  === Tab: Pacaran ===           │
│  Balance: Rp 335,475            │
│  This month spent: -150,000     │
│  Recent: dinner, movie, etc.    │
├─────────────────────────────────┤
│  === Tab: Tabungan ===          │
│  Total saved: Rp 2,302,049     │
│  Target: Rp 50,000,000         │
│  Progress: [████░░░░] 4.6%     │
├─────────────────────────────────┤
│  === Tab: Investasi ===         │
│  Tanah: Rp 11,400,000          │
│  Saham: Rp 33,467,069          │
│  Total: Rp 44,867,069          │
└─────────────────────────────────┘
```

### 9.7 Transactions Page (All)

**Features:**
- Filter by: owner, category, account, date range, type
- Search by name
- Sort by: date (default), amount
- Grouped by date (Today, Yesterday, This Week, etc.)
- Infinite scroll / load more
- Swipe left: delete (with confirmation)
- Tap: edit in bottom sheet

### 9.8 Categories & Budget Page

```
┌─────────────────────────────────┐
│  Categories & Budget   [May ▼]  │
├─────────────────────────────────┤
│  🍔 Food & Drink               │
│  Budget: Rp 2,000,000          │
│  Spent:  Rp 1,560,000 (78%)    │
│  [████████████████░░░░] 🟡     │
├─────────────────────────────────┤
│  👗 Fashion                     │
│  Budget: Rp 500,000            │
│  Spent:  Rp 525,000 (105%)     │
│  [████████████████████] 🔴     │
├─────────────────────────────────┤
│  ...more categories...          │
│                                 │
│  [+ Add Category]              │
└─────────────────────────────────┘
```

**Budget Alert Thresholds:**
- 0-74%: Green (normal)
- 75-99%: Yellow (warning)
- 100%+: Red (over budget)

### 9.9 Accounts Page

- List all accounts grouped by owner
- Tap account → detail (transaction history for that account)
- Add/Edit/Deactivate accounts
- Drag to reorder

### 9.10 Settings Page

- Profile (name, photo)
- Partner connection status
- Default account selection
- Theme (light/dark/system)
- Currency format
- Export data (CSV) — future
- Logout

---

## 10. UI/UX Design System

### Design Principles
1. **Notion-inspired**: Clean whitespace, typography-driven
2. **Content-first**: Data is the hero, not decoration
3. **Consistent**: Same patterns everywhere
4. **Accessible**: WCAG AA contrast, touch targets 44px+

### Color Tokens
```css
:root {
  /* Backgrounds */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F7F6F3;
  --bg-tertiary: #EFEEEB;
  --bg-hover: #F1F1EF;

  /* Text */
  --text-primary: #1A1A1A;
  --text-secondary: #6B6B6B;
  --text-muted: #9B9B9B;
  --text-inverse: #FFFFFF;

  /* Borders */
  --border-default: #E8E8E6;
  --border-strong: #D4D4D2;

  /* Semantic */
  --color-income: #0F9B58;
  --color-expense: #E03E3E;
  --color-transfer: #2383E2;
  --color-warning: #D9730D;
  --color-info: #2383E2;

  /* Owner Colors */
  --color-arul: #2383E2;
  --color-fifi: #E255A1;
  --color-shared: #9B59B6;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-sheet: 0 -4px 24px rgba(0,0,0,0.12);
}

.dark {
  --bg-primary: #191919;
  --bg-secondary: #202020;
  --bg-tertiary: #272727;
  --bg-hover: #2C2C2C;
  --text-primary: #FFFFFFDE;
  --text-secondary: #FFFFFF99;
  --text-muted: #FFFFFF61;
  --border-default: #2F2F2F;
  --border-strong: #3D3D3D;
}
```

### Typography Scale
```
Font Family: "Geist", system-ui, sans-serif
Font Mono:   "Geist Mono" (for amounts)

--text-2xl: 24px / 32px, weight 600    → Page titles
--text-xl:  20px / 28px, weight 600    → Section headers
--text-lg:  16px / 24px, weight 500    → Card titles
--text-base: 14px / 20px, weight 400   → Body text
--text-sm:  12px / 16px, weight 400    → Labels, captions
--text-xs:  11px / 14px, weight 500    → Badges, tags

Amounts: font-variant-numeric: tabular-nums;
         font-family: "Geist Mono";
```

### Component Specs

**Card:**
```
bg: var(--bg-secondary)
border: 1px solid var(--border-default)
border-radius: 12px
padding: 16px
shadow: var(--shadow-sm)
```

**Bottom Sheet:**
```
bg: var(--bg-primary)
border-radius: 16px 16px 0 0 (top corners)
shadow: var(--shadow-sheet)
max-height: 90vh
drag handle: 32px × 4px, rounded, centered
```

**FAB (Floating Action Button):**
```
size: 56px × 56px
bg: var(--text-primary)
color: var(--text-inverse)
border-radius: 16px
shadow: var(--shadow-md)
position: fixed, bottom 80px, right 16px
icon: Plus (Lucide), 24px
```

**Bottom Navigation:**
```
height: 64px (+ safe area)
bg: var(--bg-primary)
border-top: 1px solid var(--border-default)
items: 5, evenly spaced
active: var(--text-primary), weight 600
inactive: var(--text-muted)
icon: 20px, label: 10px
```

**Transaction Item:**
```
height: 56px
layout: [icon 36px] [name + category] [amount, right-aligned]
swipe-left: red delete button
tap: open edit sheet
```

### Spacing & Layout
```
Page padding: 16px (mobile), 24px (tablet), 32px (desktop)
Card gap: 12px
Section gap: 24px
Bottom nav height: 64px
FAB bottom offset: 80px (above nav)
Safe area: env(safe-area-inset-bottom)
```

---

## 11. Component Architecture

```
src/components/
├── layout/
│   ├── AppShell.tsx              → Main layout wrapper
│   ├── BottomNav.tsx             → Mobile bottom navigation (5 tabs)
│   ├── Sidebar.tsx               → Desktop sidebar navigation
│   ├── Header.tsx                → Page header with month picker
│   ├── FAB.tsx                   → Floating action button
│   └── ActionSheet.tsx           → FAB menu (expense/income/transfer)
│
├── dashboard/
│   ├── SummaryCards.tsx          → 4 metric cards (horizontal scroll)
│   ├── SpendingDonut.tsx         → Donut chart by category
│   ├── BudgetAlerts.tsx          → Over-budget warnings
│   └── RecentTransactions.tsx    → Last 10 transactions
│
├── transactions/
│   ├── TransactionList.tsx       → Grouped list with infinite scroll
│   ├── TransactionItem.tsx       → Single row (swipeable)
│   ├── TransactionFilters.tsx    → Filter bar (owner, category, type)
│   ├── ExpenseSheet.tsx          → Bottom sheet: add/edit expense
│   ├── IncomeSheet.tsx           → Bottom sheet: add/edit income
│   └── TransferSheet.tsx         → Bottom sheet: add/edit transfer
│
├── accounts/
│   ├── AccountCard.tsx           → Account with balance + icon
│   ├── AccountList.tsx           → Grouped by owner
│   └── AccountForm.tsx           → Add/edit account sheet
│
├── categories/
│   ├── CategoryGrid.tsx          → 6-item quick picker
│   ├── CategoryFullGrid.tsx      → All categories (in sheet)
│   ├── CategoryList.tsx          → Manage view with budget bars
│   ├── BudgetProgressBar.tsx     → Single budget progress
│   └── CategoryForm.tsx          → Add/edit category
│
├── shared/
│   ├── MonthPicker.tsx           → Month/year selector
│   ├── AmountInput.tsx           → IDR formatted number input
│   ├── OwnerBadge.tsx            → Colored badge (Arul/Fifi/Berdua)
│   ├── EmptyState.tsx            → No data illustration
│   ├── LoadingState.tsx          → Skeleton loaders
│   └── ConfirmDialog.tsx         → Delete confirmation
│
└── ui/                           → shadcn/ui primitives
    ├── button.tsx
    ├── card.tsx
    ├── sheet.tsx
    ├── input.tsx
    ├── select.tsx
    ├── badge.tsx
    ├── progress.tsx
    ├── skeleton.tsx
    ├── tabs.tsx
    ├── dropdown-menu.tsx
    └── dialog.tsx
```

---

## 12. State Management

### Zustand Store
```typescript
interface AppStore {
  // === Auth State ===
  currentUser: User | null;
  partner: User | null;
  isLoading: boolean;
  setCurrentUser: (user: User | null) => void;
  setPartner: (user: User | null) => void;

  // === UI State ===
  activeSheet: "expense" | "income" | "transfer" | null;
  editingTransaction: Transaction | null;
  editingTransfer: Transfer | null;
  selectedMonth: Date;  // for filtering
  theme: "light" | "dark" | "system";

  // === Actions ===
  openSheet: (type: "expense" | "income" | "transfer", item?: any) => void;
  closeSheet: () => void;
  setSelectedMonth: (date: Date) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}
```

### Data Hooks (Firestore Realtime)
```typescript
// Each hook manages its own Firestore listener
useAccounts(owner?: OwnerFilter)     → { accounts, isLoading }
useTransactions(filters: TxFilters)  → { transactions, isLoading, loadMore }
useCategories()                      → { categories, isLoading }
useTransfers(filters: TransferFilters) → { transfers, isLoading }
useSummary(month: Date, owner?: string) → { income, expense, net, total }
useBudgetStatus(month: Date)         → { budgets: BudgetStatus[] }
```

### Data Flow
```
Firestore onSnapshot
     │
     ▼
Custom Hook (transforms data)
     │
     ▼
Component renders
     │
     ▼
User action → Hook mutation → Firestore write → onSnapshot fires → re-render
```

---

## 13. Mobile-First Strategy

### Touch Interactions
| Gesture | Action |
|---------|--------|
| Tap FAB | Open action sheet |
| Tap transaction | Open edit sheet |
| Swipe left on transaction | Reveal delete button |
| Pull down on list | Refresh data |
| Horizontal scroll | Summary cards |
| Drag sheet handle | Expand/collapse sheet |

### Input Optimizations
```html
<!-- Amount: show numpad -->
<input type="text" inputMode="numeric" pattern="[0-9]*" />

<!-- Date: native date picker on mobile -->
<input type="date" />

<!-- Name: normal keyboard with autocomplete off -->
<input type="text" autoComplete="off" autoCorrect="off" />
```

### Performance on Mobile
- Images: none (icon-based UI)
- Fonts: preload Geist (< 50KB)
- JS bundle: < 150KB gzipped (target)
- First paint: < 1.5s on 4G
- Interaction ready: < 3s on 4G

### PWA Configuration (Phase 2)
```json
{
  "name": "Arthaloka",
  "short_name": "Arthaloka",
  "start_url": "/dashboard",
  "display": "standalone",
  "theme_color": "#FFFFFF",
  "background_color": "#FFFFFF",
  "icons": [...]
}
```

### Responsive Breakpoints
```
sm:  640px   → minor adjustments
md:  768px   → switch to sidebar, hide bottom nav
lg:  1024px  → expand sidebar, multi-column
xl:  1280px  → max-width container
```

---

## 14. API & Data Layer Design

### Firestore Service Functions
```typescript
// lib/firestore/accounts.ts
export const accountsService = {
  getAll: (userId: string) => query(collection(db, 'accounts'), where(...)),
  getByOwner: (owner: Owner) => query(...),
  create: (data: CreateAccountInput) => addDoc(...),
  update: (id: string, data: Partial<Account>) => updateDoc(...),
  delete: (id: string) => updateDoc(ref, { isActive: false }),
};

// lib/firestore/transactions.ts
export const transactionsService = {
  getByMonth: (month: Date, filters?: TxFilters) => query(...),
  create: async (data: CreateTransactionInput) => {
    // Batch write: create transaction + update account balance
    const batch = writeBatch(db);
    batch.set(newTxRef, txData);
    batch.update(accountRef, { balance: increment(delta) });
    await batch.commit();
  },
  update: async (id: string, oldData: Transaction, newData: UpdateTxInput) => {
    // Batch: update tx + adjust old account + adjust new account
  },
  delete: async (tx: Transaction) => {
    // Batch: delete tx + reverse balance change
  },
};

// lib/firestore/transfers.ts
export const transfersService = {
  create: async (data: CreateTransferInput) => {
    // Batch: create transfer + debit from + credit to
    const batch = writeBatch(db);
    batch.set(newTransferRef, transferData);
    batch.update(fromAccountRef, { balance: increment(-amount) });
    batch.update(toAccountRef, { balance: increment(amount) });
    await batch.commit();
  },
};
```

### Balance Consistency
All balance mutations use **Firestore batch writes** to ensure atomicity:
- Add expense → balance decreases
- Add income → balance increases
- Add transfer → from decreases, to increases
- Edit transaction → reverse old, apply new
- Delete transaction → reverse the effect

---

## 15. Error Handling & Edge Cases

### Error Scenarios
| Scenario | Handling |
|----------|----------|
| Network offline | Firestore offline cache, show "offline" badge |
| Auth expired | Redirect to /login with return URL |
| Firestore write fails | Toast error, keep form data, retry button |
| Invalid form data | Zod validation, inline error messages |
| Delete account with transactions | Warn user, soft-delete only |
| Concurrent edits | Last-write-wins (acceptable for 2 users) |
| Negative balance | Allow it (overdraft is real life) |
| Very large amounts | Max 999,999,999,999 (format with dots) |

### Toast Notifications
```
✅ Success: "Expense saved" (auto-dismiss 3s)
❌ Error: "Failed to save. Try again." (with retry button)
⚠️ Warning: "Budget exceeded for Food & Drink"
ℹ️ Info: "You're offline. Changes will sync later."
```

### Loading States
- Initial load: full-page skeleton
- Data fetch: skeleton cards/rows
- Form submit: button loading spinner
- Sheet open: instant (no loading)

---

## 16. Performance Strategy

### Bundle Optimization
- Dynamic imports for charts (Recharts)
- Dynamic imports for bottom sheets (only load when opened)
- Tree-shake Firebase SDK (modular imports)
- Preload critical fonts (Geist)

### Firestore Optimization
- Pagination: 20 items per page
- Denormalized fields (avoid extra reads)
- Composite indexes for common queries
- Offline persistence enabled
- Unsubscribe listeners on unmount

### Caching Strategy
```
Layer 1: Firestore offline cache (IndexedDB)
Layer 2: Zustand in-memory store
Layer 3: React component state (derived)
```

### Metrics Targets
| Metric | Target | Tool |
|--------|--------|------|
| LCP | < 2.0s | Vercel Analytics |
| FID | < 100ms | Vercel Analytics |
| CLS | < 0.1 | Vercel Analytics |
| Bundle size | < 150KB gz | next/bundle-analyzer |
| Firestore reads/day | < 1000 | Firebase Console |

---

## 17. Testing Strategy

### Unit Tests (Vitest)
- Utility functions (formatCurrency, date helpers)
- Zod schemas validation
- Zustand store actions

### Component Tests (Testing Library)
- Form validation behavior
- Conditional rendering (loading, empty, error states)
- User interactions (click, type, submit)

### E2E Tests (Playwright) — Phase 2
- Login flow
- Add expense flow
- Transfer flow
- Budget alert display

### Manual Testing Checklist
- [ ] Mobile Safari (iPhone)
- [ ] Mobile Chrome (Android)
- [ ] Desktop Chrome
- [ ] Offline mode
- [ ] Slow 3G network

---

## 18. Security Considerations

### Client-Side
- No sensitive data in localStorage (use Firebase session)
- Sanitize all user inputs (XSS prevention via React)
- Amount validation: positive numbers only, max limit
- Rate limiting: debounce rapid form submissions

### Firestore Rules
- All reads/writes require authentication
- Partner validation on every document access
- Data validation in security rules (amount > 0, valid types)
- No admin/wildcard access

### Environment
- Firebase config is public (by design, secured by rules)
- No server-side secrets needed
- HTTPS enforced by Vercel
- CSP headers configured in next.config.js

---

## 19. Development Roadmap

### Sprint 1 — Foundation (Week 1)
- [x] Project setup: Next.js 14 + Tailwind + TypeScript
- [ ] Firebase project creation & SDK setup
- [ ] shadcn/ui installation + theme configuration
- [ ] Design system: colors, typography, spacing (Tailwind config)
- [ ] Layout: AppShell, BottomNav, Header
- [ ] Auth: login page, Firebase auth integration
- [ ] Auth: protected route middleware
- [ ] Auth: onboarding + partner linking

### Sprint 2 — Core Data (Week 2)
- [ ] Firestore schema setup + security rules
- [ ] Types/interfaces (TypeScript)
- [ ] CRUD Accounts (service + hook + UI)
- [ ] CRUD Categories with budget (service + hook + UI)
- [ ] Seed data script (initial accounts + categories)

### Sprint 3 — Transactions (Week 3)
- [ ] Add Expense (bottom sheet form + Firestore batch write)
- [ ] Add Income (bottom sheet form)
- [ ] Add Transfer (bottom sheet form)
- [ ] Transaction list with grouping by date
- [ ] Edit transaction (tap to edit in sheet)
- [ ] Delete transaction (swipe + confirm)
- [ ] Balance auto-update (atomic batch writes)

### Sprint 4 — Dashboard & Pages (Week 4)
- [ ] Dashboard: summary cards (total, income, expense, net)
- [ ] Dashboard: recent transactions
- [ ] Dashboard: spending donut chart
- [ ] Dashboard: budget alerts
- [ ] Personal page (Arul)
- [ ] Personal page (Fifi)
- [ ] Berdua page (tabs: pacaran, tabungan, investasi)
- [ ] FAB + action sheet

### Sprint 5 — Polish & Deploy (Week 5)
- [ ] Month picker (navigate between months)
- [ ] Transaction filters (owner, category, type, search)
- [ ] Budget progress bars on categories page
- [ ] Settings page (theme, default account, logout)
- [ ] Loading skeletons + empty states
- [ ] Error handling + toast notifications
- [ ] Mobile testing + responsive fixes
- [ ] Deploy to Vercel
- [ ] Firebase security rules deploy

### Sprint 6 — Enhancements (Week 6+)
- [ ] Dark mode
- [ ] PWA manifest + service worker
- [ ] Bar chart (monthly comparison)
- [ ] Export CSV
- [ ] Recurring transactions
- [ ] Saving goals with progress
- [ ] Net worth tracker

---

## 20. Folder Structure

```
arthaloka/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── onboarding/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── arul/page.tsx
│   │   │   ├── fifi/page.tsx
│   │   │   ├── berdua/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── accounts/
│   │   ├── categories/
│   │   ├── shared/
│   │   └── ui/
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAccounts.ts
│   │   ├── useTransactions.ts
│   │   ├── useCategories.ts
│   │   ├── useTransfers.ts
│   │   ├── useSummary.ts
│   │   └── useBudgetStatus.ts
│   │
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── firestore/
│   │   │   ├── accounts.ts
│   │   │   ├── transactions.ts
│   │   │   ├── transfers.ts
│   │   │   └── categories.ts
│   │   ├── utils/
│   │   │   ├── formatCurrency.ts
│   │   │   ├── formatDate.ts
│   │   │   └── cn.ts
│   │   └── validations/
│   │       ├── transaction.schema.ts
│   │       ├── account.schema.ts
│   │       └── category.schema.ts
│   │
│   ├── store/
│   │   └── useAppStore.ts
│   │
│   └── types/
│       ├── account.ts
│       ├── transaction.ts
│       ├── transfer.ts
│       ├── category.ts
│       └── user.ts
│
├── public/
│   ├── icons/
│   └── manifest.json
│
├── .env.local
├── .env.example
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── firestore.rules
├── firestore.indexes.json
└── README.md
```

---

## 💡 Design Decisions & Tradeoffs

### Kenapa "Arthaloka"?
- "Artha" = harta/kekayaan (Sanskrit/Jawa)
- "Loka" = dunia/tempat
- Bermakna: "Dunia keuangan kita" — personal, bermakna, unik

### Kenapa Client-Side Only (No API Routes)?
- 2 users only → no need for server-side logic
- Firebase SDK handles auth + data directly
- Simpler architecture, fewer moving parts
- Offline support built-in

### Kenapa Denormalize?
- Firestore charges per read → minimize reads
- Display speed: no joins needed
- Tradeoff: rename account → batch update transactions (rare)

### Kenapa Bottom Sheet, Bukan Page Baru?
- Faster UX: no page navigation for quick actions
- Context preserved: user stays on current page
- Mobile-native feel: familiar pattern (like Gojek, Tokopedia)

### Kenapa Zustand, Bukan Context?
- No provider hell
- Simpler API
- Better performance (selective re-renders)
- Persist middleware available

### Balance Update Strategy
```
Transaction created → batch write:
  1. Create transaction document
  2. Update account balance (increment/decrement)
  → Atomic: both succeed or both fail

Transaction edited → batch write:
  1. Reverse old amount on old account
  2. Apply new amount on new account
  3. Update transaction document

Transaction deleted → batch write:
  1. Reverse amount on account
  2. Delete transaction document
```

---

*Arthaloka — System Design Document v2.0*
*Last updated: Mei 2026*
*Author: Arul*
