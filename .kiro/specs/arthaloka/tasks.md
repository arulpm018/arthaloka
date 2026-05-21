# Implementation Plan

## Overview
Arthaloka personal finance tracker — a Next.js 14 client-side app with Firebase backend for couple (Arul & Fifi) to track personal and shared finances.

## Tasks

- [x] 1. Project Setup
  - [x] 1.1. Initialize Next.js 14 project with TypeScript and App Router
  - [x] 1.2. Install and configure Tailwind CSS with custom theme
  - [x] 1.3. Install shadcn/ui (init + core components: button, card, input, sheet, select, badge, tabs, dialog, progress, skeleton, dropdown-menu)
  - [x] 1.4. Install dependencies: zustand, react-hook-form, zod, date-fns, recharts, framer-motion, lucide-react, firebase, next-themes
  - [x] 1.5. Configure Geist font (next/font)
  - [x] 1.6. Setup tailwind.config.ts with Arthaloka design tokens (colors, spacing, typography)
  - [x] 1.7. Create globals.css with CSS variables (light + dark mode)
  - [x] 1.8. Create .env.example with Firebase config template
  - [x] 1.9. Setup .gitignore (node_modules, .env.local, .next)
  - [x] 1.10. Create TypeScript interfaces: User, Account, Transaction, Transfer, Category (src/types/)

- [x] 2. Firebase Setup
  - [x] 2.1. Create firebase.ts (src/lib/firebase.ts) — initialize app, auth, firestore
  - [x] 2.2. Enable Firestore offline persistence
  - [x] 2.3. Create firestore.rules file with security rules
  - [x] 2.4. Create firestore.indexes.json with composite indexes
  - [x] 2.5. Create .env.local with placeholder Firebase project credentials

- [x] 3. Design System & Layout
  - [x] 3.1. Create AppShell component (layout wrapper with responsive behavior)
  - [x] 3.2. Create BottomNav component (5 tabs: Home, Arul, Berdua, Fifi, Settings)
  - [x] 3.3. Create Sidebar component (desktop navigation)
  - [x] 3.4. Create Header component (page title + month picker slot)
  - [x] 3.5. Create FAB component (floating action button, fixed position)
  - [x] 3.6. Create ActionSheet component (pick: expense/income/transfer)
  - [x] 3.7. Setup (app)/layout.tsx with AppShell, providers
  - [x] 3.8. Setup (auth)/layout.tsx (minimal, no nav)
  - [x] 3.9. Create shared/LoadingState.tsx (skeleton variants)
  - [x] 3.10. Create shared/EmptyState.tsx (illustration + message)

- [x] 4. Authentication Implementation
  - [x] 4.1. Create useAuth hook (onAuthStateChanged listener, login, logout, register)
  - [x] 4.2. Create login/page.tsx — email/password form + Google sign-in button
  - [x] 4.3. Implement Firebase email/password registration
  - [x] 4.4. Implement Firebase Google Sign-In
  - [x] 4.5. Create auth middleware (redirect unauthenticated users to /login)
  - [x] 4.6. Create onboarding/page.tsx — set display name, role (arul/fifi)
  - [x] 4.7. Implement partner linking: generate 6-digit invite code
  - [x] 4.8. Implement partner linking: input invite code → update partnerUid on both users
  - [x] 4.9. Create Zustand store (useAppStore) with auth state
  - [x] 4.10. Create AuthProvider component (wraps app, manages auth state)

- [x] 5. Account CRUD
  - [x] 5.1. Create lib/firestore/accounts.ts (service functions: getAll, create, update, deactivate)
  - [x] 5.2. Create lib/validations/account.schema.ts (Zod schema)
  - [x] 5.3. Create useAccounts hook (realtime listener, CRUD methods)
  - [x] 5.4. Create AccountCard component (icon, name, balance, owner badge)
  - [x] 5.5. Create AccountList component (grouped by owner: Arul, Fifi, Berdua)
  - [x] 5.6. Create AccountForm component (bottom sheet: add/edit account)
  - [x] 5.7. Create accounts/page.tsx — list all accounts + add button
  - [x] 5.8. Implement account reordering (order field)
  - [x] 5.9. Seed initial accounts data (11 accounts from plan)

- [x] 6. Category CRUD
  - [x] 6.1. Create lib/firestore/categories.ts (service functions)
  - [x] 6.2. Create lib/validations/category.schema.ts (Zod schema)
  - [x] 6.3. Create useCategories hook (realtime listener, CRUD methods)
  - [x] 6.4. Create CategoryGrid component (6-item quick picker for expense form)
  - [x] 6.5. Create CategoryFullGrid component (all categories in sheet)
  - [x] 6.6. Create CategoryList component (manage view with budget info)
  - [x] 6.7. Create BudgetProgressBar component (spent vs budget, color-coded)
  - [x] 6.8. Create CategoryForm component (bottom sheet: add/edit category)
  - [x] 6.9. Create categories/page.tsx — list + budget progress + add button
  - [x] 6.10. Seed default categories (17 categories from plan)

- [x] 7. Utility Functions
  - [x] 7.1. Create lib/utils/formatCurrency.ts — format number to "Rp 1.234.567"
  - [x] 7.2. Create lib/utils/formatDate.ts — relative dates (Today, Yesterday, etc.)
  - [x] 7.3. Create lib/utils/cn.ts — className merger (clsx + tailwind-merge)
  - [x] 7.4. Create shared/AmountInput.tsx — IDR formatted input with numpad
  - [x] 7.5. Create shared/OwnerBadge.tsx — colored badge (Arul blue, Fifi pink, Berdua purple)
  - [x] 7.6. Create shared/MonthPicker.tsx — month/year selector dropdown
  - [x] 7.7. Create shared/ConfirmDialog.tsx — delete confirmation dialog

- [x] 8. Add Expense
  - [x] 8.1. Create lib/firestore/transactions.ts (service: create with batch write)
  - [x] 8.2. Create lib/validations/transaction.schema.ts (Zod schema)
  - [x] 8.3. Create ExpenseSheet component (bottom sheet form)
  - [x] 8.4. Implement amount input with IDR formatting + numpad
  - [x] 8.5. Implement category quick picker (6 favorites) + "see all" expansion
  - [x] 8.6. Implement account dropdown (filtered by owner)
  - [x] 8.7. Implement owner selector (Arul/Fifi/Berdua)
  - [x] 8.8. Implement date picker (default: today)
  - [x] 8.9. Implement smart defaults (default account from preferences, owner from current user)
  - [x] 8.10. Implement Firestore batch write: create transaction + update account balance
  - [x] 8.11. Success toast + close sheet + refresh data

- [x] 9. Add Income
  - [x] 9.1. Create IncomeSheet component (bottom sheet form)
  - [x] 9.2. Implement income-specific category filter (type: "income" | "both")
  - [x] 9.3. Implement "To Account" selector
  - [x] 9.4. Implement Firestore batch write: create income + increase account balance
  - [x] 9.5. Success toast + close sheet

- [x] 10. Add Transfer
  - [x] 10.1. Create lib/firestore/transfers.ts (service: create with batch write)
  - [x] 10.2. Create lib/validations/transfer.schema.ts (Zod schema)
  - [x] 10.3. Create TransferSheet component (bottom sheet form)
  - [x] 10.4. Implement "From Account" and "To Account" selectors (prevent same account)
  - [x] 10.5. Implement Firestore batch write: create transfer + debit from + credit to
  - [x] 10.6. Success toast + close sheet

- [x] 11. Transaction List & Management
  - [x] 11.1. Create useTransactions hook (query by month, owner, category; pagination)
  - [x] 11.2. Create TransactionItem component (icon, name, category, amount, date)
  - [x] 11.3. Create TransactionList component (grouped by date, infinite scroll)
  - [x] 11.4. Implement swipe-to-delete on TransactionItem (with confirm dialog)
  - [x] 11.5. Implement tap-to-edit (open ExpenseSheet/IncomeSheet pre-filled)
  - [x] 11.6. Implement edit: Firestore batch (reverse old balance, apply new, update doc)
  - [x] 11.7. Implement delete: Firestore batch (reverse balance, delete doc)
  - [x] 11.8. Create TransactionFilters component (owner, category, type, search)
  - [x] 11.9. Create transactions/page.tsx — full list with filters

- [x] 12. Dashboard
  - [x] 12.1. Create useSummary hook (compute: total balance, income, expense, net for month)
  - [x] 12.2. Create useBudgetStatus hook (compute: spent vs budget per category)
  - [x] 12.3. Create SummaryCards component (4 cards, horizontal scroll on mobile)
  - [x] 12.4. Create SpendingDonut component (Recharts donut chart by category)
  - [x] 12.5. Create BudgetAlerts component (list categories > 75% budget)
  - [x] 12.6. Create RecentTransactions component (last 10, tap to edit)
  - [x] 12.7. Create dashboard/page.tsx — assemble all dashboard sections
  - [x] 12.8. Connect FAB → ActionSheet → ExpenseSheet/IncomeSheet/TransferSheet
  - [x] 12.9. Implement month picker in header (changes data for all dashboard sections)

- [x] 13. Personal Pages (Arul & Fifi)
  - [x] 13.1. Create arul/page.tsx — personal finance overview
  - [x] 13.2. Create fifi/page.tsx — personal finance overview
  - [x] 13.3. Implement: total balance (sum of personal accounts)
  - [x] 13.4. Implement: income/expense this month (filtered by owner)
  - [x] 13.5. Implement: account cards list (personal accounts only)
  - [x] 13.6. Implement: recent transactions (filtered by owner)
  - [x] 13.7. Quick add button (pre-filled owner)

- [x] 14. Berdua Page
  - [x] 14.1. Create berdua/page.tsx with tabs (Pacaran, Tabungan, Investasi)
  - [x] 14.2. Tab Pacaran: show shared dating account + transactions
  - [x] 14.3. Tab Tabungan: show savings accounts + total + progress bar
  - [x] 14.4. Tab Investasi: show investment accounts + total value
  - [x] 14.5. Filter all data by owner = "shared"
  - [x] 14.6. Quick add for shared expenses

- [x] 15. UX Polish
  - [x] 15.1. Implement loading skeletons for all pages
  - [x] 15.2. Implement empty states (no transactions, no accounts, etc.)
  - [x] 15.3. Implement toast notifications (success, error, warning, info)
  - [x] 15.4. Implement offline indicator badge
  - [x] 15.5. Implement pull-to-refresh gesture (mobile)
  - [x] 15.6. Add page transitions (Framer Motion, subtle fade)
  - [x] 15.7. Ensure all touch targets are 44px+ minimum
  - [x] 15.8. Test and fix bottom sheet behavior (drag, snap points, keyboard avoidance)

- [x] 16. Settings & Preferences
  - [x] 16.1. Create settings/page.tsx
  - [x] 16.2. Implement profile section (display name, email, photo)
  - [x] 16.3. Implement partner status display
  - [x] 16.4. Implement default account selector (saved to user preferences)
  - [x] 16.5. Implement theme toggle (light/dark/system) with next-themes
  - [x] 16.6. Implement logout with confirmation
  - [x] 16.7. Implement quick categories reorder (6 favorites for picker)

- [x] 17. Responsive & Cross-Browser
  - [x] 17.1. Test and fix mobile Safari (iPhone) — safe areas, bottom nav
  - [x] 17.2. Test and fix mobile Chrome (Android) — keyboard, viewport
  - [x] 17.3. Implement desktop sidebar (md+ breakpoint)
  - [x] 17.4. Hide bottom nav on desktop, show sidebar
  - [x] 17.5. Multi-column layout on desktop (dashboard)
  - [x] 17.6. Test tablet layout (768-1024px)

- [x] 18. Deploy & Production
  - [x] 18.1. Setup Vercel project (connect GitHub repo)
  - [x] 18.2. Configure environment variables on Vercel
  - [x] 18.3. Deploy Firebase security rules (firebase deploy --only firestore:rules)
  - [x] 18.4. Deploy Firestore indexes (firebase deploy --only firestore:indexes)
  - [x] 18.5. Test production build locally (next build && next start)
  - [x] 18.6. Deploy to Vercel (push to main)
  - [x] 18.7. Verify production: auth flow, CRUD operations, realtime sync
  - [x] 18.8. Setup Vercel Analytics (optional, free tier)

## Task Dependency Graph
```
1 -> 2
1 -> 7
2 -> 3
2 -> 4
3 -> 5
3 -> 6
4 -> 5
7 -> 5
7 -> 6
5 -> 8
6 -> 8
5 -> 9
6 -> 9
5 -> 10
8 -> 11
9 -> 11
10 -> 11
8 -> 12
9 -> 12
11 -> 12
5 -> 13
11 -> 13
5 -> 14
11 -> 14
12 -> 15
13 -> 15
14 -> 15
12 -> 16
15 -> 17
17 -> 18
```

## Notes
- All Firebase credentials should use placeholder values in .env.example; actual credentials go in .env.local (gitignored)
- The app is client-side only — no API routes or server-side logic
- Firestore batch writes are critical for balance consistency
- Design follows Notion-inspired minimalism with Geist font
- Mobile-first approach: bottom sheets for forms, bottom nav for navigation
- Sprint 6 tasks (Dark Mode, PWA, Advanced Features) are excluded as they are future enhancements
