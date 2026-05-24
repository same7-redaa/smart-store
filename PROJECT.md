# Smart Store (سمارت ستور)

## Project
React 19 + Vite + TypeScript + Tailwind v4.1 store management dashboard.
Arabic RTL, localStorage persistence, Gemini AI integration, Express backend.

## Stack
- React 19, Vite 6, TypeScript 5.8
- Tailwind CSS v4.1 (`@tailwindcss/vite`)
- `motion` (framer-motion) for animations
- `lucide-react` icons
- `@google/genai` for Gemini API
- Express backend (included but minimal)

## Notification & Confirm System
- `src/context/AppContext.tsx` provides `notify(type, message)` and `confirm({ title, message, onConfirm })` via `useApp()` hook
- Pages call `const { notify, confirm } = useApp()` to use them

## Pages
| Route | File | Purpose |
|-------|------|---------|
| dashboard | `Dashboard.tsx` | Stats cards, sales chart, recent orders |
| orders | `Orders.tsx` | Order table with status/payment filters |
| inventory | `Inventory.tsx` | Product table with search/filter, Excel import/export, variants |
| expenses | `Expenses.tsx` | Expense tracking with categories, filters, Excel import/export |

## Conventions
- Arabic-first UI (`dir="rtl"`)
- Primary color: `#0866ff`
- Data stored in `localStorage`
- Sidebar navigation, mobile-responsive
- AnimatePresence + motion for collapsible panels

## Dev
```bash
npm run dev    # Vite on port 3000
npm run build  # Production
npm run lint   # tsc --noEmit
```

---

## Progress Log
- [2026-05-22] Built complete auth system: login page, session management, logout, dynamic user display in sidebar
- [2026-05-22] Created Users.tsx (type/utils) and re-integrated user management as a tab inside System page (OtherPages.tsx) with new permission checkboxes
- [2026-05-22] Replaced predefined role-based permissions with flexible per-page access control
- [2026-05-22] Removed Users tab from System page; users management is now a standalone nav item
- [2026-05-22] Added permission-based sidebar filtering and route guard for restricted pages
- [2026-05-19] Full Excel import/export system completed with data validation dropdowns, auto SKU/barcode
- [2026-05-19] Fixed critical bug: `!merges` on wrong sheet was corrupting template headers
- [2026-05-19] Fixed `importMultiSheet` to return all sheets instead of first only, removed redundant file re-read
- [2026-05-19] Built complete Skill Selection Matrix (57 skills) in AGENTS.md
- [2026-05-19] Created SKILLS_MASTER.md at `C:\Users\Hp\.config\opencode\` with all 57 skills aggregated
- [2026-05-19] Created `init-skills.bat` for auto-generating guidance files in new projects
- [2026-05-19] Restructured AGENTS.md as universal AI orchestrator (Classify → Load Skill → Document → Verify)
- [2026-05-19] Separated project details into PROJECT.md with auto-update progress log
- [2026-05-19] Built complete Expenses page (src/pages/Expenses.tsx) with CRUD, 9 categories, stats with category chart, sorting, filters, Excel export/import/template
- [2026-05-19] Moved Add/Edit expense to separate page (src/pages/AddExpense.tsx) with back navigation and standalone form
- [2026-05-19] Added complete date filtering system (presets + custom range) to Orders, Expenses, Inventory, and Customers pages
- [2026-05-19] Added date filtering (by تاريخ التسجيل) to Purchases (Suppliers) page, added createdAt column to table
- [2026-05-21] Changed font to WellWay (6608WellWay.woff) and primary color to #00c950 (green)
- [2026-05-21] Created FloatingInput component (Material Design style with floating label, focus animation), applied to اسم المنتج field in AddProduct as sample
- [2026-05-21] Fixed overlapping label and placeholder/empty-value issue across all floating components (FloatingInput, FloatingTextarea, FloatingSelect) by rendering placeholders and selection text only when active (isFloating is true)
- [2026-05-21] Fixed text overflowing/leaking out in bulk price inputs under 'Add Shipping Company' (and 'Add Supplier') by increasing the width classes from w-28 to w-36/w-32 and adding flex-wrap responsiveness
- [2026-05-21] Added global CSS rules to hide browser-native up/down number input spin buttons, preventing overlaps with endAdornments ('ج.m') and text placeholders
- [2026-05-21] Fixed overlap between long floating labels and the left-aligned endAdornment ('ج.م') by rendering the endAdornment only when the field is active/floating (isFloating is true)
- [2026-05-21] Styled the Variant Settings and Bulk Apply inputs inside Add Product page with premium FloatingInputs and polished SKU/Barcode inputs by removing duplicate labels and moving generator buttons beneath the fields as elegant helpers.
- [2026-05-21] Separated the variants toggle switch ("هذا المنتج له متغيرات") into its own dedicated card section after the basic details section, mirroring the supplier linking card design.
- [2026-05-21] Nested the variant attributes configuration form and generated combinations table inside the collapsible Variants Switch Section card, utilizing AnimatePresence and motion.div for a smooth expand/collapse transition directly within the card container.
- [2026-05-21] Fixed a critical React focus-state propagation bug in FloatingInput where spreading {...props} at the end of the input element overrode the custom onFocus and onBlur handlers. Placing {...props} before onFocus/onBlur ensures custom state handlers work perfectly, enabling smooth floating label animations when focusing or typing inside the "ابحث عن مورد" input.
- [2026-05-21] Resolved search suggestions clipping/cutoff bug by removing the overflow-hidden class from the Framer Motion collapsible wrapper (`motion.div`) in the supplier linking section. Framer Motion manages overflow dynamically during transition and restores it to allow absolute dropdown results to overlay on top of cards correctly.
- [2026-05-21] Styled and unified the "Supplier Linking" (ربط المنتج بموردين) section cards, forms, and badges to use the global 'WellWay' Arabic font and primary green theme color (#00c950). Replaced explicit green classes with standard primary theme tokens and stripped 'font-sans' overrides from Arabic text tags while keeping it strictly on numeric elements.
- [2026-05-21] Implemented live auto-population, automatic reactive syncing, and dynamic calculations for the supplier linking section. The confirmation form now pre-fills with the product's current cost price, defaults to 'Fully Paid', and automatically calculates total invoice amounts. All values and accounts (including remaining debt) update dynamically in real time whenever the user modifies product prices, stock levels, or variant details.
- [2026-05-21] Added bulk selection and bulk action bar to the Suppliers management page in OtherPages.tsx, maintaining strict feature parity, animation presets, and styling with other pages.
- [2026-05-21] Completed advanced overhaul of Dashboard.tsx into a premium E-commerce Analytics Dashboard featuring dynamic COGS calculation, high-end custom interactive SVG Line & Donut charts, a visual funnel, deep insight tables, and an AI-style Smart Insights engine with rich fallback data for empty systems.
- [2026-05-21] Simplified and explained all technical terms and metrics across the advanced E-commerce Analytics Dashboard (KPIs, Donut chart, Funnel chart, Line curve, and tabular reports) using rich, interactive explainers (hover-triggered pure-CSS tooltips) written in extremely friendly, non-technical, plain Arabic so that any basic store merchant understands their numbers instantly.
- [2026-05-21] Created SalesChart.tsx (Recharts AreaChart with gradient) and ExpenseDonut.tsx (Recharts PieChart with legend) to replace raw SVG charts in Dashboard.tsx
- [2026-05-21] Removed ~80 lines of dead SVG computation code; cleaned up unused imports; fixed pre-existing missing imports
- [2026-05-22] Created comprehensive implementation plan for advanced order statuses (Cancellation, Returns, Exchanges) and financial calculations in Arabic.
- [2026-05-22] Built auth system with login page, session management, and logout
- [2026-05-22] Created Users.tsx (separate user management page) and AddUser.tsx (add/edit user with page-level permission checkboxes)
- [2026-05-22] Replaced predefined role permissions with flexible per-page access control (each user gets specific page grants)
- [2026-05-22] Removed Users tab from System page; users management is now a standalone page under its own nav item
- [2026-05-22] Added permission-based sidebar filtering — users only see nav items they have access to
- [2026-05-22] Added route guard — navigating to a restricted page redirects to dashboard
- [2026-05-22] Standardized customer, supplier, and store phone field validations to enforce Egyptian formats (010/011/012/015, 11 digits) with error messages ("رقم الهاتف غير صحيح") rendered elegantly directly under the input boxes via the error prop.
- [2026-05-22] Added custom return, cancellation, and exchange shipping rate pricing policies per shipping company in AddShippingCompany.tsx and saved them to localStorage.
- [2026-05-22] Created a fully featured Inventory Wastage management page (Wastage.tsx) displaying KPIs, granular logs, search/filters, custom export-to-Excel, and a manual wastage registrar modal which auto-decrements stock.
- [2026-05-22] Developed the high-end Smart Order Financial Wizard component (OrderFinancialWizard.tsx) to handle returns, exchanges, and cancellations with live shipping and restocking/wastage impacts.
- [2026-05-22] Updated Dashboard.tsx to subtract wastage losses and lost shipping costs from Net Profit calculations and integrated new dynamic KPI widgets.
- [2026-05-22] Integrated Supabase client SDK and built out database sync mapping, CRUD data service layers, and integrated a premium one-click localStorage-to-Supabase migration UI inside System Backup tab.
- [2026-05-22] Fixed permission bug in App.tsx preventing the Categories (إدارة الفئات) page from opening; mapped the page access to the 'inventory' permission.
- [2026-05-22] Completed automated background cloud synchronization (Zero-Click Sync) with dynamic `localStorage` proxy hijacking.
- [2026-05-22] Added dynamic glassmorphic cloud sync status indicator next to the Bell icon in src/components/Layout.tsx which changes between connected (🟢), saving (🔄), and error (🔴) in real time.
- [2026-05-22] Redesigned Backup tab in src/pages/OtherPages.tsx to announce automated background syncing with friendly Arabic copy, moving manual diagnostics and matching tools to a collapsed Advanced Maintenance Panel.
- [2026-05-22] Conducted a complete, deep-dive database schema audit for all 9 Supabase tables. Confirmed 8 tables are 100% correct, and isolated a single missing column (sub_photos) in the products table, providing the SQL fix.
- [2026-05-22] Re-verified all 9 database tables after the user executed the SQL command. All tables are now 100% correct, validated, and fully operational for background cloud sync!
- [2026-05-22] Provided the SQL configuration script to create and authorize the 'product-images' Supabase Storage bucket for anonymous public uploads.
- [2026-05-22] Solved the "اسم المستخدم أو كلمة المرور غير صحيحة" login bug in LoginPage.tsx by calling getUsers() fallback to ensure default admin/admin is always bootstrapped.
- [2026-05-22] Enabled complete mass data clearing (local storage + Supabase database tables) in OtherPages.tsx while keeping system_users intact.
- [2026-05-22] Refactored the window.confirm call in OtherPages.tsx to use the custom useApp() confirm modal, preventing crashes.
- [2026-05-22] Added 'my_wastage' key to STORAGE_KEYS in OtherPages.tsx for complete sync, backup, and clearing coverage.
- [2026-05-22] Removed default admin credentials helper text from LoginPage.tsx for production readiness.
- [2026-05-22] Integrated the newly created manual wastage registration page (AddWastage.tsx) into the core system routing.
- [2026-05-22] Modified src/components/Layout.tsx and src/App.tsx to safely handle 'add-wastage' page routing and permissions, locking access under the 'inventory' grant.
- [2026-05-22] Cleaned up unused floating component imports, stray closing braces, and leftover modal JSX markup from src/pages/Wastage.tsx to fix all React compiler and syntax warnings.
- [2026-05-22] Fixed critical bug: changing order status (مكتمل ↔ ملغي) now properly adjusts inventory (stock ±), customer stats (ordersCount, totalSpent, cancelledOrders), and dashboard reports. Added `adjustStockForOrderStatus` and `adjustCustomerForOrderStatus` in sync.ts. Applied to all status change handlers in Orders.tsx (single, bulk, cancel confirm). Also fixed AddOrder.tsx to deduct stock on order save.
- [2026-05-22] Finished full refactoring of advanced status transitions (Cancellations, Partial/Full Returns, Exchanges) and their downstream impacts. Completed integration inside `Orders.tsx` cancellation confirm modal and wizard callback, updated `AddOrder.tsx` to use `recalculateCustomerStats` for robust customer metrics, and fully updated `Dashboard.tsx` KPIs, topProducts, governorateSales, shippingPerformance, and customerLoyalty to deduct refunds and adjust COGS for returned items.
- [2026-05-22] Performed detailed hosting architecture analysis comparing VPS, Shared Hosting, and Modern Serverless CDN/Supabase cloud hosting for the Smart Store management dashboard.
- [2026-05-23] Successfully executed production build (npm run build) to compile the React 19 + TypeScript + Vite + Tailwind CSS dashboard, ensuring zero build or compilation errors.
- [2026-05-23] Aligned customer phone numbers to the right while preserving their LTR presentation (under right-aligned RTL labels) in profile card, and implemented formatDateTime helper to display clean standard date-time formats for customer registration dates in OtherPages.tsx.
- [2026-05-24] Analyzed and documented smart deployment architectures for Hostinger Shared Hosting using GitHub Actions CI/CD pipeline and direct Git webhooks.
- [2026-05-24] Created automated GitHub Actions CI/CD deployment workflow (`.github/workflows/deploy.yml`) for Hostinger FTP integration.




