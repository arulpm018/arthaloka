# Design — Arthafiloka

#[[file:plan.md]]

## Overview

Arthafiloka adalah personal finance tracker web app untuk pasangan (Arul & Fifi). App ini berjalan sepenuhnya di client-side menggunakan Next.js 14 App Router dengan Firebase sebagai backend (Auth + Firestore). Tidak ada API routes atau server-side logic — semua komunikasi langsung dari browser ke Firebase SDK.

### Goals
- Catat pengeluaran dalam < 5 tap (mobile)
- Realtime sync antara 2 device
- 100% free tier (Firebase Spark + Vercel Hobby)
- Offline-capable dengan Firestore persistence
- UI minimalis ala Notion

### Non-Goals (Phase 1)
- Multi-currency support
- More than 2 users
- Server-side rendering untuk SEO
- Push notifications
- Recurring transactions automation

## Architecture

### High-Level Architecture
```
Browser (Next.js CSR) → Firebase SDK → Cloud Firestore + Firebase Auth
```

### Architecture Pattern
- **Client-side SPA** dengan Next.js App Router (route groups untuk auth vs app)
- **Firebase SDK v9+** (modular, tree-shakeable) langsung dari client
- **Realtime listeners** (onSnapshot) untuk live data sync antar device
- **Atomic batch writes** untuk menjaga konsistensi balance
- **Offline-first** dengan Firestore enablePersistence()

### Layer Diagram
```
┌─────────────────────────────────────────────────┐
│  UI Layer (React Components + shadcn/ui)        │
├─────────────────────────────────────────────────┤
│  State Layer (Zustand store — UI state only)    │
├─────────────────────────────────────────────────┤
│  Hook Layer (useAccounts, useTransactions, etc) │
│  - Firestore onSnapshot listeners              │
│  - Data transformation & caching               │
├─────────────────────────────────────────────────┤
│  Service Layer (lib/firestore/*.ts)             │
│  - CRUD operations                             │
│  - Batch writes for balance atomicity          │
│  - Zod validation before write                 │
├─────────────────────────────────────────────────┤
│  Firebase SDK (Auth + Firestore + Offline)      │
└─────────────────────────────────────────────────┘
```

### Data Flow
```
User Action → React Hook Form (Zod validate)
           → Service function (lib/firestore/*.ts)
           → Firestore batch write (atomic)
           → onSnapshot listener fires
           → Hook state updates
           → Component re-renders
```

### Authentication Flow
```
App Load → onAuthStateChanged
  ├── No user → redirect /login
  └── Has user → fetch user doc from Firestore
      ├── No user doc → redirect /onboarding (create profile)
      ├── No partnerUid → show "connect partner" step
      └── Complete → load app data, render dashboard
```

### Routing Structure
- `(auth)/` — public routes (login, onboarding), no navigation chrome
- `(app)/` — protected routes, wrapped in AppShell (bottom nav + sidebar)
- Middleware checks auth cookie, redirects to /login if missing

## Components and Interfaces

### Component Hierarchy
```
RootLayout (app/layout.tsx)
├── Providers (Auth, Theme, Zustand)
│
├── (auth) routes — no chrome
│   ├── LoginPage
│   └── OnboardingPage
│
└── (app) routes — with AppShell
    └── AppShell
        ├── Header (page title + MonthPicker)
        ├── Sidebar (desktop only, md+)
        ├── Main Content (page-specific)
        │   ├── DashboardPage
        │   │   ├── SummaryCards (4 metric cards)
        │   │   ├── SpendingDonut (Recharts)
        │   │   ├── BudgetAlerts
        │   │   └── RecentTransactions
        │   ├── ArulPage / FifiPage (personal finance)
        │   ├── BerduaPage (shared finance, tabbed)
        │   ├── TransactionsPage (full list + filters)
        │   ├── AccountsPage (manage accounts)
        │   ├── CategoriesPage (manage + budget bars)
        │   └── SettingsPage
        ├── FAB (floating action button)
        ├── ActionSheet (pick: expense/income/transfer)
        ├── ExpenseSheet (bottom sheet form)
        ├── IncomeSheet (bottom sheet form)
        ├── TransferSheet (bottom sheet form)
        └── BottomNav (mobile only, < md)
```

### Key Component Interfaces

```typescript
// Layout Components
interface AppShellProps { children: React.ReactNode }
interface HeaderProps { title: string; showMonthPicker?: boolean }
interface BottomNavProps { activeTab: string }

// Dashboard Components
interface SummaryCardsProps { 
  totalBalance: number;
  income: number;
  expense: number;
  net: number;
}
interface SpendingDonutProps { 
  data: { categoryName: string; amount: number; color: string }[] 
}
interface BudgetAlertsProps { 
  budgets: BudgetStatus[] 
}
interface RecentTransactionsProps { 
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

// Transaction Components
interface TransactionItemProps {
  transaction: Transaction;
  onTap: () => void;
  onSwipeDelete: () => void;
}
interface ExpenseSheetProps {
  editingTransaction?: Transaction | null;
}
interface TransactionFiltersProps {
  filters: TxFilters;
  onChange: (filters: TxFilters) => void;
}

// Account Components
interface AccountCardProps {
  account: Account;
  onTap: () => void;
}
interface AccountFormProps {
  editingAccount?: Account | null;
  onClose: () => void;
}

// Category Components
interface CategoryGridProps {
  selected: string | null;
  onSelect: (categoryId: string) => void;
  quickOnly?: boolean;  // show only 6 favorites
}
interface BudgetProgressBarProps {
  categoryName: string;
  spent: number;
  budget: number;
  icon: string;
}

// Shared Components
interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  autoFocus?: boolean;
}
interface MonthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}
interface OwnerBadgeProps {
  owner: "arul" | "fifi" | "shared";
}
```

### Custom Hooks Interface

```typescript
// Auth
useAuth(): {
  user: User | null;
  partner: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  linkPartner: (inviteCode: string) => Promise<void>;
}

// Data Hooks (all use Firestore realtime listeners)
useAccounts(owner?: "arul" | "fifi" | "shared"): {
  accounts: Account[];
  isLoading: boolean;
  create: (input: CreateAccountInput) => Promise<string>;
  update: (id: string, data: Partial<Account>) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
}

useTransactions(filters: TxFilters): {
  transactions: Transaction[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  create: (input: CreateTransactionInput) => Promise<string>;
  update: (id: string, oldTx: Transaction, input: UpdateTxInput) => Promise<void>;
  remove: (tx: Transaction) => Promise<void>;
}

useCategories(): {
  categories: Category[];
  isLoading: boolean;
  create: (input: CreateCategoryInput) => Promise<string>;
  update: (id: string, data: Partial<Category>) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
}

useTransfers(filters?: TransferFilters): {
  transfers: Transfer[];
  isLoading: boolean;
  create: (input: CreateTransferInput) => Promise<string>;
  remove: (transfer: Transfer) => Promise<void>;
}

useSummary(month: Date, owner?: string): {
  totalBalance: number;
  income: number;
  expense: number;
  net: number;
  isLoading: boolean;
}

useBudgetStatus(month: Date): {
  budgets: BudgetStatus[];
  isLoading: boolean;
}
```

### Service Layer Interface

```typescript
// lib/firestore/transactions.ts
transactionsService: {
  create(input: CreateTransactionInput): Promise<string>;
  // → batch write: create tx doc + update account balance
  
  update(id: string, oldTx: Transaction, newInput: UpdateTxInput): Promise<void>;
  // → batch write: reverse old balance, apply new balance, update tx doc
  
  delete(tx: Transaction): Promise<void>;
  // → batch write: reverse balance, delete tx doc
}

// lib/firestore/transfers.ts
transfersService: {
  create(input: CreateTransferInput): Promise<string>;
  // → batch write: create transfer + debit from + credit to
  
  delete(transfer: Transfer): Promise<void>;
  // → batch write: reverse both accounts, delete transfer doc
}

// lib/firestore/accounts.ts
accountsService: {
  create(input: CreateAccountInput): Promise<string>;
  update(id: string, data: Partial<Account>): Promise<void>;
  deactivate(id: string): Promise<void>;  // soft delete
}

// lib/firestore/categories.ts
categoriesService: {
  create(input: CreateCategoryInput): Promise<string>;
  update(id: string, data: Partial<Category>): Promise<void>;
  deactivate(id: string): Promise<void>;
}
```

## Data Models

### User
```typescript
interface User {
  uid: string;                          // Firebase Auth UID (document ID)
  displayName: string;                  // "Arul" | "Fifi"
  email: string;
  photoURL?: string;
  partnerUid?: string;                  // UID pasangan (for shared access)
  role: "arul" | "fifi";               // UI labeling
  currency: "IDR";
  preferences: {
    theme: "light" | "dark" | "system";
    defaultAccountId?: string;          // pre-selected in expense form
    quickCategories: string[];          // 6 category IDs for quick picker
  };
  inviteCode?: string;                  // 6-digit code for partner linking
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Account
```typescript
interface Account {
  accountId: string;                    // auto-generated (document ID)
  name: string;                         // "Bank Mandiri", "Cash Wallet"
  type: "bank" | "cash" | "e-wallet" | "savings" | "investment";
  category: "personal" | "shared";
  owner: "arul" | "fifi" | "shared";
  ownerUid: string;                     // Firebase UID of owner
  balance: number;                      // IDR integer (no decimals)
  currency: "IDR";
  color: string;                        // hex color for UI
  icon: string;                         // Lucide icon name
  isActive: boolean;                    // false = soft deleted
  order: number;                        // display order in list
  createdAt: Timestamp;
  updatedAt: Timestamp;
  note?: string;
}
```

### Transaction
```typescript
interface Transaction {
  transactionId: string;                // auto-generated (document ID)
  type: "expense" | "income";
  name: string;                         // description
  amount: number;                       // IDR integer, always positive
  accountId: string;                    // reference to account
  accountName: string;                  // denormalized for display
  categoryId: string;                   // reference to category
  categoryName: string;                 // denormalized
  categoryIcon: string;                 // denormalized (emoji)
  owner: "arul" | "fifi" | "shared";
  ownerUid: string;
  date: Timestamp;                      // user-selected transaction date
  note?: string;
  tags?: string[];                      // for future search
  isRecurring?: boolean;                // future feature flag
  recurringId?: string;                 // future: link to template
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Transfer
```typescript
interface Transfer {
  transferId: string;                   // auto-generated (document ID)
  name: string;                         // "Top up pacaran"
  amount: number;                       // IDR integer
  fromAccountId: string;
  fromAccountName: string;              // denormalized
  toAccountId: string;
  toAccountName: string;                // denormalized
  owner: "arul" | "fifi" | "shared";
  ownerUid: string;
  date: Timestamp;
  note?: string;
  createdAt: Timestamp;
}
```

### Category
```typescript
interface Category {
  categoryId: string;                   // auto-generated (document ID)
  name: string;                         // "Food & Drink"
  icon: string;                         // emoji
  color: string;                        // hex color
  type: "expense" | "income" | "both";
  budgetAmount: number;                 // monthly budget (0 = no limit)
  budgetScope: "arul" | "fifi" | "shared" | "each";
  isActive: boolean;
  order: number;                        // display order in picker
  createdBy: string;                    // UID
  createdAt: Timestamp;
}
```

### Derived Types
```typescript
interface BudgetStatus {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  budgetAmount: number;
  spent: number;
  percentage: number;                   // spent / budget * 100
  status: "normal" | "warning" | "over"; // <75%, 75-99%, 100%+
}

interface TxFilters {
  startDate: Timestamp;
  endDate: Timestamp;
  owner?: "arul" | "fifi" | "shared";
  categoryId?: string;
  accountId?: string;
  type?: "expense" | "income";
  search?: string;
}

interface TransferFilters {
  startDate: Timestamp;
  endDate: Timestamp;
  owner?: "arul" | "fifi" | "shared";
}

type CreateTransactionInput = Omit<Transaction, 'transactionId' | 'createdAt' | 'updatedAt'>;
type UpdateTxInput = Partial<Omit<Transaction, 'transactionId' | 'createdAt' | 'ownerUid'>>;
type CreateAccountInput = Omit<Account, 'accountId' | 'createdAt' | 'updatedAt'>;
type CreateTransferInput = Omit<Transfer, 'transferId' | 'createdAt'>;
type CreateCategoryInput = Omit<Category, 'categoryId' | 'createdAt'>;
```

### Firestore Indexes (Composite)
```
transactions: [owner ASC, date DESC]
transactions: [accountId ASC, date DESC]
transactions: [categoryId ASC, date DESC]
transactions: [type ASC, owner ASC, date DESC]
transactions: [type ASC, categoryId ASC, date DESC]
transfers: [owner ASC, date DESC]
```

### Denormalization Strategy
Fields `accountName`, `categoryName`, `categoryIcon` disimpan langsung di transaction/transfer documents untuk menghindari extra Firestore reads saat render list. Tradeoff: saat rename account/category, perlu batch update semua related documents (jarang terjadi, acceptable).

## Correctness Properties

### Property 1: Balance Consistency
**Validates: Requirements 3, 4**
- Setiap transaction create/update/delete HARUS menggunakan Firestore batch write
- Balance account HARUS selalu reflect sum of all transactions + transfers
- Jika batch write gagal, tidak ada perubahan yang ter-apply (atomic)

### Property 2: Data Integrity
**Validates: Requirements 2, 3, 4, 5**
- `amount` selalu > 0 (positive integer)
- `type` hanya "expense" | "income" (validated di Zod + Firestore rules)
- `owner` hanya "arul" | "fifi" | "shared"
- Transfer: `fromAccountId` !== `toAccountId`
- Soft delete: `isActive = false`, document tidak pernah di-hard-delete
- `date` tidak boleh di masa depan (max: today)

### Property 3: Auth Invariants
**Validates: Requirements 1**
- Semua Firestore reads/writes require `request.auth != null`
- User hanya bisa akses data milik sendiri atau partner (via `partnerUid`)
- Partner linking bersifat bidirectional (A.partnerUid = B, B.partnerUid = A)

### Property 4: Realtime Sync
**Validates: Requirements 6, 7, 8**
- onSnapshot listeners aktif selama component mounted
- Unsubscribe HARUS dipanggil di useEffect cleanup
- Offline writes queued dan auto-sync saat reconnect

## Error Handling

### Error Categories & Responses
| Category | Example | UI Response |
|----------|---------|-------------|
| Network | Offline, timeout | Show offline badge, queue writes |
| Auth | Session expired, unauthorized | Redirect to /login |
| Validation | Invalid amount, missing field | Inline form errors (Zod) |
| Firestore | Write failed, quota exceeded | Toast error + retry button |
| Permission | Access denied by rules | Toast "Akses ditolak" |

### Error Flow
```
Service function throws → Hook catches → Sets error state → Component shows toast
                                       → Form keeps data (no reset on error)
                                       → User can retry
```

### Offline Handling
1. Firestore `enablePersistence()` on app init
2. Writes queue in IndexedDB when offline
3. UI shows "Offline" badge (via `navigator.onLine` + Firestore pending writes)
4. Auto-sync when connection restored
5. No user action needed for sync

### Retry Strategy
- Form submission: manual retry (button in toast)
- Realtime listeners: auto-reconnect (Firebase SDK handles)
- Auth: redirect to login, preserve return URL

## Testing Strategy

### Unit Tests (Vitest)
- `formatCurrency()` — various amounts, edge cases (0, negative, very large)
- `formatDate()` — today, yesterday, this week, older dates
- Zod schemas — valid/invalid inputs for all models
- Zustand store — actions, state transitions

### Component Tests (React Testing Library)
- Form components: validation errors, submit behavior, default values
- List components: empty state, loading state, data rendering
- Interactive: FAB click → sheet opens, swipe → delete confirmation

### Integration Tests
- Auth flow: login → redirect → dashboard
- Transaction flow: add expense → balance updates → list shows new item
- Transfer flow: transfer → both accounts update

### Manual Testing Checklist
- [ ] iPhone Safari: bottom nav safe area, keyboard avoidance
- [ ] Android Chrome: numpad input, back button behavior
- [ ] Desktop Chrome: sidebar layout, hover states
- [ ] Offline: add expense offline → reconnect → verify sync
- [ ] Concurrent: both users add expense simultaneously

---

*Referensi lengkap: lihat plan.md untuk detail UI wireframes, color tokens, component specs, dan folder structure.*
