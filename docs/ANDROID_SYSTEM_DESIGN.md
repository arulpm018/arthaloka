# 📱 Arthafiloka — Android App System Design Document
### Dokumentasi Lengkap untuk Pengembangan Aplikasi Android
> Dokumen ini menjelaskan seluruh sistem, flow, logic, dan arsitektur dari web app Arthafiloka
> agar dapat direplikasi secara identik dalam bentuk Android native app.

---

## 📋 Daftar Isi

1. [Overview & Prinsip](#1-overview--prinsip)
2. [Tech Stack Rekomendasi Android](#2-tech-stack-rekomendasi-android)
3. [Firebase Configuration](#3-firebase-configuration)
4. [Data Models (Firestore Schema)](#4-data-models-firestore-schema)
5. [Authentication Flow](#5-authentication-flow)
6. [Navigation & Screen Structure](#6-navigation--screen-structure)
7. [Feature Specification & UI Flow](#7-feature-specification--ui-flow)
8. [Business Logic & Rules](#8-business-logic--rules)
9. [State Management](#9-state-management)
10. [Design System & Theming](#10-design-system--theming)
11. [Offline Support & Caching](#11-offline-support--caching)
12. [Security Rules & Validation](#12-security-rules--validation)
13. [Error Handling](#13-error-handling)
14. [Performance Optimization](#14-performance-optimization)

---

## 1. Overview & Prinsip

**Arthafiloka** adalah personal finance tracker untuk pasangan (Arul & Fifi).

### Prinsip Utama
- **Mobile-first**: Catat pengeluaran dalam < 5 tap
- **Minimalis ala Notion**: Clean, typographic, fungsional
- **Realtime sync**: Perubahan langsung terlihat oleh keduanya
- **100% Free tier**: Firebase Spark plan
- **Offline-ready**: Firestore offline persistence

### Target Users
| User | Role | Kebutuhan |
|------|------|-----------|
| Arul | Developer, pencatat utama | Quick expense entry, overview investasi |
| Fifi | Partner | Catat pengeluaran harian, lihat budget |

### Success Metrics
- Waktu catat expense: < 10 detik
- Load time dashboard: < 2 detik
- Zero cost infrastructure
- Data selalu sinkron antara semua device

### Nama Aplikasi
- **Package name**: `com.arthafiloka.app`
- **Display name**: Arthafiloka
- **Arti**: "Artha" (harta) + "Filo" (cinta) + "Loka" (dunia)

---

## 2. Tech Stack Rekomendasi Android

### Opsi A: Kotlin + Jetpack Compose (Recommended)
| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| Language | Kotlin | Modern, concise, official Android |
| UI | Jetpack Compose | Declarative UI, mirip React |
| Navigation | Compose Navigation | Type-safe routing |
| DI | Hilt/Dagger | Dependency injection standard |
| State | ViewModel + StateFlow | Lifecycle-aware |
| Forms | Custom + validation | Mirip React Hook Form |
| Auth | Firebase Auth SDK | Google Sign-In native |
| Database | Cloud Firestore SDK | Realtime + offline |
| Date | java.time / kotlinx-datetime | Modern date handling |
| Charts | Vico / MPAndroidChart | Donut chart, bar chart |
| Animation | Compose Animation | Bottom sheet, transitions |
| Theme | Material 3 (customized) | Notion-inspired theming |

### Opsi B: Flutter (Cross-platform)
| Layer | Teknologi |
|-------|-----------|
| Framework | Flutter 3.x |
| State | Riverpod / BLoC |
| Auth | firebase_auth |
| Database | cloud_firestore |
| Charts | fl_chart |
| Navigation | go_router |

### Opsi C: React Native (Leverage existing code)
| Layer | Teknologi |
|-------|-----------|
| Framework | React Native + Expo |
| State | Zustand (reuse) |
| Auth | @react-native-firebase/auth |
| Database | @react-native-firebase/firestore |
| Navigation | React Navigation |
| UI | NativeWind (Tailwind) |

---

## 3. Firebase Configuration

### Project Info
- **Project ID**: `arthafiloka` (sama dengan web)
- **Auth**: Google Sign-In only
- **Database**: Cloud Firestore
- **Offline**: Persistence enabled (default di Android SDK)

### Environment Variables (android/app/google-services.json)
Firebase config di-download dari Firebase Console → Project Settings → Add Android App.

### Allowed Users (Whitelist)
Hanya 2 email yang diizinkan:
- `arulpm010@gmail.com` (UID: `RPS8bvX5eGerNJDm20RvQS0tnHI2`)
- `fifi.work27@gmail.com` (UID: `UIioxgSjFceo0lmwAWWnrFLm6uJ2`)

Validasi dilakukan di:
1. **Client-side**: Cek email setelah Google Sign-In, reject jika bukan whitelist
2. **Server-side**: Firestore Security Rules memvalidasi UID + email

### Firestore Indexes (Composite)
```json
{
  "indexes": [
    { "collection": "accounts", "fields": ["isActive ASC", "order ASC"] },
    { "collection": "accounts", "fields": ["isActive ASC", "owner ASC", "order ASC"] },
    { "collection": "transactions", "fields": ["date DESC"] },
    { "collection": "transactions", "fields": ["owner ASC", "date DESC"] },
    { "collection": "transactions", "fields": ["type ASC", "date DESC"] },
    { "collection": "transactions", "fields": ["type ASC", "owner ASC", "date DESC"] },
    { "collection": "transactions", "fields": ["accountId ASC", "date DESC"] },
    { "collection": "transactions", "fields": ["categoryId ASC", "date DESC"] },
    { "collection": "transfers", "fields": ["date DESC"] },
    { "collection": "transfers", "fields": ["owner ASC", "date DESC"] },
    { "collection": "categories", "fields": ["isActive ASC", "order ASC"] },
    { "collection": "wishlistCategories", "fields": ["isActive ASC", "createdAt ASC"] }
  ]
}
```

---

## 4. Data Models (Firestore Schema)

### 4.1 Collection: `users/{userId}`
```kotlin
data class User(
    val uid: String,                    // Firebase Auth UID (= document ID)
    val displayName: String,            // "Arul" atau "Fifi"
    val email: String,
    val photoURL: String? = null,
    val partnerUid: String? = null,     // UID pasangan
    val role: String,                   // "arul" | "fifi"
    val currency: String = "IDR",
    val preferences: UserPreferences,
    val inviteCode: String? = null,     // 6-char code untuk partner linking
    val createdAt: Timestamp,
    val updatedAt: Timestamp
)

data class UserPreferences(
    val theme: String = "system",       // "light" | "dark" | "system"
    val defaultAccountId: String? = null,
    val quickCategories: List<String> = emptyList()  // 6 category IDs
)
```

### 4.2 Collection: `accounts/{accountId}`
```kotlin
data class Account(
    val accountId: String,              // document ID (auto-generated)
    val name: String,                   // "Bank Mandiri", "Bank Jago"
    val type: String,                   // "bank" | "cash" | "e-wallet" | "savings" | "investment"
    val category: String,               // "personal" | "shared"
    val owner: String,                  // "arul" | "fifi" | "shared"
    val ownerUid: String,               // Firebase UID pemilik
    val balance: Long,                  // saldo IDR (integer, no decimal)
    val currency: String = "IDR",
    val color: String,                  // hex color "#2383E2"
    val icon: String,                   // icon identifier "wallet"
    val isActive: Boolean = true,       // false = soft deleted
    val order: Int = 0,                 // urutan tampil di list
    val createdAt: Timestamp,
    val updatedAt: Timestamp,
    val note: String? = null
)

// Valid AccountType values:
enum class AccountType { BANK, CASH, E_WALLET, SAVINGS, INVESTMENT }

// Valid Owner values:
enum class Owner { ARUL, FIFI, SHARED }
```

### 4.3 Collection: `categories/{categoryId}`
```kotlin
data class Category(
    val categoryId: String,             // document ID
    val name: String,                   // "Food & Drink"
    val icon: String,                   // Lucide icon ID: "utensils", "car", etc.
    val color: String,                  // hex color
    val type: String,                   // "expense" | "income" | "both"
    val budgetAmount: Long = 0,         // budget bulanan IDR (0 = no limit)
    val budgetScope: String,            // "arul" | "fifi" | "shared"
    val isActive: Boolean = true,
    val order: Int = 0,
    val createdBy: String,              // UID
    val createdAt: Timestamp
)
```

**Kategori Default (seed data):**
| Icon ID | Nama | Type | Budget (IDR) |
|---------|------|------|--------------|
| utensils | Food & Drink | expense | 2,000,000 |
| car | Transport | expense | 500,000 |
| home | Rent & Housing | expense | 0 |
| zap | Utilities | expense | 300,000 |
| stethoscope | Health | expense | 0 |
| shirt | Fashion | expense | 500,000 |
| scissors | Beauty | expense | 300,000 |
| gamepad | Entertainment | expense | 200,000 |
| graduation-cap | Education | expense | 0 |
| heart | Dating | expense | 500,000 |
| shopping-bag | Groceries | expense | 1,000,000 |
| dog | Pets | expense | 0 |
| gift | Gifts | expense | 0 |
| briefcase | Salary | income | 0 |
| banknote | Freelance | income | 0 |
| trending-up | Bonus | income | 0 |
| package | Others | both | 0 |

### 4.4 Collection: `transactions/{transactionId}`
```kotlin
data class Transaction(
    val transactionId: String,          // document ID
    val type: String,                   // "expense" | "income"
    val name: String,                   // "Makan siang warteg"
    val amount: Long,                   // IDR integer, ALWAYS POSITIVE
    val accountId: String,
    val accountName: String,            // DENORMALIZED — avoid extra read
    val categoryId: String,
    val categoryName: String,           // DENORMALIZED
    val categoryIcon: String,           // DENORMALIZED (icon ID)
    val owner: String,                  // "arul" | "fifi" | "shared"
    val ownerUid: String,
    val date: Timestamp,                // tanggal transaksi (user input)
    val note: String? = null,
    val tags: List<String>? = null,
    val isRecurring: Boolean? = false,
    val recurringId: String? = null,
    val createdAt: Timestamp,
    val updatedAt: Timestamp
)
```

### 4.5 Collection: `transfers/{transferId}`
```kotlin
data class Transfer(
    val transferId: String,             // document ID
    val name: String,                   // "Top up pacaran"
    val amount: Long,                   // IDR integer
    val fromAccountId: String,
    val fromAccountName: String,        // DENORMALIZED
    val fromAccountOwner: String,       // "arul" | "fifi" | "shared"
    val toAccountId: String,
    val toAccountName: String,          // DENORMALIZED
    val toAccountOwner: String,         // "arul" | "fifi" | "shared"
    val owner: String,                  // "arul" | "fifi" | "shared"
    val ownerUid: String,
    val date: Timestamp,
    val note: String? = null,
    val createdAt: Timestamp
)
```

### 4.6 Collection: `wishlistCategories/{categoryId}`
```kotlin
data class WishlistCategory(
    val categoryId: String,             // document ID
    val name: String,                   // max 50 chars
    val icon: String,                   // Lucide icon ID
    val owner: String,                  // "arul" | "fifi" | "shared"
    val isActive: Boolean = true,
    val createdBy: String,              // UID
    val createdAt: Timestamp
)
```

### 4.7 Collection: `wishlistItems/{itemId}`
```kotlin
data class WishlistItem(
    val itemId: String,                 // document ID
    val nama: String,                   // max 100 chars
    val harga: Long,                    // IDR, min 1, max 999,999,999,999
    val lokasi: String = "",            // URL atau nama toko, max 500 chars
    val categoryId: String,
    val owner: String,                  // "arul" | "fifi" | "shared"
    val isPurchased: Boolean = false,
    val purchasedAt: Timestamp? = null,
    val createdBy: String,              // UID
    val createdAt: Timestamp,
    val updatedAt: Timestamp
)
```

### Denormalization Strategy
Field `accountName`, `categoryName`, `categoryIcon` disimpan langsung di document transaction/transfer.
- **Alasan**: Hemat Firestore reads (tidak perlu join/lookup)
- **Tradeoff**: Saat rename account/category → batch update semua related docs (jarang terjadi)

---

## 5. Authentication Flow

### Flow Diagram
```
App Launch
    │
    ▼
Check Firebase Auth State (onAuthStateChanged equivalent)
    │
    ├── No user logged in ──────────► Login Screen
    │                                      │
    │                                      ▼
    │                              Google Sign-In
    │                                      │
    │                                      ▼
    │                              Check email in whitelist?
    │                                 │           │
    │                              NO ▼        YES ▼
    │                          Sign out +    Fetch user doc
    │                          Show error    from Firestore
    │                                           │
    │                                    ┌──────┴──────┐
    │                                    │             │
    │                              Doc exists?    No doc?
    │                                    │             │
    │                                    ▼             ▼
    │                              Load app      Onboarding
    │                                            (create profile)
    │                                                  │
    │                                                  ▼
    ▼                                            Dashboard
Dashboard ◄─────────────────────────────────────────────┘
```

### Login Logic (Pseudo-code)
```kotlin
fun handleGoogleSignIn() {
    val result = signInWithGoogle()
    val email = result.user.email
    
    // Whitelist check
    val allowedEmails = listOf("arulpm010@gmail.com", "fifi.work27@gmail.com")
    if (email !in allowedEmails) {
        firebaseAuth.signOut()
        showError("Akses ditolak. Akun ini tidak terdaftar.")
        return
    }
    
    // Check if user doc exists
    val userDoc = firestore.collection("users").document(result.user.uid).get()
    if (userDoc.exists()) {
        navigateTo(Dashboard)
    } else {
        navigateTo(Onboarding)
    }
}
```

### Onboarding Flow
1. User memilih nama display ("Arul" atau "Fifi")
2. User memilih role: `arul` atau `fifi`
3. System membuat user document di Firestore
4. Generate invite code (6 char) untuk partner linking
5. Navigate ke Dashboard

### Partner Linking
```kotlin
fun linkPartner(inviteCode: String) {
    // Find user with this invite code
    val query = firestore.collection("users")
        .whereEqualTo("inviteCode", inviteCode)
        .get()
    
    val partnerDoc = query.documents.first()
    val partnerUid = partnerDoc.id
    
    // Bidirectional linking
    firestore.batch {
        update("users/${currentUid}", "partnerUid" to partnerUid)
        update("users/${partnerUid}", "partnerUid" to currentUid)
    }.commit()
}
```

### Session Management
- Firebase Auth SDK handles session persistence automatically
- Token refresh handled by SDK
- Listen to auth state changes for logout detection
- No manual token management needed

---

## 6. Navigation & Screen Structure

### Bottom Navigation (5 tabs)
```
┌─────────────────────────────────────────────────┐
│ [🏠 Home] [👤 Owner*] [✨ Wishlist] [📋 Transaksi] [⋯ More] │
└─────────────────────────────────────────────────┘

* Owner tab = dynamic: Arul / Together / Fifi
  - Tap: navigate ke halaman owner yang aktif
  - Long-press: popup menu untuk switch owner
```

### Screen Map
```
├── LoginScreen
├── OnboardingScreen
│
├── MainScreen (with BottomNav)
│   ├── DashboardScreen (Home tab)
│   ├── OwnerScreen (dynamic: Arul/Fifi/Together)
│   │   ├── ArulScreen
│   │   ├── FifiScreen
│   │   └── TogetherScreen
│   ├── WishlistScreen
│   ├── TransactionsScreen
│   │   ├── TransactionListTab
│   │   └── TransferListTab
│   └── MoreScreen
│       ├── AccountsScreen
│       ├── CategoriesScreen
│       └── SettingsScreen
│
├── Bottom Sheets (overlay, bukan screen baru)
│   ├── ActionSheet (pilih: Expense/Income/Transfer)
│   ├── ExpenseSheet (form add/edit expense)
│   ├── IncomeSheet (form add/edit income)
│   ├── TransferSheet (form add/edit transfer)
│   ├── AccountFormSheet (add/edit account)
│   ├── CategoryFormSheet (add/edit category)
│   ├── WishlistItemFormSheet (add/edit wishlist item)
│   ├── WishlistCategoryFormSheet (add/edit wishlist category)
│   ├── AccountDetailSheet (detail akun + history)
│   └── MonthPickerSheet
│
└── Dialogs
    ├── ConfirmDeleteDialog
    ├── WishlistDeleteCategoryDialog
    └── LogoutConfirmDialog
```

### Owner Switcher Behavior (Bottom Nav)
```
Default active owner = currentUser.role (arul/fifi)

Tap behavior:
  → Navigate ke halaman owner yang sedang aktif

Long-press behavior (400ms):
  → Show dropdown menu: [Arul] [Together] [Fifi]
  → Pilih salah satu → navigate ke halaman tersebut
  → Active owner berubah sesuai pilihan

Visual:
  → Chevron-up icon di atas icon owner (hint: bisa di-switch)
  → First-time tooltip: "Tahan untuk ganti"
  → Haptic feedback saat long-press trigger
```

---

## 7. Feature Specification & UI Flow

### 7.1 Dashboard Screen

**Layout (top to bottom):**
```
┌─────────────────────────────────┐
│  Header: "Arthafiloka" + [◀ Month ▶] │
├─────────────────────────────────┤
│  Hero Card (tappable):          │
│  ┌─────────────────────────────┐│
│  │ 💰 Total Kekayaan    [👁]  ││
│  │ Rp 56.100.000              ││
│  └─────────────────────────────┘│
│  Tap → opens Account Breakdown Sheet │
│  Eye icon → toggle show/hide balance │
├─────────────────────────────────┤
│  Grid 2 kolom:                  │
│  ┌──────────┐ ┌──────────┐     │
│  │📈 Income │ │📉 Expense│     │
│  │+8.500.000│ │-6.200.000│     │
│  └──────────┘ └──────────┘     │
├─────────────────────────────────┤
│  Spending by Category           │
│  (Budget progress bars)         │
│  🍔 Food: ████████░░ 78%       │
│  👗 Fashion: ██████████ 105% 🔴│
├─────────────────────────────────┤
│  Recent Transactions            │
│  (Last 10 transactions + transfers) │
│  Grouped by date                │
│  Tap item → edit sheet          │
│  "Lihat Semua →" link          │
├─────────────────────────────────┤
│                          [+ FAB]│
└─────────────────────────────────┘
```

**Data Sources:**
- `totalBalance` = sum of all active accounts' balance
- `income` / `expense` = from `useSummary(selectedMonth)`
- `budgets` = from `useBudgetStatus(selectedMonth)`
- `transactions` = from `useTransactions(startOfMonth, endOfMonth)`
- `transfers` = from `useTransfers(startOfMonth, endOfMonth)`

**Interactions:**
- Month picker: chevron left/right to navigate months
- Hero card tap → Account Breakdown bottom sheet
- Eye icon → toggle balance visibility (local state)
- Budget item tap → navigate to Categories screen
- Transaction item tap → open edit sheet (expense/income)
- Transfer item tap → open edit transfer sheet
- FAB tap → Action Sheet (Expense/Income/Transfer)

### 7.2 Add Expense Flow (Bottom Sheet)

**Priority: < 5 taps to complete**

```
┌─────────────────────────────────┐
│  ─── (drag handle)              │
│  Tambah Pengeluaran             │
│                                 │
│  Jumlah *                       │
│  ┌─────────────────────────┐   │
│  │ Rp  [auto-focus numpad] │   │
│  └─────────────────────────┘   │
│                                 │
│  Keterangan *                   │
│  ┌─────────────────────────┐   │
│  │ Makan siang, bensin...  │   │
│  └─────────────────────────┘   │
│                                 │
│  Kategori * (quick grid 6 items)│
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│  │🍔│ │🚗│ │🏠│ │💡│ │💊│ │📦││
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
│  [Lihat semua kategori →]      │
│  [+ Tambah kategori]           │
│                                 │
│  Pemilik: [Arul ▼]             │
│  Akun:    [Bank Jago ▼]        │
│  Tanggal: [2025-05-25]         │
│  Catatan:  (opsional)           │
│                                 │
│  [━━━━ Simpan Pengeluaran ━━━━]│
│  (edit mode: + [Hapus Transaksi])│
└─────────────────────────────────┘
```

**Smart Defaults:**
- Amount: auto-focus + numeric keyboard
- Owner: `defaultOwner` dari page context, atau `currentUser.role`
- Account: filter by selected owner, pre-select `defaultAccountId`
- Date: today
- Category: show categories filtered by `budgetScope == selectedOwner`

**Form Validation (Zod equivalent):**
```kotlin
// Validation rules:
amount: Long > 0, required
name: String, min 1 char, required
categoryId: String, min 1 char, required
accountId: String, min 1 char, required
owner: enum("arul", "fifi", "shared"), required
date: Timestamp, required
note: String?, optional
```

**Submit Logic:**
```kotlin
fun createExpense(data: TransactionInput) {
    val batch = firestore.batch()
    
    // 1. Create transaction document
    val txRef = firestore.collection("transactions").document()
    batch.set(txRef, data.copy(
        type = "expense",
        createdAt = serverTimestamp(),
        updatedAt = serverTimestamp()
    ))
    
    // 2. Update account balance (DECREMENT)
    val accountRef = firestore.collection("accounts").document(data.accountId)
    batch.update(accountRef, mapOf(
        "balance" to FieldValue.increment(-data.amount),
        "updatedAt" to serverTimestamp()
    ))
    
    // 3. Commit atomically
    batch.commit()
}
```

### 7.3 Add Income Flow (Bottom Sheet)

Sama persis dengan Expense, perbedaan:
- Title: "Tambah Pemasukan"
- Account label: "Ke Akun"
- Category filter: `type == "income" || type == "both"`
- Button: "Simpan Pemasukan" (warna hijau)
- Balance update: `FieldValue.increment(+amount)` (INCREMENT)

### 7.4 Add Transfer Flow (Bottom Sheet)

```
┌─────────────────────────────────┐
│  Transfer Antar Akun            │
│                                 │
│  Jumlah *: [Rp ___________]    │
│  Keterangan *: [____________]   │
│  Dari Akun *: [dropdown all]    │
│  Ke Akun *:   [dropdown all]    │
│  Tanggal:     [date picker]     │
│  Catatan:     (opsional)        │
│                                 │
│  [━━━━━━━ Transfer ━━━━━━━━━━] │
└─────────────────────────────────┘
```

**Validation:**
- `fromAccountId != toAccountId` (wajib beda)
- Amount > 0

**Submit Logic:**
```kotlin
fun createTransfer(data: TransferInput) {
    val batch = firestore.batch()
    
    // 1. Create transfer document
    val transferRef = firestore.collection("transfers").document()
    batch.set(transferRef, data.copy(createdAt = serverTimestamp()))
    
    // 2. Debit from account
    val fromRef = firestore.collection("accounts").document(data.fromAccountId)
    batch.update(fromRef, mapOf(
        "balance" to FieldValue.increment(-data.amount),
        "updatedAt" to serverTimestamp()
    ))
    
    // 3. Credit to account
    val toRef = firestore.collection("accounts").document(data.toAccountId)
    batch.update(toRef, mapOf(
        "balance" to FieldValue.increment(data.amount),
        "updatedAt" to serverTimestamp()
    ))
    
    batch.commit()
}
```

### 7.5 Edit Transaction Flow

- Tap transaction item → open same sheet as Add, pre-filled with existing data
- On submit: **reverse old balance, apply new balance, update document**

```kotlin
fun updateTransaction(id: String, oldTx: Transaction, newData: TransactionInput) {
    val batch = firestore.batch()
    
    // 1. Update transaction document
    val txRef = firestore.collection("transactions").document(id)
    batch.update(txRef, newData.toMap() + mapOf("updatedAt" to serverTimestamp()))
    
    // 2. Reverse old balance on old account
    val oldDelta = if (oldTx.type == "expense") oldTx.amount else -oldTx.amount
    val oldAccountRef = firestore.collection("accounts").document(oldTx.accountId)
    batch.update(oldAccountRef, mapOf(
        "balance" to FieldValue.increment(oldDelta),
        "updatedAt" to serverTimestamp()
    ))
    
    // 3. Apply new balance on new account
    val newAccountId = newData.accountId ?: oldTx.accountId
    val newAmount = newData.amount ?: oldTx.amount
    val newType = newData.type ?: oldTx.type
    val newDelta = if (newType == "expense") -newAmount else newAmount
    val newAccountRef = firestore.collection("accounts").document(newAccountId)
    batch.update(newAccountRef, mapOf(
        "balance" to FieldValue.increment(newDelta),
        "updatedAt" to serverTimestamp()
    ))
    
    batch.commit()
}
```

### 7.6 Delete Transaction Flow

1. User long-press atau tap delete button
2. Show confirmation dialog: "Hapus Transaksi? Saldo akun akan dikembalikan."
3. On confirm:

```kotlin
fun deleteTransaction(tx: Transaction) {
    val batch = firestore.batch()
    
    // 1. Delete document
    val txRef = firestore.collection("transactions").document(tx.transactionId)
    batch.delete(txRef)
    
    // 2. Reverse balance
    val delta = if (tx.type == "expense") tx.amount else -tx.amount
    val accountRef = firestore.collection("accounts").document(tx.accountId)
    batch.update(accountRef, mapOf(
        "balance" to FieldValue.increment(delta),
        "updatedAt" to serverTimestamp()
    ))
    
    batch.commit()
}
```

### 7.7 Edit/Delete Transfer Flow

**Edit Transfer:**
```kotlin
fun updateTransfer(id: String, oldTransfer: Transfer, newData: TransferInput) {
    val batch = firestore.batch()
    
    // Update document
    batch.update(transferRef, newData.toMap() + mapOf("updatedAt" to serverTimestamp()))
    
    // Compute net delta per accountId (handles case where accounts change)
    val deltas = mutableMapOf<String, Long>()
    
    // Reverse old: credit back fromAccount, debit toAccount
    deltas[oldTransfer.fromAccountId] = (deltas[oldTransfer.fromAccountId] ?: 0) + oldTransfer.amount
    deltas[oldTransfer.toAccountId] = (deltas[oldTransfer.toAccountId] ?: 0) - oldTransfer.amount
    
    // Apply new: debit fromAccount, credit toAccount
    deltas[newData.fromAccountId] = (deltas[newData.fromAccountId] ?: 0) - newData.amount
    deltas[newData.toAccountId] = (deltas[newData.toAccountId] ?: 0) + newData.amount
    
    // Apply net deltas
    deltas.forEach { (accountId, delta) ->
        if (delta != 0L) {
            val ref = firestore.collection("accounts").document(accountId)
            batch.update(ref, mapOf(
                "balance" to FieldValue.increment(delta),
                "updatedAt" to serverTimestamp()
            ))
        }
    }
    
    batch.commit()
}
```

**Delete Transfer:**
```kotlin
fun deleteTransfer(transfer: Transfer) {
    val batch = firestore.batch()
    batch.delete(transferRef)
    
    // Reverse: credit back fromAccount
    batch.update(fromRef, "balance" to FieldValue.increment(transfer.amount))
    // Reverse: debit toAccount
    batch.update(toRef, "balance" to FieldValue.increment(-transfer.amount))
    
    batch.commit()
}
```

### 7.8 Owner Pages (Arul / Fifi / Together)

Ketiga halaman ini identik strukturnya, hanya berbeda filter `owner`:

```
┌─────────────────────────────────┐
│  Header: "{Name}"  [◀ Month ▶]  │
├─────────────────────────────────┤
│  Total Balance: Rp X.XXX.XXX    │
│  +Income  -Expense              │
├─────────────────────────────────┤
│  Akun (filtered by owner)       │
│  ┌─ 🏦 Bank Mandiri    25,110 ─┐│
│  ├─ 🏦 Bank Jago       28,773 ─┤│
│  └─ 💰 Saving       2,302,049 ─┘│
│  [+ Tambah Akun]               │
├─────────────────────────────────┤
│  Recent Transactions            │
│  (filtered: owner = "arul")     │
├─────────────────────────────────┤
│                          [+ FAB]│
└─────────────────────────────────┘
```

**Behavior khusus:**
- Saat masuk halaman owner, set `defaultOwner` di state
- Form expense/income yang dibuka dari sini akan pre-select owner tersebut
- Saat keluar halaman, reset `defaultOwner` ke null

### 7.9 Transactions Screen

**Tabs:** `[Transaksi]` `[Transfer]`

**Transaksi Tab:**
- Filter bar: Owner (All/Arul/Fifi/Together), Type (All/Expense/Income)
- List grouped by date
- Tap → edit sheet
- Long-press / context menu → delete with confirmation

**Transfer Tab:**
- List grouped by date
- Tap → edit transfer sheet
- Delete with confirmation

**Query:**
```kotlin
// Transactions query
firestore.collection("transactions")
    .whereGreaterThanOrEqualTo("date", startOfMonth)
    .whereLessThanOrEqualTo("date", endOfMonth)
    .orderBy("date", DESCENDING)
    .limit(20)
    // + optional: .whereEqualTo("owner", ownerFilter)
    // + optional: .whereEqualTo("type", typeFilter)
```

### 7.10 Wishlist Screen

```
┌─────────────────────────────────┐
│  Header: "Wishlist"             │
├─────────────────────────────────┤
│  Progress Summary               │
│  ┌─────────────────────────────┐│
│  │ 3/10 items purchased        ││
│  │ Rp 5.000.000 / 15.000.000  ││
│  │ [████████░░░░░░░░] 33%     ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│  Filter: [All] [Arul] [Fifi] [Berdua] │
│                        [+ Kategori]    │
├─────────────────────────────────┤
│  Category Section (collapsible) │
│  ┌─ 📱 Elektronik (2/5) ──────┐│
│  │ ○ iPhone 16 Pro  Rp 20jt   ││
│  │ ● AirPods Pro    Rp 4jt ✓  ││
│  │ ○ iPad Air       Rp 15jt   ││
│  └─────────────────────────────┘│
│  ┌─ 👗 Fashion (1/3) ─────────┐│
│  │ ...                         ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│                          [+ FAB]│
└─────────────────────────────────┘
```

**Logic:**
- Items sorted: unpurchased first (newest first), then purchased (newest first)
- Toggle purchased: tap checkbox → `togglePurchased(item)`
- Tap item → edit form
- Filter by owner
- Group by category (only show categories with items)
- Progress = purchased items count / total items count

### 7.11 Categories Screen

**Tabs:** `[Transaksi]` `[Wishlist]`
**Scope filter:** `[Semua]` `[Arul]` `[Fifi]` `[Together]`

**Transaksi tab:**
- List categories with budget progress bars
- Tap → edit category form
- Budget thresholds: 0-74% green, 75-99% yellow, 100%+ red

**Wishlist tab:**
- List wishlist categories
- Tap → edit
- Delete → soft delete (isActive = false)

### 7.12 Accounts Screen

- List all accounts grouped by owner
- Tap → Account Detail Sheet (balance + recent transactions for that account)
- Add/Edit via bottom sheet form
- Deactivate (soft delete)

### 7.13 Settings Screen

- Profile info (name, email, photo)
- Default account selector
- Theme switcher (Light / Dark / System)
- Logout button with confirmation
- App version

---

## 8. Business Logic & Rules

### 8.1 Balance Consistency (CRITICAL)

**Aturan #1: Semua mutasi balance HARUS menggunakan Firestore batch write (atomic).**

| Aksi | Balance Effect |
|------|---------------|
| Create expense | account.balance -= amount |
| Create income | account.balance += amount |
| Create transfer | from.balance -= amount, to.balance += amount |
| Edit expense | reverse old (+=), apply new (-=) |
| Edit income | reverse old (-=), apply new (+=) |
| Edit transfer | reverse both old, apply both new (net delta) |
| Delete expense | account.balance += amount (reverse) |
| Delete income | account.balance -= amount (reverse) |
| Delete transfer | from.balance += amount, to.balance -= amount |

**Aturan #2: Gunakan `FieldValue.increment()` bukan read-then-write.**
Ini mencegah race condition jika 2 user menulis bersamaan.

### 8.2 Soft Delete Pattern

- Accounts: `isActive = false` (never hard delete)
- Categories: `isActive = false`
- Wishlist Categories: `isActive = false`
- Transactions: **hard delete** (+ reverse balance)
- Transfers: **hard delete** (+ reverse balance)
- Wishlist Items: **hard delete**

### 8.3 Budget Calculation

```kotlin
fun calculateBudgetStatus(month: Date, categories: List<Category>): List<BudgetStatus> {
    // Query all expense transactions for the month
    val expenses = firestore.collection("transactions")
        .whereEqualTo("type", "expense")
        .whereGreaterThanOrEqualTo("date", startOfMonth(month))
        .whereLessThanOrEqualTo("date", endOfMonth(month))
    
    // Sum spending per categoryId
    val spending: Map<String, Long> = expenses.groupBy { it.categoryId }
        .mapValues { (_, txs) -> txs.sumOf { it.amount } }
    
    // Calculate status for categories with budget > 0
    return categories
        .filter { it.budgetAmount > 0 }
        .map { category ->
            val spent = spending[category.categoryId] ?: 0
            val percentage = (spent * 100 / category.budgetAmount).toInt()
            BudgetStatus(
                categoryId = category.categoryId,
                categoryName = category.name,
                categoryIcon = category.icon,
                budgetAmount = category.budgetAmount,
                spent = spent,
                percentage = percentage,
                status = when {
                    percentage >= 100 -> "over"
                    percentage >= 75 -> "warning"
                    else -> "normal"
                }
            )
        }
}
```

### 8.4 Summary Calculation

```kotlin
fun calculateSummary(month: Date, owner: String?): Summary {
    val query = firestore.collection("transactions")
        .whereGreaterThanOrEqualTo("date", startOfMonth(month))
        .whereLessThanOrEqualTo("date", endOfMonth(month))
    
    if (owner != null) query.whereEqualTo("owner", owner)
    
    var income = 0L
    var expense = 0L
    
    query.get().forEach { doc ->
        val tx = doc.toObject<Transaction>()
        if (tx.type == "income") income += tx.amount
        else expense += tx.amount
    }
    
    return Summary(income = income, expense = expense, net = income - expense)
}
```

### 8.5 Wishlist Progress

```kotlin
fun calculateProgress(items: List<WishlistItem>): ProgressSummary {
    val purchased = items.filter { it.isPurchased }
    return ProgressSummary(
        purchasedCount = purchased.size,
        totalCount = items.size,
        purchasedAmount = purchased.sumOf { it.harga },
        totalAmount = items.sumOf { it.harga }
    )
}
```

### 8.6 Currency Formatting

```kotlin
fun formatCurrency(amount: Long): String {
    // Output: "Rp 1.234.567"
    return NumberFormat.getCurrencyInstance(Locale("id", "ID")).apply {
        maximumFractionDigits = 0
    }.format(amount)
}

fun formatNumber(amount: Long): String {
    // Output: "1.234.567"
    return NumberFormat.getNumberInstance(Locale("id", "ID")).format(amount)
}

fun parseCurrency(value: String): Long {
    // Input: "1.234.567" → Output: 1234567
    return value.replace(Regex("[^\\d]"), "").toLongOrNull() ?: 0
}
```

### 8.7 Date Formatting

```kotlin
fun formatRelativeDate(date: Date): String {
    return when {
        isToday(date) -> "Hari ini"
        isYesterday(date) -> "Kemarin"
        isThisWeek(date) -> dayOfWeekName(date)  // "Senin", "Selasa"
        isThisYear(date) -> format(date, "d MMM")  // "12 Mar"
        else -> format(date, "d MMM yyyy")  // "12 Mar 2023"
    }
}

fun formatMonthYear(date: Date): String {
    // Output: "Mei 2025"
    return format(date, "MMMM yyyy", Locale("id"))
}
```

### 8.8 Wishlist Item Sorting

```kotlin
fun sortWishlistItems(items: List<WishlistItem>): List<WishlistItem> {
    return items.sortedWith(compareBy<WishlistItem> { it.isPurchased }
        .thenByDescending { it.createdAt?.toDate()?.time ?: 0 })
}
```

### 8.9 Duplicate Category Name Check

```kotlin
fun isDuplicateCategoryName(
    name: String,
    existingCategories: List<WishlistCategory>,
    excludeId: String? = null
): Boolean {
    val normalized = name.trim().lowercase()
    return existingCategories.any { cat ->
        cat.categoryId != excludeId &&
        cat.name.trim().lowercase() == normalized
    }
}
```

---

## 9. State Management

### Architecture Pattern: MVVM + Repository

```
┌─────────────────────────────────────────────┐
│  UI Layer (Compose Screens / Fragments)     │
├─────────────────────────────────────────────┤
│  ViewModel Layer (StateFlow / LiveData)     │
│  - AppViewModel (global UI state)           │
│  - DashboardViewModel                       │
│  - TransactionsViewModel                    │
│  - AccountsViewModel                        │
│  - CategoriesViewModel                      │
│  - WishlistViewModel                        │
├─────────────────────────────────────────────┤
│  Repository Layer                           │
│  - AuthRepository                           │
│  - AccountsRepository                       │
│  - TransactionsRepository                   │
│  - TransfersRepository                      │
│  - CategoriesRepository                     │
│  - WishlistRepository                       │
├─────────────────────────────────────────────┤
│  Firebase SDK (Auth + Firestore)            │
└─────────────────────────────────────────────┘
```

### Global App State (equivalent to Zustand store)

```kotlin
data class AppState(
    // Auth
    val currentUser: User? = null,
    val partner: User? = null,
    val isLoading: Boolean = true,
    
    // UI
    val activeSheet: SheetType? = null,  // expense | income | transfer | null
    val editingTransaction: Transaction? = null,
    val editingTransfer: Transfer? = null,
    val selectedMonth: Date = Date(),
    val defaultOwner: String? = null     // set by owner pages
)

enum class SheetType { EXPENSE, INCOME, TRANSFER }
```

### Realtime Listeners Pattern

Setiap data collection menggunakan Firestore `addSnapshotListener` (equivalent to `onSnapshot`):

```kotlin
class AccountsRepository(private val firestore: FirebaseFirestore) {
    
    fun observeAccounts(owner: String? = null): Flow<List<Account>> = callbackFlow {
        val query = firestore.collection("accounts")
            .whereEqualTo("isActive", true)
            .orderBy("order")
        
        if (owner != null) query.whereEqualTo("owner", owner)
        
        val listener = query.addSnapshotListener { snapshot, error ->
            if (error != null) { close(error); return@addSnapshotListener }
            val accounts = snapshot?.documents?.map { doc ->
                doc.toObject<Account>()!!.copy(accountId = doc.id)
            } ?: emptyList()
            trySend(accounts)
        }
        
        awaitClose { listener.remove() }
    }
}
```

### Data Flow
```
Firestore addSnapshotListener
     │
     ▼
Repository (Flow<List<T>>)
     │
     ▼
ViewModel (StateFlow<UiState>)
     │
     ▼
Compose UI (collectAsState)
     │
     ▼
User action → ViewModel function → Repository write → Firestore
     → Listener fires → Flow emits → UI updates
```

---

## 10. Design System & Theming

### Color Tokens

```kotlin
// Light Theme
object LightColors {
    val background = Color(0xFFFFFFFF)
    val foreground = Color(0xFF1A1A1A)
    val card = Color(0xFFFFFFFF)
    val cardForeground = Color(0xFF1A1A1A)
    val primary = Color(0xFF1A1A1A)
    val primaryForeground = Color(0xFFFAFAFA)
    val secondary = Color(0xFFF5F5F4)
    val secondaryForeground = Color(0xFF1A1A1A)
    val muted = Color(0xFFF5F5F4)
    val mutedForeground = Color(0xFF737373)
    val accent = Color(0xFFF5F5F4)
    val accentForeground = Color(0xFF1A1A1A)
    val destructive = Color(0xFFE03E3E)
    val border = Color(0xFFE5E5E3)
    val input = Color(0xFFE5E5E3)
    
    // Semantic
    val income = Color(0xFF0F9B58)
    val expense = Color(0xFFE03E3E)
    val transfer = Color(0xFF2383E2)
    val warning = Color(0xFFD9730D)
    
    // Owner
    val arul = Color(0xFF2383E2)
    val fifi = Color(0xFFE255A1)
    val shared = Color(0xFF9B59B6)
}

// Dark Theme
object DarkColors {
    val background = Color(0xFF0A0A0A)
    val foreground = Color(0xFFFAFAFA)
    val card = Color(0xFF0A0A0A)
    val cardForeground = Color(0xFFFAFAFA)
    val primary = Color(0xFFFAFAFA)
    val primaryForeground = Color(0xFF1A1A1A)
    val secondary = Color(0xFF262626)
    val secondaryForeground = Color(0xFFFAFAFA)
    val muted = Color(0xFF262626)
    val mutedForeground = Color(0xFFA3A3A3)
    val accent = Color(0xFF262626)
    val accentForeground = Color(0xFFFAFAFA)
    val destructive = Color(0xFF7F1D1D)
    val border = Color(0xFF262626)
    val input = Color(0xFF262626)
    
    // Semantic (same as light)
    val income = Color(0xFF0F9B58)
    val expense = Color(0xFFE03E3E)
    val transfer = Color(0xFF2383E2)
    val warning = Color(0xFFD9730D)
    val arul = Color(0xFF2383E2)
    val fifi = Color(0xFFE255A1)
    val shared = Color(0xFF9B59B6)
}
```

### Typography

```kotlin
val AppTypography = Typography(
    // Page titles
    headlineLarge = TextStyle(
        fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.SemiBold,
        fontFamily = GeistFont
    ),
    // Section headers
    headlineMedium = TextStyle(
        fontSize = 20.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold,
        fontFamily = GeistFont
    ),
    // Card titles
    titleMedium = TextStyle(
        fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.Medium,
        fontFamily = GeistFont
    ),
    // Body text
    bodyMedium = TextStyle(
        fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Normal,
        fontFamily = GeistFont
    ),
    // Labels, captions
    bodySmall = TextStyle(
        fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Normal,
        fontFamily = GeistFont
    ),
    // Badges, tags
    labelSmall = TextStyle(
        fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Medium,
        fontFamily = GeistFont
    ),
)

// Amounts use monospace font
val AmountStyle = TextStyle(
    fontFamily = GeistMonoFont,
    fontFeatureSettings = "tnum"  // tabular numbers
)
```

### Component Specs

| Component | Specs |
|-----------|-------|
| Card | bg: card, border: 1dp border, radius: 12dp, padding: 16dp |
| Bottom Sheet | bg: background, radius: 16dp top, max-height: 90%, drag handle |
| FAB | 56x56dp, bg: foreground, radius: 16dp, elevation: 6dp |
| Bottom Nav | height: 64dp + safe area, bg: background, border-top: 1dp |
| Transaction Item | height: 56dp, layout: [icon 36dp] [text] [amount] |
| Button (primary) | height: 40dp, bg: primary, radius: 8dp, full-width in sheets |
| Input | height: 40dp, border: 1dp input, radius: 8dp |

### Spacing
```
Page padding: 16dp
Card gap: 12dp
Section gap: 24dp
Bottom nav height: 64dp
FAB bottom offset: 80dp (above nav)
Safe area: WindowInsets handling
```

### Icons
Gunakan Lucide icons (tersedia sebagai library Android):
- `lucide-android` atau custom SVG assets
- Icon IDs yang digunakan: utensils, car, home, zap, heart, graduation-cap, gamepad, shirt, gift, plane, coffee, wifi, phone, stethoscope, baby, dog, dumbbell, music, film, book-open, briefcase, credit-card, banknote, piggy-bank, trending-up, receipt, package, wrench, scissors, shopping-bag

---

## 11. Offline Support & Caching

### Firestore Offline Persistence
- **Android SDK**: Offline persistence ENABLED by default
- Data di-cache di local disk
- Writes yang dilakukan offline akan di-queue dan auto-sync saat online
- Reads dari cache jika offline

### Configuration
```kotlin
val settings = firestoreSettings {
    isPersistenceEnabled = true  // default true di Android
    cacheSizeBytes = FirebaseFirestoreSettings.CACHE_SIZE_UNLIMITED
}
firestore.firestoreSettings = settings
```

### Offline UX
- Show "Offline" badge/indicator saat tidak ada koneksi
- Semua operasi tetap berjalan (write to local cache)
- Auto-sync saat reconnect (no user action needed)
- Detect connectivity: `ConnectivityManager` atau `NetworkCallback`

### Caching Strategy
```
Layer 1: Firestore offline cache (disk, automatic)
Layer 2: ViewModel StateFlow (in-memory, lifecycle-aware)
Layer 3: Compose state (derived, UI-specific)
```

---

## 12. Security Rules & Validation

### Firestore Security Rules (deployed)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Only Arul & Fifi — by UID and email
    function isAllowedUser() {
      return request.auth != null
        && request.auth.uid in ['RPS8bvX5eGerNJDm20RvQS0tnHI2', 'UIioxgSjFceo0lmwAWWnrFLm6uJ2']
        && request.auth.token.email in ['fifi.work27@gmail.com', 'arulpm010@gmail.com'];
    }

    function isValidTransaction() {
      let data = request.resource.data;
      return data.amount > 0
        && data.name.size() > 0
        && data.type in ['expense', 'income']
        && data.owner in ['arul', 'fifi', 'shared'];
    }

    match /users/{userId} {
      allow read: if isAllowedUser();
      allow write: if isAllowedUser() && request.auth.uid == userId;
    }

    match /accounts/{accountId} {
      allow read: if isAllowedUser();
      allow create: if isAllowedUser();
      allow update, delete: if isAllowedUser();
    }

    match /transactions/{txId} {
      allow read: if isAllowedUser();
      allow create: if isAllowedUser() && isValidTransaction();
      allow update, delete: if isAllowedUser();
    }

    match /transfers/{transferId} {
      allow read, create, update, delete: if isAllowedUser();
    }

    match /categories/{catId} {
      allow read, write: if isAllowedUser();
    }

    match /wishlistItems/{itemId} {
      allow read, write: if isAllowedUser();
    }

    match /wishlistCategories/{catId} {
      allow read, write: if isAllowedUser();
    }
  }
}
```

### Client-Side Validation Rules

| Field | Rule |
|-------|------|
| Transaction.amount | > 0, integer, max 999,999,999,999 |
| Transaction.name | min 1 char, required |
| Transaction.type | "expense" \| "income" |
| Transaction.owner | "arul" \| "fifi" \| "shared" |
| Transfer.fromAccountId | != toAccountId |
| Transfer.amount | > 0 |
| Account.name | min 1 char |
| Account.balance | >= 0 (initial), can go negative after transactions |
| Category.name | min 1 char |
| Category.budgetAmount | >= 0 |
| WishlistItem.nama | min 1, max 100 chars |
| WishlistItem.harga | min 1, max 999,999,999,999 |
| WishlistItem.lokasi | max 500 chars |
| WishlistCategory.name | min 1, max 50 chars, unique (case-insensitive) |

---

## 13. Error Handling

### Error Categories & UI Response

| Category | Example | Response |
|----------|---------|----------|
| Network offline | No internet | Show offline badge, queue writes |
| Auth expired | Token expired | Redirect to login |
| Validation | Invalid amount | Inline form error messages |
| Firestore write fail | Quota exceeded | Toast error + retry |
| Permission denied | Security rules reject | Toast "Akses ditolak" |

### Toast/Snackbar Messages
```
✅ Success (auto-dismiss 3s):
   "Pengeluaran tersimpan"
   "Pemasukan tersimpan"
   "Transfer berhasil"
   "Akun berhasil ditambahkan"
   "Kategori berhasil diperbarui"
   "Item berhasil ditambahkan"

❌ Error (with retry action):
   "Gagal menyimpan. Coba lagi."
   "Gagal menghapus. Coba lagi."
   "Gagal memuat data. Coba lagi nanti."

⚠️ Warning:
   "Budget exceeded for Food & Drink"

ℹ️ Info:
   "Kamu sedang offline. Perubahan akan disinkronkan."
```

### Loading States
- Initial app load: full-screen loading indicator
- Data fetch: skeleton/shimmer placeholders
- Form submit: button shows loading spinner, disabled
- Sheet open: instant (no loading needed)

### Error Flow Pattern
```
Repository throws exception
    → ViewModel catches
    → Sets error state in UiState
    → UI shows toast/snackbar
    → Form retains data (no reset on error)
    → User can retry
```

---

## 14. Performance Optimization

### Firestore Optimization
- **Pagination**: Load 20 transactions per page (limit query)
- **Denormalized fields**: No extra reads for display
- **Composite indexes**: Pre-built for common queries
- **Offline persistence**: Read from cache first
- **Listener cleanup**: Remove listeners when screen not visible

### UI Performance
- **Lazy lists**: Use `LazyColumn` for long lists
- **Remember/derivedStateOf**: Avoid unnecessary recomposition
- **Stable keys**: Use document IDs as list keys
- **Image-free**: Icon-based UI (no image loading)

### Memory Management
- Unsubscribe Firestore listeners in `onCleared()` (ViewModel)
- Use `viewModelScope` for coroutines
- Avoid holding references to Activity/Fragment

### Bundle Size
- Tree-shake Firebase SDK (only import needed modules)
- ProGuard/R8 for release builds
- Remove unused resources

### Metrics Targets
| Metric | Target |
|--------|--------|
| Cold start | < 2s |
| Screen transition | < 300ms |
| Form submit | < 1s perceived |
| List scroll | 60fps |
| APK size | < 20MB |

---

## Appendix A: Account Seed Data

| Name | Owner | Type | Initial Balance (IDR) |
|------|-------|------|----------------------|
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

---

## Appendix B: Icon Mapping (Lucide → Android)

Web app menggunakan Lucide icon IDs. Untuk Android, map ke:
- Lucide Android library: `com.github.nicholasgasior:lucide-android`
- Atau custom SVG/Vector drawable assets

```kotlin
val iconMap = mapOf(
    "utensils" to R.drawable.ic_utensils,
    "car" to R.drawable.ic_car,
    "home" to R.drawable.ic_home,
    "zap" to R.drawable.ic_zap,
    "heart" to R.drawable.ic_heart,
    "graduation-cap" to R.drawable.ic_graduation_cap,
    "gamepad" to R.drawable.ic_gamepad,
    "shirt" to R.drawable.ic_shirt,
    "gift" to R.drawable.ic_gift,
    "plane" to R.drawable.ic_plane,
    "coffee" to R.drawable.ic_coffee,
    "wifi" to R.drawable.ic_wifi,
    "phone" to R.drawable.ic_phone,
    "stethoscope" to R.drawable.ic_stethoscope,
    "baby" to R.drawable.ic_baby,
    "dog" to R.drawable.ic_dog,
    "dumbbell" to R.drawable.ic_dumbbell,
    "music" to R.drawable.ic_music,
    "film" to R.drawable.ic_film,
    "book-open" to R.drawable.ic_book_open,
    "briefcase" to R.drawable.ic_briefcase,
    "credit-card" to R.drawable.ic_credit_card,
    "banknote" to R.drawable.ic_banknote,
    "piggy-bank" to R.drawable.ic_piggy_bank,
    "trending-up" to R.drawable.ic_trending_up,
    "receipt" to R.drawable.ic_receipt,
    "package" to R.drawable.ic_package,
    "wrench" to R.drawable.ic_wrench,
    "scissors" to R.drawable.ic_scissors,
    "shopping-bag" to R.drawable.ic_shopping_bag,
    // Account type icons
    "wallet" to R.drawable.ic_wallet,
    "building-2" to R.drawable.ic_building,
    "smartphone" to R.drawable.ic_smartphone,
)
```

---

## Appendix C: Recommended Android Project Structure

```
app/
├── src/main/
│   ├── java/com/arthafiloka/app/
│   │   ├── ArthafilokaApp.kt              // Application class
│   │   ├── MainActivity.kt                // Single activity
│   │   │
│   │   ├── data/
│   │   │   ├── model/                     // Data classes (Firestore models)
│   │   │   │   ├── User.kt
│   │   │   │   ├── Account.kt
│   │   │   │   ├── Transaction.kt
│   │   │   │   ├── Transfer.kt
│   │   │   │   ├── Category.kt
│   │   │   │   ├── WishlistCategory.kt
│   │   │   │   ├── WishlistItem.kt
│   │   │   │   └── BudgetStatus.kt
│   │   │   │
│   │   │   ├── repository/               // Firestore CRUD + listeners
│   │   │   │   ├── AuthRepository.kt
│   │   │   │   ├── AccountsRepository.kt
│   │   │   │   ├── TransactionsRepository.kt
│   │   │   │   ├── TransfersRepository.kt
│   │   │   │   ├── CategoriesRepository.kt
│   │   │   │   └── WishlistRepository.kt
│   │   │   │
│   │   │   └── validation/               // Form validation
│   │   │       ├── TransactionValidator.kt
│   │   │       ├── TransferValidator.kt
│   │   │       ├── AccountValidator.kt
│   │   │       ├── CategoryValidator.kt
│   │   │       └── WishlistValidator.kt
│   │   │
│   │   ├── di/                            // Hilt modules
│   │   │   └── AppModule.kt
│   │   │
│   │   ├── ui/
│   │   │   ├── theme/                     // Material 3 theme
│   │   │   │   ├── Color.kt
│   │   │   │   ├── Type.kt
│   │   │   │   └── Theme.kt
│   │   │   │
│   │   │   ├── navigation/               // Compose Navigation
│   │   │   │   └── AppNavigation.kt
│   │   │   │
│   │   │   ├── components/               // Reusable composables
│   │   │   │   ├── AmountInput.kt
│   │   │   │   ├── MonthPicker.kt
│   │   │   │   ├── OwnerBadge.kt
│   │   │   │   ├── CategoryIcon.kt
│   │   │   │   ├── EmptyState.kt
│   │   │   │   ├── LoadingState.kt
│   │   │   │   ├── ConfirmDialog.kt
│   │   │   │   ├── FAB.kt
│   │   │   │   ├── ActionSheet.kt
│   │   │   │   └── OfflineBadge.kt
│   │   │   │
│   │   │   ├── screens/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── LoginScreen.kt
│   │   │   │   │   └── OnboardingScreen.kt
│   │   │   │   │
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── DashboardScreen.kt
│   │   │   │   │   ├── DashboardViewModel.kt
│   │   │   │   │   ├── SummaryCards.kt
│   │   │   │   │   ├── SpendingByCategory.kt
│   │   │   │   │   └── RecentTransactions.kt
│   │   │   │   │
│   │   │   │   ├── owner/
│   │   │   │   │   ├── OwnerScreen.kt     // Shared layout
│   │   │   │   │   └── OwnerViewModel.kt
│   │   │   │   │
│   │   │   │   ├── transactions/
│   │   │   │   │   ├── TransactionsScreen.kt
│   │   │   │   │   ├── TransactionsViewModel.kt
│   │   │   │   │   ├── TransactionItem.kt
│   │   │   │   │   ├── TransactionList.kt
│   │   │   │   │   ├── TransferItem.kt
│   │   │   │   │   ├── TransferList.kt
│   │   │   │   │   ├── ExpenseSheet.kt
│   │   │   │   │   ├── IncomeSheet.kt
│   │   │   │   │   └── TransferSheet.kt
│   │   │   │   │
│   │   │   │   ├── accounts/
│   │   │   │   │   ├── AccountsScreen.kt
│   │   │   │   │   ├── AccountsViewModel.kt
│   │   │   │   │   ├── AccountCard.kt
│   │   │   │   │   ├── AccountForm.kt
│   │   │   │   │   └── AccountDetailSheet.kt
│   │   │   │   │
│   │   │   │   ├── categories/
│   │   │   │   │   ├── CategoriesScreen.kt
│   │   │   │   │   ├── CategoriesViewModel.kt
│   │   │   │   │   ├── CategoryList.kt
│   │   │   │   │   ├── CategoryForm.kt
│   │   │   │   │   ├── CategoryGrid.kt
│   │   │   │   │   └── BudgetProgressBar.kt
│   │   │   │   │
│   │   │   │   ├── wishlist/
│   │   │   │   │   ├── WishlistScreen.kt
│   │   │   │   │   ├── WishlistViewModel.kt
│   │   │   │   │   ├── WishlistItemCard.kt
│   │   │   │   │   ├── WishlistItemForm.kt
│   │   │   │   │   ├── WishlistCategorySection.kt
│   │   │   │   │   ├── WishlistCategoryForm.kt
│   │   │   │   │   ├── WishlistFilterBar.kt
│   │   │   │   │   └── WishlistProgressSummary.kt
│   │   │   │   │
│   │   │   │   ├── settings/
│   │   │   │   │   └── SettingsScreen.kt
│   │   │   │   │
│   │   │   │   └── more/
│   │   │   │       └── MoreScreen.kt
│   │   │   │
│   │   │   └── MainScreen.kt             // BottomNav + NavHost
│   │   │
│   │   └── util/
│   │       ├── FormatCurrency.kt
│   │       ├── FormatDate.kt
│   │       └── Extensions.kt
│   │
│   └── res/
│       ├── drawable/                      // Icon SVGs
│       ├── values/
│       │   ├── strings.xml
│       │   ├── colors.xml
│       │   └── themes.xml
│       └── font/
│           ├── geist_regular.ttf
│           └── geist_mono_regular.ttf
│
├── build.gradle.kts
└── google-services.json
```

---

## Appendix D: Key Differences Web vs Android

| Aspect | Web (Next.js) | Android (Compose) |
|--------|---------------|-------------------|
| Navigation | URL-based routing | Compose Navigation |
| Bottom Sheet | Radix Sheet component | ModalBottomSheet |
| State | Zustand store | ViewModel + StateFlow |
| Realtime | onSnapshot | addSnapshotListener |
| Forms | React Hook Form + Zod | Custom state + validation |
| Offline | Firestore persistence (IndexedDB) | Firestore persistence (SQLite) |
| Auth | signInWithPopup | Google Sign-In Intent |
| Styling | Tailwind CSS | Compose Modifiers + Theme |
| Animation | Framer Motion | Compose Animation APIs |
| Toast | Sonner | Snackbar / Toast |
| Date picker | HTML input[type=date] | Material DatePicker |
| Numpad | inputMode="numeric" | KeyboardType.Number |

---

## Appendix E: Realtime Listener Queries

### Accounts
```
Collection: accounts
Where: isActive == true
OrderBy: order ASC
Optional: owner == {filter}
```

### Transactions (monthly)
```
Collection: transactions
Where: date >= startOfMonth AND date <= endOfMonth
OrderBy: date DESC
Limit: 20
Optional: owner == {filter}
Optional: type == {filter}
Optional: categoryId == {filter}
Optional: accountId == {filter}
```

### Transfers (monthly)
```
Collection: transfers
Where: date >= startOfMonth AND date <= endOfMonth
OrderBy: date DESC
```

### Categories
```
Collection: categories
Where: isActive == true
OrderBy: order ASC
```

### Wishlist Categories
```
Collection: wishlistCategories
Where: isActive == true
OrderBy: createdAt ASC
```

### Wishlist Items
```
Collection: wishlistItems
OrderBy: createdAt DESC
```

### Budget Status (expense transactions for month)
```
Collection: transactions
Where: type == "expense"
Where: date >= startOfMonth AND date <= endOfMonth
OrderBy: date DESC
```

---

*Arthafiloka — Android System Design Document v1.0*
*Generated: Mei 2025*
*Based on: Web app codebase (Next.js 14 + Firebase)*
