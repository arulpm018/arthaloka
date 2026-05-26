---
inclusion: auto
---

# Coding Standards — Arthafiloka

## File & Naming Conventions
- Components: PascalCase (e.g., `AccountCard.tsx`)
- Hooks: camelCase with "use" prefix (e.g., `useAccounts.ts`)
- Utils/lib: camelCase (e.g., `formatCurrency.ts`)
- Types: PascalCase interfaces, no "I" prefix (e.g., `Account`, bukan `IAccount`)
- Pages: lowercase folder + `page.tsx` (Next.js App Router convention)
- Zod schemas: camelCase with "Schema" suffix (e.g., `transactionSchema`)

## Component Patterns
- Gunakan function components + arrow functions: `const Component = () => {}`
- Props interface di atas component: `interface ComponentProps {}`
- Export default untuk page components, named export untuk reusable components
- Colocate types dengan component jika hanya dipakai di situ
- Shared types di `src/types/`

## Styling Rules
- Tailwind utility classes only (no custom CSS kecuali globals.css)
- Gunakan `cn()` helper untuk conditional classes
- Mobile-first: tulis base styles dulu, lalu `md:` dan `lg:` untuk larger screens
- Spacing: gunakan Tailwind scale (p-2, p-4, gap-3, etc.)
- Colors: pakai shadcn standard tokens — `bg-card`, `bg-muted`, `text-muted-foreground`, `border-border`, `bg-primary`, `hover:bg-accent`. JANGAN pakai ghost tokens `bg-secondary` / `text-secondary` / `bg-tertiary` / `text-muted` / `bg-hover` / `border-default` (tidak ter-wire di Tailwind config).
- Semantic colors: `text-income`, `text-expense`, `text-transfer`, `bg-income/10`, dst (sudah di-extend di `tailwind.config.ts`).
- Jangan hardcode hex colors di components — kecuali untuk owner color (import `OWNER_COLORS` dari `@/lib/constants/labels`) atau user-pickable colors yang stored di Firestore (`account.color`, `category.color`) via inline `style`.
- Detail pattern lihat `.kiro/steering/component-patterns.md`.

## State & Data Rules
- Firestore operations HARUS melalui service functions di `src/lib/firestore/`
- Jangan panggil Firestore langsung dari components
- Semua balance mutations HARUS pakai batch writes (atomic)
- Hooks return `{ data, isLoading, error }` pattern
- Zustand hanya untuk UI state & auth, bukan data cache

## Form Patterns
- Semua forms pakai React Hook Form + Zod
- Schema di `src/lib/validations/`
- Amount selalu integer (IDR tanpa decimal)
- Default values: account dari preferences, owner dari current user, date dari hari ini

## Error Handling
- Try-catch di semua Firestore operations
- Toast notification untuk user feedback
- Console.error untuk debugging
- Jangan silent fail — selalu inform user

## Import Order
1. React/Next.js imports
2. Third-party libraries
3. Internal components (`@/components/`)
4. Hooks (`@/hooks/`)
5. Lib/utils (`@/lib/`)
6. Types (`@/types/`)
7. Styles (if any)

## Language
- Code: English (variable names, comments, commit messages)
- UI text: Bahasa Indonesia (labels, placeholders, toasts)
- Comments: English
