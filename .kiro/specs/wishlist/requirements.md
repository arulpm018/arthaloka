# Requirements Document

## Introduction

Fitur Wishlist untuk Arthafiloka — memungkinkan Arul & Fifi mencatat barang-barang yang ingin dibeli, baik untuk keperluan hantaran nikah maupun keinginan pribadi lainnya (motor, mobil, gadget, dll). Setiap item memiliki nama, harga, lokasi/link pembelian, dan status pembelian (checklist). Item dikelompokkan dalam kategori wishlist untuk memudahkan organisasi.

## Glossary

- **Wishlist_System**: Modul dalam Arthafiloka yang mengelola daftar barang yang ingin dibeli
- **Wishlist_Item**: Satu entri barang dalam wishlist, berisi nama, harga, lokasi/link, dan status pembelian
- **Wishlist_Category**: Pengelompokan wishlist item berdasarkan tujuan (contoh: "Hantaran Nikah", "Kendaraan", "Gadget", "Rumah Tangga")
- **Purchase_Status**: Status boolean yang menandakan apakah item sudah dibeli atau belum
- **Owner**: Pemilik wishlist item — "arul", "fifi", atau "shared"
- **Progress_Summary**: Ringkasan kemajuan pembelian per kategori wishlist (jumlah item terbeli / total, total harga terbeli / total harga)

## Requirements

### Requirement 1: Manage Wishlist Categories

**User Story:** As a user, I want to create and manage wishlist categories, so that I can organize my wishlist items by purpose (hantaran nikah, kendaraan, gadget, etc.)

#### Acceptance Criteria

1. THE Wishlist_System SHALL display a list of all active Wishlist_Category entries sorted by creation date in ascending order
2. WHEN a user submits a new category name and icon, THE Wishlist_System SHALL create a new Wishlist_Category with the provided name (between 1 and 50 characters, trimmed of leading/trailing whitespace), icon, and owner
3. IF a user submits a category name that already exists (case-insensitive) among their active Wishlist_Category entries, THEN THE Wishlist_System SHALL reject the submission and display an error message indicating the category name is already in use
4. WHEN a user edits an existing Wishlist_Category, THE Wishlist_System SHALL update the category name and icon with the same validation rules as creation
5. WHEN a user deletes a Wishlist_Category that contains no items, THE Wishlist_System SHALL soft-delete the category by setting isActive to false
6. IF a user attempts to delete a Wishlist_Category that contains items, THEN THE Wishlist_System SHALL display a confirmation dialog warning that items will become uncategorized, and SHALL only proceed with the soft-delete if the user confirms, or cancel the operation if the user dismisses the dialog

### Requirement 2: Add Wishlist Item

**User Story:** As a user, I want to add items to my wishlist with details like name, price, purchase location/link, and category, so that I can track what I want to buy.

#### Acceptance Criteria

1. WHEN a user submits a new wishlist item form with valid data, THE Wishlist_System SHALL create a Wishlist_Item with nama (name), harga (price), lokasi/link (purchase location or URL), Wishlist_Category assignment, owner, and Purchase_Status set to false
2. THE Wishlist_System SHALL validate that nama is not empty, does not exceed 100 characters, and that harga is a positive integer between 1 and 999,999,999,999
3. IF validation fails on the wishlist item form, THEN THE Wishlist_System SHALL display inline error messages on the invalid fields and prevent form submission
4. IF a user provides a value in the lokasi/link field that starts with "http://" or "https://", THEN THE Wishlist_System SHALL store and render the value as a clickable link
5. IF a user provides a value in the lokasi/link field that does not start with "http://" or "https://", THEN THE Wishlist_System SHALL store and render the value as a plain text string
6. THE Wishlist_System SHALL allow the lokasi/link field to be empty (optional) and accept a maximum of 500 characters when provided
7. WHEN a user adds an item without selecting a Wishlist_Category, THE Wishlist_System SHALL assign the item to a default "Lainnya" (Others) category
8. IF the Firestore write fails when creating a Wishlist_Item, THEN THE Wishlist_System SHALL display an error message indicating the save failed, retain the form data, and allow the user to retry

### Requirement 3: View Wishlist Items

**User Story:** As a user, I want to view my wishlist items grouped by category, so that I can see what I need to buy for each purpose at a glance.

#### Acceptance Criteria

1. THE Wishlist_System SHALL display Wishlist_Item entries grouped by their Wishlist_Category, where each category group shows the category name and icon as a section header
2. THE Wishlist_System SHALL display each Wishlist_Item with its nama, harga (formatted as IDR currency with "Rp" prefix and dot thousands separator), lokasi/link (rendered as a tappable hyperlink if the value is a valid URL, or as plain text otherwise), and Purchase_Status checkbox
3. WHEN a Wishlist_Category contains both purchased and unpurchased items, THE Wishlist_System SHALL display unpurchased items before purchased items within that category, with items in each group ordered by creation date descending (newest first)
4. THE Wishlist_System SHALL display a Progress_Summary for each Wishlist_Category showing the count of purchased items versus total item count, and the sum of harga of purchased items versus the sum of harga of all items in that category
5. THE Wishlist_System SHALL display an overall Progress_Summary across all categories at the top of the wishlist page, showing total purchased item count versus total item count, and total harga of purchased items versus total harga of all items
6. WHILE a filter is active, THE Wishlist_System SHALL display only items matching the selected owner filter ("arul", "fifi", or "shared") and recalculate all Progress_Summary values based on the filtered items only
7. IF no owner filter is active, THEN THE Wishlist_System SHALL display all Wishlist_Item entries regardless of owner
8. IF a Wishlist_Category contains zero items (or zero items matching the active filter), THEN THE Wishlist_System SHALL hide that category group from the display

### Requirement 4: Mark Item as Purchased

**User Story:** As a user, I want to check off items I have already bought, so that I can track my progress toward completing my wishlist.

#### Acceptance Criteria

1. WHEN a user taps the checkbox on a Wishlist_Item, THE Wishlist_System SHALL toggle the Purchase_Status between purchased and not purchased, and persist the updated status to Firestore
2. WHEN a Wishlist_Item is marked as purchased, THE Wishlist_System SHALL display the item with a strikethrough style on the item name and a reduced opacity (50%) appearance to visually distinguish it from unpurchased items
3. WHEN a Wishlist_Item is marked as purchased, THE Wishlist_System SHALL record the current date and time as the purchasedAt timestamp
4. WHEN a Wishlist_Item is toggled back to not purchased, THE Wishlist_System SHALL remove the strikethrough and reduced opacity styling, and clear the purchasedAt timestamp
5. WHEN a Wishlist_Item Purchase_Status changes, THE Wishlist_System SHALL update the Progress_Summary (displaying the count of purchased items out of total items) for the corresponding Wishlist_Category within 1 second
6. IF the Firestore write fails when toggling Purchase_Status, THEN THE Wishlist_System SHALL revert the checkbox and visual state to the previous value and display an error message indicating the status change could not be saved

### Requirement 5: Edit and Delete Wishlist Item

**User Story:** As a user, I want to edit or remove wishlist items, so that I can keep my list accurate and up to date.

#### Acceptance Criteria

1. WHEN a user taps on a Wishlist_Item, THE Wishlist_System SHALL open a bottom sheet edit form pre-filled with the item's current data (nama, harga, lokasi/link, category, owner)
2. WHEN a user submits the edit form with valid data, THE Wishlist_System SHALL update the Wishlist_Item with the new values, apply the same validation rules as item creation (nama is not empty, harga is a positive integer), and display a success toast notification
3. IF the edit form submission fails validation, THEN THE Wishlist_System SHALL display inline error messages on the invalid fields and retain the user's input without closing the form
4. WHEN a user taps a delete button on a Wishlist_Item, THE Wishlist_System SHALL display a confirmation dialog stating the item name before removing it
5. WHEN a user confirms deletion, THE Wishlist_System SHALL permanently remove the Wishlist_Item from Firestore and update the Progress_Summary for the corresponding Wishlist_Category within 1 second
6. IF a Firestore write operation fails during edit or delete, THEN THE Wishlist_System SHALL display an error toast notification indicating the operation failed and retain the item's previous state
7. WHEN a user dismisses the confirmation dialog without confirming, THE Wishlist_System SHALL cancel the delete operation and leave the Wishlist_Item unchanged

### Requirement 6: Wishlist Page Layout and Navigation

**User Story:** As a user, I want to access the wishlist from the app navigation, so that I can quickly view and manage my wishlist items.

#### Acceptance Criteria

1. THE Wishlist_System SHALL be accessible via a dedicated page at the route `/wishlist` within the `(app)` route group
2. THE Wishlist_System SHALL be accessible from the "More" page as a menu item entry displaying an icon, label "Wishlist", description text, and a chevron indicator, following the same list-item layout as other More page entries
3. THE Wishlist_System SHALL display a floating action button (FAB) positioned fixed at bottom-right (bottom 96px, right 16px, above the bottom navigation) that, WHEN tapped, opens the bottom sheet form in "add" mode
4. THE Wishlist_System SHALL use a bottom sheet form (side="bottom", max-height 85vh, with rounded top corners and vertical scroll) for adding and editing Wishlist_Item entries, opened in "add" mode from the FAB or in "edit" mode when tapping an existing item
5. THE Wishlist_System SHALL support mobile-first responsive layout with page content constrained to max-width 4xl centered, 16px padding, and the page header displaying the title "Wishlist"
6. IF no Wishlist_Item entries exist, THEN THE Wishlist_System SHALL display an empty state with an icon, a title indicating no items, a description prompting the user to add their first item, and a button that opens the add form
7. WHILE wishlist data is loading, THE Wishlist_System SHALL display a skeleton loading state

### Requirement 7: Wishlist Data Persistence

**User Story:** As a user, I want my wishlist data to be stored in Firestore and synced in realtime, so that both Arul and Fifi can see the same wishlist.

#### Acceptance Criteria

1. THE Wishlist_System SHALL store Wishlist_Item documents in a Firestore collection named "wishlistItems"
2. THE Wishlist_System SHALL store Wishlist_Category documents in a Firestore collection named "wishlistCategories"
3. THE Wishlist_System SHALL use Firestore realtime listeners (onSnapshot) to reflect additions, modifications, and deletions made by either user within 2 seconds of the change being committed to Firestore
4. WHILE the device has no network connectivity, THE Wishlist_System SHALL display the most recently cached wishlist data in read-only mode using Firestore offline persistence
5. THE Wishlist_System SHALL enforce Firestore security rules that restrict read and write access to the "wishlistItems" and "wishlistCategories" collections to only the two allowed authenticated users (Arul and Fifi), identified by UID and email
6. IF a Firestore realtime listener encounters an error, THEN THE Wishlist_System SHALL display an error message indicating the sync failure and retain the last successfully loaded data in the UI
7. IF a write operation to "wishlistItems" or "wishlistCategories" fails, THEN THE Wishlist_System SHALL display an error message indicating the save failure and preserve the user's input so they can retry without re-entering data
