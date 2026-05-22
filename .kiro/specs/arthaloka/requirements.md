# Requirements — Arthafiloka Personal Finance Tracker

## Requirement 1: Authentication & Partner System
**User Story:** Sebagai user, saya ingin login dengan email/Google dan terhubung dengan pasangan saya agar kami bisa berbagi data keuangan secara realtime.

### Acceptance Criteria:
- User bisa register dengan email/password
- User bisa login dengan Google Sign-In
- User bisa generate invite code untuk connect dengan partner
- Partner bisa input invite code untuk terhubung
- Setelah terhubung, kedua user bisa melihat semua data bersama
- Session persistent (tidak perlu login ulang setelah refresh)
- Protected routes redirect ke /login jika belum auth
- Onboarding flow untuk first-time user (set nama, connect partner)

## Requirement 2: Account Management
**User Story:** Sebagai user, saya ingin mengelola akun keuangan (bank, cash, e-wallet, savings, investment) agar bisa tracking saldo masing-masing.

### Acceptance Criteria:
- User bisa create account baru (nama, type, owner, saldo awal, warna, icon)
- User bisa edit account (nama, warna, icon, note)
- User bisa deactivate account (soft delete)
- Account list grouped by owner (Arul, Fifi, Berdua)
- Saldo account otomatis update saat ada transaksi/transfer
- Account bisa di-reorder (drag or manual order)
- Validasi: nama required, saldo >= 0 untuk initial

## Requirement 3: Transaction Management (Expense & Income)
**User Story:** Sebagai user, saya ingin mencatat pengeluaran dan pemasukan dengan cepat (< 5 tap di mobile) agar tracking keuangan tidak merepotkan.

### Acceptance Criteria:
- Add expense via bottom sheet: nama, jumlah, kategori, akun, owner, tanggal, note
- Add income via bottom sheet: nama, jumlah, akun, owner, tanggal, note
- Smart defaults: akun default, owner = current user, tanggal = hari ini
- Category quick picker: 6 kategori favorit + "see all"
- Amount input: numpad otomatis, format IDR realtime
- Edit transaction: tap item → edit sheet pre-filled
- Delete transaction: swipe left → confirm → delete
- Balance akun otomatis update (atomic batch write)
- Transaction list grouped by date
- Infinite scroll / load more (20 per page)

## Requirement 4: Transfer Between Accounts
**User Story:** Sebagai user, saya ingin mencatat transfer antar akun agar perpindahan uang tercatat tanpa mempengaruhi income/expense.

### Acceptance Criteria:
- Add transfer: nama, jumlah, from account, to account, tanggal, note
- Balance from account berkurang, to account bertambah (atomic)
- Transfer tidak masuk hitungan income/expense
- Transfer list bisa dilihat di halaman transactions (filter type)
- Edit dan delete transfer dengan balance reversal

## Requirement 5: Category & Budget Management
**User Story:** Sebagai user, saya ingin mengatur kategori pengeluaran dengan budget bulanan agar bisa kontrol spending per kategori.

### Acceptance Criteria:
- Default categories tersedia saat pertama kali (16 kategori)
- User bisa add custom category (nama, icon/emoji, warna, budget, scope)
- User bisa edit category (nama, icon, warna, budget)
- User bisa delete/deactivate category
- Budget progress bar: spent vs budget per bulan
- Budget alert: kuning (>75%), merah (>100%)
- Budget scope: per person atau shared
- Category grid picker di form expense (visual, icon-based)

## Requirement 6: Dashboard & Summary
**User Story:** Sebagai user, saya ingin melihat overview keuangan (total, income, expense, net) di satu halaman agar cepat paham kondisi keuangan.

### Acceptance Criteria:
- Summary cards: Total Kekayaan, Income Bulan Ini, Expense Bulan Ini, Net
- Month picker: bisa lihat bulan-bulan sebelumnya
- Spending donut chart by category
- Budget alerts (kategori yang mendekati/melewati limit)
- Recent transactions (10 terakhir)
- FAB (Floating Action Button) untuk quick add
- Data realtime (update saat partner add transaction)

## Requirement 7: Personal Finance Pages (Arul & Fifi)
**User Story:** Sebagai user, saya ingin melihat keuangan pribadi saya terpisah dari pasangan agar bisa fokus tracking personal spending.

### Acceptance Criteria:
- Page Arul: total balance, income, expense, list akun, recent transactions (filtered owner=arul)
- Page Fifi: sama, filtered owner=fifi
- Quick add expense button (pre-filled owner)
- Account cards dengan saldo masing-masing

## Requirement 8: Shared Finance Page (Berdua)
**User Story:** Sebagai pasangan, kami ingin melihat keuangan bersama (pacaran, tabungan, investasi) di satu tempat.

### Acceptance Criteria:
- Tab Pacaran: akun pacaran, transaksi bersama, balance
- Tab Tabungan: saving accounts bersama, progress ke target
- Tab Investasi: investasi tanah + saham, total value
- Filter transactions: owner = shared
- Quick add untuk akun bersama

## Requirement 9: Mobile-First UI & UX
**User Story:** Sebagai user yang mostly pakai HP, saya ingin UI yang sangat mobile-friendly dengan bottom navigation dan bottom sheets.

### Acceptance Criteria:
- Bottom navigation: 5 tabs (Home, Arul, Berdua, Fifi, Settings)
- Bottom sheet forms (bukan page baru)
- FAB always visible di kanan bawah
- Touch targets minimum 44x44px
- Numpad otomatis untuk input amount
- Responsive: mobile → tablet → desktop
- Notion-inspired design: clean, typographic, minimal

## Requirement 10: Settings & Preferences
**User Story:** Sebagai user, saya ingin mengatur preferensi app (theme, default account, dll).

### Acceptance Criteria:
- Profile display (nama, email, photo)
- Partner connection status
- Default account selection
- Theme toggle (light/dark/system)
- Logout functionality
- App version info
