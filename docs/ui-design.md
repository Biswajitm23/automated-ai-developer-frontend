# UI design — Employee Leave Management (Phase 1)

Card: **ELM-UI-001 — Design and implement all Employee and Admin pages**
(https://trello.com/c/OPAEnHVK). Branch: `feature/ELM-UI-001-employee-admin-pages`
(created from the ELM-002 branch).

This document is the single reference for frontend design decisions in Phase 1.
Later feature cards (ELM-003 to ELM-009) reuse these screens and replace mock
calls with real endpoints. They do not rebuild the design.

Sources: the Project Brief (https://trello.com/c/ql171MlA), cards ELM-003 to
ELM-010, the ELM-002 frontend (`src/lib/api.ts`, `src/lib/auth.ts`,
`src/components/*`, `src/app/**`) and backend (`backend/accounts/`), and the
Next.js 16.3.5 docs in `node_modules/next/dist/docs/`.

Contents

1. [Page inventory and traceability](#1-page-inventory-and-traceability)
2. [Route map (App Router)](#2-route-map-app-router)
3. [Design tokens](#3-design-tokens)
4. [Layout, navigation and component library](#4-layout-navigation-and-component-library)
5. [Data model, service layer and mock layer](#5-data-model-service-layer-and-mock-layer)
6. [Proposed API contracts](#6-proposed-api-contracts)
7. [Working-day preview algorithm](#7-working-day-preview-algorithm)
8. [Implementation plan](#8-implementation-plan)
9. [Known limitations, assumptions and open questions](#9-known-limitations-assumptions-and-open-questions)

---

## 0. Principles

- **The backend is authoritative.** Hidden buttons, route guards, client-side
  validation and the working-day preview are there for usability. They are not
  security. Every rule is enforced again by Django (Project Brief, "Access rules").
- **One design system for both roles.** Employee and Admin pages use the same
  tokens, the same `AppShell` and the same components. Only the navigation items
  differ.
- **Every data view has five states:** loading (skeleton), empty, success,
  error (with **Try again**), and *not available yet* (the endpoint does not
  exist and mock mode is off). The last one is shown to users only as a plain
  "Nothing to show yet": the owner asked (2026-09-23) for no messages about the
  server, releases or card numbers. Forms also have validation, submitting (disabled
  controls) and success states.
- **No UI library.** The work uses CSS Modules and CSS custom properties with
  React 19 and native platform features: `<dialog>` for modals,
  `<input type="date">` for dates, and `<table>` for tables. The components
  needed here are few and simple. Native `<dialog>` already provides the
  hard accessibility parts: a top-layer modal that makes the rest of the page
  inert, Esc to close, and `aria-modal` semantics. A library would add bundle
  size, a second styling system and upgrade risk against a Next.js version with
  breaking changes. **Decision: add no new runtime dependencies.**
- **Light theme only** in Phase 1. The ELM-002 dark-mode media query is removed
  and `color-scheme: light` is set, so contrast is verified for one palette.
- **Keep the ELM-002 behaviour and test IDs.** See [2.4](#24-elm-002-behaviours-that-must-keep-working).

---

## 1. Page inventory and traceability

### 1.1 Inventory

Legend for states: **L** loading skeleton, **E** empty, **F** no filter results,
**V** validation, **S** submitting/disabled, **OK** success feedback,
**X** error with retry, **NA** not available yet (endpoint missing and mock off),
**404** resource not found or not yours, **403** access denied.

| # | Page | Route | Role | Card(s) | Main components | States |
|---|---|---|---|---|---|---|
| 1 | Login | `/login` | Public | ELM-002, UI-001 | `LoginForm`, `Card`, `TextField`, `Button`, `Alert` | L (session check), V, S, X (400/403 CSRF/429/network), "already signed in" redirect |
| 2 | Access denied | inline panel on any role-restricted route | Signed-in, wrong role | ELM-002, UI-001 | `AccessDenied` (built on `EmptyState`) | Static. Rendered in place and keeps the URL |
| 3 | Page not found | `app/not-found.tsx` (unmatched URLs), plus `NotFoundPanel` in the shell (missing or foreign records) | Any | UI-001 | `NotFoundPage`, `NotFoundPanel` | Static |
| 4 | App layout + account menu | `(protected)/layout.tsx` | Signed-in | ELM-002, UI-001 | `AppShell`, `Sidebar`, `MobileNav`, `AccountMenu`, `MockBanner`, `ToastProvider` | Session loading, session error with retry, redirecting, logout pending/error |
| 5 | Employee dashboard | `/dashboard` (EMPLOYEE) | Employee | ELM-006, UI-001 | `PageHeader`, year `Select`, `BalanceCard` ×2, `LeaveRequestTable` (5 recent), `EmptyState` | L, E (no allowances set / no requests), X, NA |
| 6 | Apply for leave | `/leave/apply` | Employee | ELM-005, ELM-004, UI-001 | `ApplyLeaveForm`, `Select`, `DateField` ×2, `Textarea`, `WorkingDayPreview`, `Alert` | L (types and balances), V (client and server), S, OK (redirect and toast), X, NA, "no allowance for this type" |
| 7 | Leave history | `/leave` | Employee | ELM-006, UI-001 | `FilterBar` (year, status), `LeaveRequestTable`, `Pagination` | L, E, F, X, NA |
| 8 | Request details | `/leave/[id]` | Employee | ELM-006, ELM-007 (decision shown), ELM-008 | `RequestSummary`, `DecisionSummary`, `StatusBadge`, **Cancel request** `Button` | L, X, NA, 404, OK (just created, just cancelled) |
| 9 | Cancel confirmation | dialog on `/leave/[id]` | Employee | ELM-008 | `ConfirmDialog` (danger) | S, X (409 no longer pending, network), OK |
| 10 | Admin dashboard | `/admin` | Admin | ELM-009, ELM-002 (server access check), UI-001 | `AdminAccessCheck`, `StatCard` ×5, `AdminRequestTable` (recent), `EmptyState` | L, E, X, NA, 403 |
| 11 | Employee list | `/admin/employees` | Admin | ELM-003 | `FilterBar` (search, status), `ResponsiveTable`, `StatusBadge` (Active/Inactive), `Pagination` | L, E, F, X, NA |
| 12 | Create employee | `/admin/employees/new` | Admin | ELM-003 | `EmployeeForm` (name, email, department, username, initial password) | V (duplicate email, password rules), S, OK, X, NA |
| 13 | Edit employee + deactivation | `/admin/employees/[id]` | Admin | ELM-003 | `EmployeeForm`, `ConfirmDialog` (deactivate/reactivate), link to allowances | L, V, S, OK, X, NA, 404 |
| 14 | Allowance management | `/admin/allowances?employee=&year=` | Admin | ELM-003, ELM-004 | `Select` (employee, year), `AllowanceTable` (row per leave type, number input, per-row Save) | L, E (no employee chosen / no employees), V (negative, below used+reserved), S, OK, X, NA |
| 15 | All leave requests | `/admin/requests` | Admin | ELM-009 | `FilterBar` (employee, status, type, from, to), `StatusCounts`, `AdminRequestTable`, `Pagination` | L, E, F, X, NA |
| 16 | Request review | `/admin/requests/[id]` | Admin | ELM-007 | `RequestSummary`, employee `Card`, `BalanceImpact`, **Approve**/**Reject** buttons, `DecisionSummary` | L, X, NA, 404, already-decided (buttons hidden, decision shown) |
| 17 | Decision confirmation | dialog on `/admin/requests/[id]` | Admin | ELM-007 | `DecisionDialog` (remarks `Textarea`, required for reject) | V (remarks required, max length), S, X (409 already processed / insufficient balance), OK |
| – | Home | `/` | Public | ELM-002 | Redirects to `/login` (owner feedback, 2026-09-23); the login form sends signed-in users on to `/dashboard` | – |

### 1.2 Traceability: card requirement → page

| Card | Requirement | Page(s) / component |
|---|---|---|
| UI-001 #1 | Login | `/login` |
| UI-001 #2 | Access denied | `AccessDenied` inline on `/admin/**` (employee) and `/leave/**` (admin) |
| UI-001 #3 | Page not found | `app/not-found.tsx`, `NotFoundPanel` |
| UI-001 #4 | Shared layout, account/logout menu | `AppShell` + `AccountMenu` |
| UI-001 #5 / ELM-006 | Allowance, approved, pending, available per leave type | `/dashboard` → `BalanceCard` |
| UI-001 #6 / ELM-005 | Type, start, end, reason; working-day count; loading/success/validation; prevent duplicates | `/leave/apply` (`WorkingDayPreview`, submit disabled while pending, `client_request_id`) |
| ELM-004 | Weekends excluded, inclusive, Asia/Kolkata, no past start, no reversed range, no cross-year, ≥1 working day, no overlap, balance | Client pre-check in `src/lib/dates.ts` ([§7](#7-working-day-preview-algorithm)). Server errors shown in `ApplyLeaveForm`. Balances shown in `BalanceCard` and `BalanceImpact` |
| UI-001 #7 / ELM-006 | History with year and status filters; dates, day count, status | `/leave` |
| UI-001 #8 / ELM-006 | Details, reason, admin remarks | `/leave/[id]` → `RequestSummary`, `DecisionSummary` |
| ELM-007 | Decision details visible in employee history | `/leave/[id]` `DecisionSummary` (reviewer, decided at, remarks) |
| UI-001 #9 / ELM-008 | Cancel only Pending; confirm; status Cancelled; history kept | `/leave/[id]` button shown only for `PENDING`, `ConfirmDialog`. The request stays in `/leave` |
| ELM-008 | Dashboard and history update after cancel | Service calls re-fetch after cancel. Toast. The dashboard re-fetches on mount |
| UI-001 #10 / ELM-009 | Counts by status, recent requests | `/admin` |
| UI-001 #11 / ELM-003 | Employee list, search, active/inactive | `/admin/employees` |
| UI-001 #12 / ELM-003 | Create employee: name, unique email, department; password never displayed | `/admin/employees/new` (password is write-only, `autocomplete="new-password"`, never echoed) |
| UI-001 #13 / ELM-003 | Edit, deactivate (history kept) | `/admin/employees/[id]` + `ConfirmDialog` |
| UI-001 #14 / ELM-003 | Allowances per employee, type, year; no negatives; not below approved+reserved | `/admin/allowances` (`min` and inline errors, "minimum allowed" column) |
| ELM-003 | Employees cannot modify role/allowance | No UI for employees (`/admin/**` gated). Backend 403 |
| UI-001 #15 / ELM-009 | Filters (employee, status, type, date range overlapping), newest first, pagination, counts reflect filters | `/admin/requests` |
| UI-001 #16 / ELM-007 | Review with employee balance; approve/reject pending only | `/admin/requests/[id]` + `BalanceImpact` |
| UI-001 #17 / ELM-007 | Remarks required for rejection, optional for approval; records reviewer and time | `DecisionDialog`. Shown afterwards in `DecisionSummary` |
| ELM-009 | Link each request to review | `AdminRequestTable` row link → `/admin/requests/[id]` |
| Brief | Loading, empty, validation, error states; responsive | All pages ([1.1](#11-inventory) state column). `ResponsiveTable` stacks below 768 px |
| UI-001 | Long names, long reasons, large lists | Seed data ([5.6](#56-seed-data)). `overflow-wrap:anywhere`. Pagination |
| UI-001 | Mock data dev-only, no role switching | [5.4](#54-mock-layer) |

---

## 2. Route map (App Router)

### 2.1 File tree (target)

```
src/app/
  layout.tsx                      root: <html>, AuthProvider (unchanged apart from token CSS import)
  globals.css                     base styles using tokens (rewritten)
  not-found.tsx                   NEW: unmatched URLs (outside the shell, standalone card)
  page.tsx                        "/" dev scaffold (unchanged; restyled via tokens)
  login/
    page.tsx                      "/login" (restyled; same Suspense wrapper)
    login-form.tsx                logic and test IDs unchanged; UI components
    login.module.css              NEW (replaces auth.module.css usage)
  (protected)/
    layout.tsx                    RequireAuth > ToastProvider > AppShell > children
    error.tsx                     NEW: error boundary for the protected area ("use client", props {error, retry})
    dashboard/
      page.tsx                    "/dashboard": role router
      dashboard-router.tsx        EMPLOYEE → <EmployeeDashboard/>; ADMIN → router.replace("/admin")
      employee-dashboard.tsx
    leave/
      layout.tsx                  NEW: <RequireRole role="EMPLOYEE">
      page.tsx                    "/leave" history
      leave-history-view.tsx
      apply/
        page.tsx                  "/leave/apply"
        apply-leave-form.tsx
      [id]/
        page.tsx                  "/leave/[id]" (async server page, awaits params)
        leave-request-view.tsx
    admin/
      layout.tsx                  NEW: <RequireRole role="ADMIN">
      page.tsx                    "/admin" dashboard
      admin-dashboard.tsx
      admin-access-check.tsx      from admin-panel.tsx (same text and test ID)
      employees/
        page.tsx                  "/admin/employees"
        employee-list-view.tsx
        new/
          page.tsx                "/admin/employees/new"
          create-employee-view.tsx
        [id]/
          page.tsx                "/admin/employees/[id]"
          edit-employee-view.tsx
      allowances/
        page.tsx                  "/admin/allowances"
        allowance-manager.tsx
      requests/
        page.tsx                  "/admin/requests"
        admin-requests-view.tsx
        [id]/
          page.tsx                "/admin/requests/[id]"
          review-request-view.tsx
```

### 2.2 Route table

| Route | Access | Page | Notes |
|---|---|---|---|
| `/` | Public | Redirect | `redirect("/login")`. The backend health panel was removed at the owner's request |
| `/login` | Public | Login | `?next=` goes through `safeNextPath()` (unchanged). Default after login is still `/dashboard` |
| `/dashboard` | Signed-in | **Role router** | EMPLOYEE: employee dashboard. ADMIN: `router.replace("/admin")` while showing "Opening the admin dashboard…" (`role="status"`) |
| `/leave` | EMPLOYEE | Leave history | Query: `year`, `status`, `page` |
| `/leave/apply` | EMPLOYEE | Apply for leave | Static segment. It takes precedence over `[id]` |
| `/leave/[id]` | EMPLOYEE | Request details (+ cancel dialog) | Query `?created=1` / `?cancelled=1` are not used. Success feedback goes through toasts |
| `/admin` | ADMIN | Admin dashboard | Keeps the server access check |
| `/admin/employees` | ADMIN | Employee list | Query: `q`, `status` (`active`/`inactive`/`all`, default `all`), `page` |
| `/admin/employees/new` | ADMIN | Create employee | Static segment. It takes precedence over `[id]` |
| `/admin/employees/[id]` | ADMIN | Edit employee (+ deactivate dialog) | |
| `/admin/allowances` | ADMIN | Allowances | Query: `employee`, `year` (default: current Kolkata year) |
| `/admin/requests` | ADMIN | All requests | Query: `employee`, `status`, `leave_type`, `from`, `to`, `page` |
| `/admin/requests/[id]` | ADMIN | Review (+ decision dialog) | |
| anything else | Any | `app/not-found.tsx` | e.g. `/register` still returns 404 (ELM-002 check) |

Route rules (checked against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`):

- `(protected)` is a **route group**. It does not appear in the URL, so the
  existing `/dashboard` and `/admin` URLs stay the same.
- **Dynamic params are a Promise.** Each `[id]/page.tsx` is a server component:
  `export default async function Page({ params }: PageProps<"/leave/[id]">) { const { id } = await params; return <LeaveRequestView id={id} />; }`
  The client view checks the id against `/^[1-9]\d{0,9}$/`. Anything else
  renders `NotFoundPanel` without a request. `PageProps` and `LayoutProps` are
  global helpers created by `next typegen`/`next build`, as the README notes.
- **`useSearchParams` needs a `<Suspense>` boundary** because the pages are
  prerendered. Every list page wraps its view in `<Suspense fallback={<PageSkeleton/>}>`,
  the same pattern as `/login`.
- **Root `app/not-found.tsx`** handles every unmatched URL. It renders inside
  the root layout only, not inside the protected shell. So it is a standalone
  centred card with links to **Go to dashboard** (`/dashboard`, which goes to
  `/login?next=` when signed out) and **Home**. `global-not-found` (experimental)
  is **not** used, because there is one root layout.
- **Missing records** (API 404 on `/leave/[id]`, `/admin/employees/[id]`,
  `/admin/requests/[id]`) render `NotFoundPanel` *inside* the shell. Data is
  fetched on the client, so `notFound()` is not used. The panel says
  "We couldn't find this leave request. It may not exist, or it isn't yours."
  The employee API returns 404 for other people's requests. See [§6](#6-proposed-api-contracts).
- **`error.tsx`** in `(protected)/` catches unexpected render errors. In this
  Next version its props are `{ error, retry }`, not `reset`. It shows an
  `Alert` with **Try again** (`retry()`) and a link to `/dashboard`.
- **No `loading.tsx`.** Pages render at once and fetch on the client. Skeletons
  are shown inside each view. The auth guard shows its own session skeleton.
- **No `forbidden()`/`unauthorized()`** (experimental `authInterrupts`). Access
  denial stays client-side and inline, as it was in ELM-002.

### 2.3 Role gating

- `(protected)/layout.tsx` → `RequireAuth` (unchanged logic): loading → error →
  redirect to `/login?next=<path+search>`, or to `/login` after an explicit logout.
- `(protected)/leave/layout.tsx` → `<RequireRole role="EMPLOYEE">`. Admins see
  `AccessDenied`. In Phase 1 admins are not leave-takers. See [§9](#9-known-limitations-assumptions-and-open-questions).
- `(protected)/admin/layout.tsx` → `<RequireRole role="ADMIN">`. Employees see
  `AccessDenied`. The existing `admin/page.tsx` stops wrapping `RequireRole`
  itself, because the layout now does it.
- Navigation shows only the current role's items. This is cosmetic. The Django
  API returns 403 for the wrong role, and each view turns a 403 into `AccessDenied`.

### 2.4 ELM-002 behaviours that must keep working

| Behaviour | How it is preserved |
|---|---|
| Signed-out visit to a protected page → `/login?next=<path>` | `RequireAuth` unchanged. It covers every new route because they all live under `(protected)` |
| After explicit logout → `/login` (then later visits use `?next=`) | `AuthProvider.logout()` unchanged. `AccountMenu` calls it and keeps the ELM-002 error messages |
| `safeNextPath` checks (`//evil`, `/\host`, control characters, `/login` loop) | `src/lib/auth.ts` unchanged. `DEFAULT_AFTER_LOGIN` stays `/dashboard` |
| Employee opening `/admin` (and now `/admin/**`) sees "Access denied" (`data-testid="access-denied"`) | `admin/layout.tsx` → `RequireRole`. The same `AccessDenied` component and test ID. Its link "Back to dashboard" still goes to `/dashboard` |
| Server-side admin check | `AdminAccessCheck` on `/admin` (the admin dashboard) calls `GET /api/admin/ping/`. It shows nothing while checking or when confirmed (owner request, 2026-09-23: no technical status messages). A 403 renders `AccessDenied`; any other failure shows "We couldn't confirm your administrator access. Please try again." (`data-testid="admin-ping-status"`) with **Try again** |
| `data-testid` `logout-button`, `header-user`, `header-role` | Rendered once in `AccountMenu`. On desktop it is always visible in the sidebar footer. On mobile (<1024 px) it is inside the menu drawer, so open **Menu** (`data-testid="mobile-menu-button"`) first |
| `current-user`, `current-role` | Rendered in the `PageHeader` subtitle of both dashboards: "Signed in as `<username>` · `<role badge>`" |
| Login test IDs and messages (`login-form`, `login-error`, empty-field, 400/403/429/network texts) | `login-form.tsx` logic unchanged. Only markup and styling move to UI components |
| Session re-check on focus/visibility | `AuthProvider` unchanged |
| No `/register` (404) | No such route. Root `not-found.tsx` |
| **Changed:** an admin who signs in now ends up on `/admin` (via `/dashboard`) | `/dashboard` redirects admins. Any E2E check that expects the admin URL to *remain* `/dashboard` must wait for `/admin` instead. The employee landing is unchanged |

### 2.5 Fate of existing files

| File | Decision |
|---|---|
| `src/components/site-header.tsx` | **Deleted** in Phase A. Its logout logic and messages move to `components/layout/account-menu.tsx`, and its nav moves to `sidebar.tsx` |
| `src/app/(protected)/dashboard/dashboard-summary.tsx` | Phase A: restyled and kept as the interim content of `/dashboard`. Phase B: replaced by `dashboard-router.tsx` and `employee-dashboard.tsx`, then deleted |
| `src/app/(protected)/admin/admin-panel.tsx` | Phase C: becomes `admin-access-check.tsx` (same state machine, texts and test ID, without the `<h1>`) and is used inside `admin-dashboard.tsx`. Then deleted |
| `src/app/auth.module.css` | Deleted at the end of Phase A, once nothing imports it (login and home link move to UI components) |
| `src/components/require-auth.tsx` | Kept. Its states use `Skeleton`/`Alert`/`Button`. `AccessDenied` moves to `components/states/access-denied.tsx` and is **re-exported** from `require-auth.tsx`, so existing imports keep working |
| `src/components/auth-provider.tsx`, `src/lib/api.ts`, `src/lib/auth.ts` | **Unchanged** |
| `src/app/page.tsx` | Now only redirects to `/login`. `backend-status.tsx`, `page.module.css` and `home-auth-link.tsx` were removed (ELM-002 owner feedback), and with them the legacy token aliases |

---

## 3. Design tokens

File: `src/styles/tokens.css`, imported first by `src/app/layout.tsx`. Media
queries cannot use custom properties, so breakpoints are documented here and
written as literals in CSS.

### 3.1 Colours

The palette follows the Bitpastel company website (https://www.bitpastel.com/),
as the owner asked on 2026-09-23: charcoal text on white and light neutral
backgrounds, green actions, and the site's soft mint, yellow, coral and sky
pastels. Contrast ratios were calculated with the WCAG 2.x formula. AA requires
4.5:1 for body text, 3:1 for large text, and 3:1 for UI component boundaries
and focus indicators.

The site's exact brand green, `#00A974`, has only 3.0:1 contrast with white
text, so it is not used behind button labels or as link text. Buttons use a
slightly deeper shade (`#00875C`, 4.55:1) and links a deeper one again
(`#00704D`); the brand green itself marks the active nav item, status borders
and other accents.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--color-bg` | `#F6F8F7` | Page background | — |
| `--color-surface` | `#FFFFFF` | Cards, tables, sidebar, dialogs, inputs | — |
| `--color-surface-muted` | `#EEF3F1` | Table header, hover rows, skeleton base | — |
| `--color-text` | `#2A2A2A` | Body text, headings (the site's text colour) | 14.4:1 on white, 13.5:1 on bg |
| `--color-text-muted` | `#4F5552` | Secondary text, labels in `<dl>` | 7.2:1 on bg, ≥6.3:1 on every pastel |
| `--color-text-subtle` | `#5C6360` | Hints, captions, placeholder | 5.8:1 on bg, 5.5:1 on `surface-muted` |
| `--color-border` | `#E3E8E6` | Decorative dividers, card outlines | Decorative only |
| `--color-border-strong` | `#C9D2CE` | Table row separators | Decorative only |
| `--color-border-input` | `#7D8683` | Input, select, textarea and secondary button borders | 3.7:1 on white (meets 1.4.11) |
| `--color-brand` | `#00A974` | Bitpastel green: active nav bar, accents (never text) | Decorative |
| `--color-primary` | `#00875C` | Primary buttons, selected pagination, working-day preview accent | 4.55:1 white text on it |
| `--color-primary-hover` | `#00704D` | Primary hover/active | 6.1:1 with white |
| `--color-primary-subtle` | `#DCF6EB` | Active nav item background, avatar, role badge (site mint) | `#00664A` text on it: 6.1:1 |
| `--color-primary-subtle-strong` | `#B9ECD6` | Role badge border | — |
| `--color-primary-text` | `#00664A` | Text on primary-subtle | 6.1:1 |
| `--color-on-primary` | `#FFFFFF` | Text on primary | — |
| `--color-link` / `-hover` | `#00704D` / `#005A3E` | Links and breadcrumb hover | 6.1:1 on white, 5.7:1 on bg |
| `--color-focus` | `#22577A` | 2 px focus outline, 2 px offset (the site's navy) | 7.7:1 against white |
| `--color-pastel-mint/-yellow/-coral/-sky/-grey` | `#DCF6EB` `#FCF4D7` `#FDE3E5` `#E3F4F9` `#F0F0F0` | StatCard fills by tone, as on the site's cards | Text on them ≥6.3:1 |
| `--color-danger` | `#B42330` | Danger button background, error text, invalid borders | White on it: 6.5:1. On `#FDE3E5`: 5.4:1 |
| `--color-danger-hover` | `#961C27` | Danger hover | — |
| `--color-danger-subtle` | `#FDE3E5` | Error alert background | — |
| `--color-success` | `#00664A` | Success text/icons | 6.1:1 on `#D8F5E9` |
| `--color-success-subtle` | `#D8F5E9` | Success alert background | — |
| `--color-warning` | `#7A5000` | Warning text/icons | 6.4:1 on `#FCF4D7` |
| `--color-warning-subtle` | `#FCF4D7` | Warning alert background | — |
| `--color-info` | `#22577A` | Info text/icons | 6.9:1 on `#E3F4F9` |
| `--color-info-subtle` | `#E3F4F9` | Info alert and mock banner background | — |
| `--color-backdrop` | `rgb(42 42 42 / 0.5)` | Dialog and drawer backdrop | — |

**Status badges** (always icon + text label, and a 1 px border so the shape
does not depend on colour):

| Status | Text | Background | Border | Icon | Contrast |
|---|---|---|---|---|---|
| Pending | `#7A5000` | `#FCF4D7` | `#D9A900` | clock | 6.4:1 |
| Approved | `#00664A` | `#D8F5E9` | `#00A974` | check | 6.1:1 |
| Rejected | `#A61E2B` | `#FDE3E5` | `#E0505C` | x-circle | 6.1:1 |
| Cancelled | `#3B3B3C` | `#F0F0F0` | `#8C8C8C` | slash-circle | 9.8:1 |
| Active (employee) | `#00664A` | `#D8F5E9` | `#00A974` | dot | 6.1:1 |
| Inactive (employee) | `#3B3B3C` | `#F0F0F0` | `#8C8C8C` | dot (hollow) | 9.8:1 |

Tokens: `--status-pending-fg/bg/border`, `--status-approved-*`,
`--status-rejected-*`, `--status-cancelled-*`, `--status-active-*`, `--status-inactive-*`.

### 3.2 Typography

The website's fonts: **Roboto** (400, 500, 700) for body text and controls,
and **Source Sans 3** (600, 700; the current name of Source Sans Pro) for
headings, the product name and stat values. Both are loaded with `next/font/google`
in `src/app/layout.tsx`, which self-hosts them: `next build` downloads them
once, and browsers never contact Google. The loader sets `--font-roboto` and
`--font-source-sans` on `<html>`; the tokens are
`--font-sans: var(--font-roboto), Roboto, system-ui, …` and
`--font-heading: var(--font-source-sans), "Source Sans Pro", var(--font-sans)`.
`--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
Numbers in tables and stat cards use `font-variant-numeric: tabular-nums`.

| Token | Size | Line height | Use |
|---|---|---|---|
| `--text-xs` | 0.75rem (12 px) | 1rem | Badge counts only (never body copy) |
| `--text-sm` | 0.875rem (14 px) | 1.25rem | Table cells, hints, badges, captions |
| `--text-base` | 1rem (16 px) | 1.5rem | Body, inputs (16 px avoids iOS zoom) |
| `--text-lg` | 1.125rem (18 px) | 1.75rem | Card titles, dialog titles |
| `--text-xl` | 1.25rem (20 px) | 1.75rem | Section headings (h2) |
| `--text-2xl` | 1.5rem (24 px) | 2rem | Page title (h1) on mobile |
| `--text-3xl` | 1.875rem (30 px) | 2.25rem | Page title (h1) ≥768 px, stat values |

Weights: `--font-regular: 400`, `--font-medium: 500`, `--font-semibold: 600`, `--font-bold: 700`.
Heading order: one `h1` per page (in `PageHeader`), `h2` for cards/sections, `h3` inside cards.

### 3.3 Spacing, radii, shadows, layout

```css
:root {
  /* 4 px base */
  --space-0: 0; --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem;
  --space-4: 1rem; --space-5: 1.25rem; --space-6: 1.5rem; --space-8: 2rem;
  --space-10: 2.5rem; --space-12: 3rem; --space-16: 4rem;

  --radius-sm: 4px;   /* badges' inner elements, checkboxes */
  --radius-md: 8px;   /* inputs */
  --radius-lg: 12px;  /* alerts, table wrapper, toasts */
  --radius-xl: 20px;  /* cards, dialogs, drawer (the site's card radius) */
  --radius-full: 999px; /* buttons and nav links (pill, as on the site), badges, avatar */

  --shadow-sm: 0 1px 2px rgb(42 42 42 / 0.06);
  --shadow-md: 0 4px 12px rgb(42 42 42 / 0.08), 0 1px 3px rgb(42 42 42 / 0.06);
  --shadow-lg: 0 20px 40px rgb(42 42 42 / 0.18), 0 4px 12px rgb(42 42 42 / 0.08);

  --control-height: 2.75rem;      /* 44 px touch target (buttons, inputs, nav links) */
  --control-height-sm: 2.25rem;   /* compact buttons inside tables (keeps 44 px hit area via padding on mobile) */
  --sidebar-width: 16rem;         /* 256 px */
  --topbar-height: 3.5rem;        /* 56 px mobile top bar */
  --content-max-width: 75rem;     /* 1200 px */
  --form-max-width: 40rem;        /* 640 px */
  --focus-ring: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-focus);

  --duration-fast: 120ms; --duration-base: 200ms;
  --easing-standard: cubic-bezier(0.2, 0, 0, 1);

  /* z-index scale */
  --z-base: 0; --z-sticky: 10; --z-topbar: 20; --z-sidebar: 30;
  --z-drawer-backdrop: 40; --z-drawer: 50; --z-dialog: 60; --z-toast: 70;
}
```

Motion: transitions only (no animation libraries). They are turned off under
`@media (prefers-reduced-motion: reduce)`.

Focus: every interactive element gets
`:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }`.
Focus is never removed without a replacement.

### 3.4 Breakpoints

| Name | Min width | Layout change |
|---|---|---|
| base | 0 | Single column, top bar and drawer nav, tables stacked as cards, 16 px side gutter |
| `sm` | 480 px | Two-column form rows (start/end date), stat cards 2-up |
| `md` | 768 px | Tables become real tables, 24 px gutter, h1 30 px, filters inline |
| `lg` | 1024 px | Static sidebar (256 px), top bar hidden, stat cards up to 5-up |
| `xl` | 1280 px | Content max width 1200 px, centred |

Required checks: 375 px, 768 px and 1280 px. No horizontal page scroll at any
width. `html, body { overflow-x: hidden }` is **not** relied on; each
component must fit.

---

## 4. Layout, navigation and component library

### 4.1 Layout

```
≥1024 px                                         <1024 px
┌───────────┬──────────────────────────────┐     ┌──────────────────────────┐
│ Bitpastel │ [MockBanner, dev only]       │     │ ☰ Menu  Leave Mgmt       │ top bar (sticky)
│           │ PageHeader  h1 + actions     │     ├──────────────────────────┤
│ Nav       │                              │     │ [MockBanner]             │
│  • ...    │ content (max 1200 px)        │     │ PageHeader               │
│           │                              │     │ content (16 px gutter)   │
│───────────│                              │     │                          │
│ Account   │                              │     └──────────────────────────┘
│ name/role │                              │     Drawer (native <dialog>, left):
│ [Log out] │                              │     nav + AccountMenu, Esc/backdrop closes
└───────────┴──────────────────────────────┘
```

- A skip link, "Skip to main content", is the first focusable element and
  targets `<main id="main-content" tabIndex={-1}>`.
- Landmarks: `<header>` (mobile top bar), `<nav aria-label="Main">`,
  `<main>`, and the account section as `<section aria-label="Account">`.
- `RequireAuth` already wraps its loading/error states in `<main>`. `AppShell`
  renders its own `<main>` only when authenticated, so there is one `<main>`
  per page.

Navigation items (`src/components/layout/nav-config.ts`):

| Role | Label | Href | Active when path |
|---|---|---|---|
| EMPLOYEE | Dashboard | `/dashboard` | equals |
| EMPLOYEE | Apply for leave | `/leave/apply` | equals |
| EMPLOYEE | My leave | `/leave` | equals or `startsWith("/leave/")` and is not `/leave/apply` |
| ADMIN | Dashboard | `/admin` | equals |
| ADMIN | Leave requests | `/admin/requests` | prefix |
| ADMIN | Employees | `/admin/employees` | prefix |
| ADMIN | Allowances | `/admin/allowances` | prefix |

The active item gets `aria-current="page"`, a `--color-primary-subtle`
background and a 3 px left bar in the brand green, so it is not shown by colour
alone. Nav links are pill-shaped.

Brand: `BrandLogo` (`src/components/layout/brand-logo.tsx`) shows the Bitpastel
logo (`public/brand/bitpastel-logo.svg`, from bitpastel.com) and the product
name. The sidebar stacks the name under the logo; the mobile top bar and the
login page show them side by side with a thin divider.

### 4.2 Components

All components live in `src/components/ui/`, `src/components/layout/`,
`src/components/states/`, `src/components/leave/` and `src/components/admin/`.
Each has a co-located `*.module.css` that uses only tokens. Names below are
exports. Props are TypeScript shapes.

#### Layout

| Component | Props | Behaviour |
|---|---|---|
| `AppShell` | `{ children }` | Reads `useAuth()` (always authenticated here). Renders skip link, `MockBanner`, desktop `Sidebar` or mobile top bar and `MobileNav`, and `<main id="main-content">`. Chooses desktop or mobile with `useMediaQuery("(min-width: 1024px)")` (`useSyncExternalStore`, server snapshot `false`), so **only one** copy of the nav and `AccountMenu` exists in the DOM (unique test IDs) |
| `Sidebar` | `{ role: Role; onNavigate?: () => void }` | Brand link (`/dashboard`, `BrandLogo` stacked), `<nav aria-label="Main">` list of `NavLink`s, `AccountMenu` pinned to the bottom. Static at ≥1024 px |
| `MobileNav` | `{ open: boolean; onClose: () => void; returnFocusRef: RefObject<HTMLButtonElement> }` | Left drawer built on `Dialog` (`variant="drawer"`), with `aria-label="Main menu"`. Contains `Sidebar` content. It closes on Esc, backdrop click, the close button, and route change (`usePathname` effect). Focus returns to the **Menu** button (`data-testid="mobile-menu-button"`, `aria-expanded`, `aria-controls`) |
| `AccountMenu` | `{}` | Always-visible account block (not a hidden popover, so **Log out** stays one click away): avatar with initials (`aria-hidden`), `displayName(user)` (`data-testid="header-user"`), username and email in muted text, role badge (`data-testid="header-role"`), and a **Log out** `Button` (`data-testid="logout-button"`, "Signing out…" while pending). It keeps the SiteHeader error messages in an `Alert` with `role="alert"` |
| `MockBanner` | `{}` | Renders only when `MOCK_API_ENABLED`: an info bar, "Development data: some screens use the mock API (NEXT_PUBLIC_USE_MOCK_API=true).", `data-testid="mock-banner"`. It tells screenshot viewers that the data is fictional |
| `PageHeader` | `{ title: string; description?: ReactNode; actions?: ReactNode; breadcrumbs?: { href: string; label: string }[]; meta?: ReactNode }` | `h1`, optional breadcrumb `<nav aria-label="Breadcrumb">` (on detail pages, e.g. "Leave requests / #123"), description, and a right-aligned actions slot that wraps below on mobile. Long titles wrap (`overflow-wrap:anywhere`). It also sets `document.title` indirectly. Metadata `title` is exported by each `page.tsx` |

#### Actions and inputs

| Component | Props | Behaviour |
|---|---|---|
| `Button` | `ButtonHTMLAttributes & { variant?: "primary" \| "secondary" \| "ghost" \| "danger"; size?: "md" \| "sm"; loading?: boolean; loadingText?: string; fullWidth?: boolean; iconStart?: IconName }` | 44 px high (`sm` is 36 px, with the hit area padded to 44 px on touch). `loading` sets `disabled` and `aria-busy` and shows a spinner and `loadingText`. The label never disappears. Default `type="button"`. Pill-shaped, like the site's buttons. The primary variant is green, secondary is white with an input border, and danger is red |
| `ButtonLink` | `LinkProps & { variant; size }` | A `next/link` styled as a button, for navigation (for example "Apply for leave") |
| `IconButton` | `{ label: string; icon: IconName; ... }` | Square 44 px. `label` goes to `aria-label` and a tooltip-free visually-hidden text. Used for Menu, dialog close and toast dismiss |
| `Icon` | `{ name: IconName; size?: 16 \| 20 \| 24 }` | Inline SVG set (about 20 paths in `icons.tsx`), always `aria-hidden="true" focusable="false"` |
| `FormField` | `{ id: string; label: string; hint?: string; error?: string; required?: boolean; children: (a11y: { id; "aria-describedby"?; "aria-invalid"?; "aria-required"? }) => ReactNode }` | Renders `<label htmlFor>`, a "(required)" or "Optional" marker as text, the hint (`id-hint`), and `ErrorText` (`id-error`), and wires `aria-describedby` to hint and error. The error text starts with an icon **and** the word "Error:" for screen readers (visually hidden) |
| `ErrorText` | `{ id: string; children }` | `color: var(--color-danger)`, 14 px, warning icon. It is not `role="alert"`. The form-level `Alert` announces errors |
| `TextField` | `InputHTMLAttributes & { label; hint?; error?; }` | `FormField` + `<input>`. Invalid state has a red border **plus** an icon and the error text |
| `Select` | `SelectHTMLAttributes & { label; hint?; error?; options: { value: string; label: string; disabled?: boolean }[]; placeholder?: string }` | Native `<select>` with a custom chevron. The placeholder is shown as a disabled empty option |
| `DateField` | `TextField` props with `min?`/`max?` as `YYYY-MM-DD` | Native `<input type="date">`, with the accessible picker from the browser. The value is always ISO `YYYY-MM-DD`. The hint shows the expected format for browsers that fall back to text |
| `Textarea` | `TextareaHTMLAttributes & { label; hint?; error?; maxLength?: number; showCount?: boolean }` | Auto height (rows 4). The character counter "123 / 500" is linked via `aria-describedby` and announced politely only near the limit |
| `SearchField` | `TextField` + `{ onSearch(value: string): void; debounceMs?: 300 }` | `type="search"`, a search icon, and a clear button. The value is debounced before it updates the URL |

#### Feedback

| Component | Props | Behaviour |
|---|---|---|
| `Alert` | `{ variant: "info" \| "success" \| "warning" \| "error"; title?: string; children; action?: ReactNode; live?: "polite" \| "assertive" \| false }` | Icon, title and text on a tinted background with a left border. `error` uses `role="alert"`, and the others use `role="status"` when `live`. Used for form-level errors, 409 conflicts and inline success |
| `ToastProvider` / `useToast()` | `toast({ variant: "success" \| "error" \| "info"; message: string; durationMs?: 5000 })` | Mounted in the protected layout, so a toast survives `router.push`. Toasts sit in a fixed bottom-right stack (bottom-centre on mobile) inside an `aria-live="polite"` region. They auto-dismiss after 5 s, pause on hover/focus, and have a dismiss `IconButton`. **Never the only feedback** for errors: form errors are always inline too |
| `Skeleton` | `{ variant: "text" \| "rect" \| "circle"; width?; height?; lines?: number }` | Grey blocks with a shimmer (off under reduced motion), all `aria-hidden`. The parent container has `aria-busy="true"` and one visually-hidden `role="status"` "Loading …" |
| `PageSkeleton` / `TableSkeleton` / `CardGridSkeleton` | `{ rows?: number; columns?: number }` | Pre-built skeletons whose sizes match the final layout (no layout shift) |
| `EmptyState` | `{ icon?: IconName; title: string; description?: ReactNode; action?: ReactNode; tone?: "neutral" \| "info" \| "danger" }` | Centred block in a card. The title is an `h2` or `h3` (a `headingLevel` prop) |
| `LoadError` | `{ error: unknown; onRetry: () => void; what: string }` | Maps an error to a message: network → `NETWORK_ERROR_MESSAGE`; 5xx → "Could not load {what}. Please try again." (status codes are never shown; `data-status` keeps it for tests); `NotAvailableError` → renders `NotAvailableState` instead. Includes a **Try again** button |
| `NotAvailableState` | `{ feature: string; card?: string }` | Neutral `EmptyState`: "Nothing to show yet", no description. `feature` and `card` go only into `data-feature`/`data-card` for tests, never into visible text. `data-testid="not-available"`. Actions that hit a missing endpoint show `NOT_AVAILABLE_ACTION_MESSAGE`: "This can't be done right now. Please try again later." |
| `AccessDenied` | `{}` | `EmptyState` tone danger, lock icon, `h2` "Access denied", "You do not have permission to view this page.", **Back to dashboard** link. `role="alert"`, `data-testid="access-denied"` (unchanged) |
| `NotFoundPanel` | `{ what: string; backHref: string; backLabel: string }` | In-shell 404 (`data-testid="not-found"`) |

#### Data display

| Component | Props | Behaviour |
|---|---|---|
| `Card` | `{ title?: string; headingLevel?: 2 \| 3; actions?: ReactNode; children; padding?: "md" \| "lg" }` | White surface, 1 px border, `--radius-lg`, `--shadow-sm`. When it has a title it renders `<section aria-labelledby>` |
| `StatCard` | `{ label: string; value: number \| string; unit?: string; href?: string; tone?: StatusTone \| "neutral"; description?: string; testId?: string }` | Large tabular number with a label above. With `href` the whole card is one link (the accessible name is "{label}: {value}"). The tone sets only a pastel fill (yellow, mint, coral, grey; sky when neutral). The label carries the meaning |
| `BalanceCard` | `{ balance: Balance; leaveTypeName: string }` | Shows the leave type name and "{available} days available". Below, a `<dl>` with Allowance, Approved (used), Pending (reserved), Available, plus a stacked progress bar (approved / pending / available segments with a text legend; the bar is `aria-hidden` because the `<dl>` holds the data). If `allowance === 0`: "No allowance set for {year}. Contact your administrator." `data-testid="balance-card-{code}"` |
| `StatusBadge` | `{ status: RequestStatus } \| { active: boolean }` | Pill with icon and **text label** ("Pending", "Approved", "Rejected", "Cancelled" / "Active", "Inactive"). `data-testid="status-badge"`, `data-status={status}` |
| `ResponsiveTable<T>` | `{ caption: string; captionHidden?: boolean; columns: { key: string; header: string; cell: (row: T) => ReactNode; align?: "start" \| "end"; hideOnMobile?: boolean; primary?: boolean }[]; rows: T[]; rowKey: (row: T) => string \| number; loading?: boolean; empty?: ReactNode; testId?: string }` | ≥768 px: semantic `<table>` in a card, `<caption>` (can be visually hidden), `<th scope="col">`, zebra hover, numeric columns right-aligned. **<768 px:** the same DOM, but CSS turns each `<tr>` into a card (`display:block`). Each `<td>` shows its column header through `data-label` + `::before`, the `primary` column becomes the card title, and `hideOnMobile` columns are dropped. The wrapper uses `overflow-x:auto` only as a safety net. The first cell holds the row's link (e.g. "View" or "Review" with a visually-hidden "request #123"), so rows are **not** click handlers |
| `Pagination` | `{ page: number; pageSize: number; total: number; onPageChange: (page: number) => void; itemLabel?: string }` | `<nav aria-label="Pagination">`: "Showing 21–40 of 64 requests" (`aria-live="polite"`), Previous/Next buttons, and page number buttons with ellipsis (up to 7). The current page has `aria-current="page"`. On mobile only Previous, "Page 2 of 4" and Next. The page is stored in the URL (`?page=`). Focus moves to the table caption after a page change |
| `FilterBar` | `{ children; onApply?: () => void; onClear: () => void; activeCount: number; resultSummary?: string }` | `<form role="search" aria-label="Filter …">`. Controls wrap in a responsive grid. **Clear filters** (enabled when `activeCount > 0`). On mobile the controls collapse behind a "Filters (2)" disclosure button (`aria-expanded`). Selects apply immediately. Date and search inputs apply on change, debounced. Filters live in the URL, so Back/Forward and sharing work. A filter change resets `page` to 1 |
| `DescriptionList` | `{ items: { term: string; description: ReactNode }[]; columns?: 1 \| 2 }` | `<dl>` grid. It stacks under 480 px. Long values wrap |
| `RequestSummary` | `{ request: LeaveRequest; showEmployee?: boolean }` | Leave type, date range ("Mon 5 Oct 2026 – Wed 7 Oct 2026"), working days, submitted at, reason (`white-space: pre-wrap; overflow-wrap:anywhere`), status badge |
| `DecisionSummary` | `{ request: LeaveRequest }` | Pending: "Awaiting review". Approved/Rejected: reviewer name, decided at (Asia/Kolkata, "5 Oct 2026, 14:32 IST"), remarks (or "No remarks"). Cancelled: "Cancelled by you on …" |
| `BalanceImpact` | `{ balance: Balance; request: LeaveRequest }` | Review screen. The current balance for the request's type and year, and what each decision does: "Approve: {days} days move from Pending to Approved. Available stays {available}." "Reject: {days} days are released. Available becomes {available + days}." Warning `Alert` if `balance.available < 0` (data inconsistency; the backend will reject) |

#### Dialogs

| Component | Props | Behaviour |
|---|---|---|
| `Dialog` | `{ open: boolean; onClose: () => void; title: string; description?: ReactNode; children; footer?: ReactNode; variant?: "modal" \| "drawer"; initialFocusRef?: RefObject<HTMLElement>; closeOnBackdrop?: boolean; busy?: boolean }` | A native `<dialog>` opened with `showModal()`, which puts it in the top layer and makes the rest of the page **inert** (the focus trap). It has `aria-modal="true"`, `aria-labelledby` (title `h2`) and `aria-describedby`. **Esc** (`cancel` event) calls `onClose`. When `busy`, Esc and backdrop are ignored while a request is in flight. On open it saves `document.activeElement` and on close it **restores focus** to that trigger (even if the browser already does). Initial focus goes to `initialFocusRef`, else to the first focusable element. The body gets `overflow:hidden` while open. The close `IconButton` sits top-right |
| `ConfirmDialog` | `{ open; onClose; onConfirm: () => Promise<void> \| void; title; children; confirmLabel: string; cancelLabel?: string; tone?: "default" \| "danger"; pending?: boolean; error?: string \| null }` | For destructive actions, **initial focus goes to Cancel**. The confirm button shows a loading state. An `error` renders an `Alert` inside the dialog, which stays open |
| `DecisionDialog` | `{ open; decision: "approve" \| "reject"; request: LeaveRequest; onClose; onDone: (updated: LeaveRequest) => void }` | Built on `Dialog`. Remarks `Textarea` (max 500) gets initial focus. Reject: required ("Enter remarks explaining why the request is rejected."). Approve: optional. The server field error `remarks` maps to the field. 409 shows an `Alert` ("This request has already been processed" or "Not enough balance …") and a **Reload request** button |

**Tabs:** not needed. No page in the inventory has parallel views that benefit
from tabs. Filters and separate routes cover the use cases.

### 4.3 Formatting conventions

`src/lib/format.ts`:

- `formatDate("2026-10-05")` → "5 Oct 2026". Plain dates are formatted from
  `Date.UTC` with `timeZone: "UTC"`, so the date never shifts.
- `formatDateRange(start, end)` → "5 Oct – 7 Oct 2026", or "5 Oct 2026" if both are the same.
- `formatDateTime(iso)` → "5 Oct 2026, 14:32 IST" with `timeZone: "Asia/Kolkata"`.
- `formatDays(n)` → "1 day" or "3 days".
- `leaveTypeName(code)` from the loaded leave types, with fallbacks "Casual Leave" / "Sick Leave".
- `STATUS_LABELS: Record<RequestStatus, string>`.

---

## 5. Data model, service layer and mock layer

### 5.1 TypeScript types (`src/lib/services/types.ts`)

The wire format uses `snake_case`, the same as the existing `User` type in
`auth.ts`. No case conversion layer is needed.

```ts
export type ISODate = string;      // "YYYY-MM-DD" (calendar date, no time zone)
export type ISODateTime = string;  // ISO 8601 with offset, e.g. "2026-10-05T14:32:10+05:30"

export type LeaveTypeCode = "CASUAL" | "SICK";
export type LeaveType = { code: LeaveTypeCode; name: string };          // "Casual Leave", "Sick Leave"

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export const REQUEST_STATUSES: RequestStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

export type PersonRef = { id: number; full_name: string };

export type Employee = {
  id: number;                 // = Django User.id
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;          // server-built, "first last" or username
  email: string;              // unique (case-insensitive)
  department: string;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
};

export type EmployeeRef = Pick<Employee, "id" | "full_name" | "email" | "department" | "is_active">;

export type EmployeeCreateInput = {
  first_name: string; last_name: string; email: string; department: string;
  username: string; password: string;          // write-only, never returned
};
export type EmployeeUpdateInput = Partial<Pick<Employee, "first_name" | "last_name" | "email" | "department">>;

/** Allowance row as the admin sees it (balance included so limits can be shown). */
export type Allowance = {
  employee_id: number;
  year: number;
  leave_type: LeaveTypeCode;
  days: number;               // integer >= 0
  approved: number;           // used
  pending: number;            // reserved
  available: number;          // days - approved - pending
  minimum_allowed: number;    // approved + pending
  updated_at: ISODateTime | null;  // null = never set (days = 0)
};

export type Balance = {
  leave_type: LeaveTypeCode;
  year: number;
  allowance: number;
  approved: number;
  pending: number;
  available: number;          // allowance - approved - pending
};

export type LeaveRequest = {
  id: number;
  employee: EmployeeRef;
  leave_type: LeaveTypeCode;
  start_date: ISODate;
  end_date: ISODate;
  working_days: number;       // server-computed
  reason: string;
  status: RequestStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  reviewed_by: PersonRef | null;
  reviewed_at: ISODateTime | null;
  review_remarks: string;     // "" when none
  cancelled_at: ISODateTime | null;
};

/** Admin review payload: the request plus the employee's balances for the request's year. */
export type AdminLeaveRequestDetail = LeaveRequest & { balances: Balance[] };

export type LeaveRequestCreateInput = {
  leave_type: LeaveTypeCode; start_date: ISODate; end_date: ISODate; reason: string;
  client_request_id: string;  // UUID v4 generated per form instance (idempotency)
};

export type DecisionInput = { remarks: string };

export type StatusCounts = Record<RequestStatus, number> & { total: number };

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
};
export type AdminLeaveRequestPage = Paginated<LeaveRequest> & { counts: StatusCounts };

export type AdminSummary = {
  counts: StatusCounts;                // all requests
  pending_count: number;               // = counts.PENDING (for the nav badge)
  active_employee_count: number;
  recent_requests: LeaveRequest[];     // newest 8 by created_at
};

export type EmployeeListQuery = { q?: string; status?: "active" | "inactive" | "all"; page?: number; page_size?: number };
export type MyRequestQuery = { year?: number; status?: RequestStatus; page?: number; page_size?: number };
export type AdminRequestQuery = {
  employee?: number; status?: RequestStatus; leave_type?: LeaveTypeCode;
  date_from?: ISODate; date_to?: ISODate; page?: number; page_size?: number;
};
```

### 5.2 Service layer (`src/lib/services/`)

Pages **only** call services. Services call `request()` in `http.ts`, which
chooses between the real API, the mock, or "not available".

```ts
// src/lib/services/mock-flag.ts: statically imported, tiny, no mock code
export const MOCK_API_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

// src/lib/services/availability.ts
export type EndpointGroup =
  | "leaveTypes" | "myBalances" | "myRequests" | "cancelRequest"
  | "adminSummary" | "adminEmployees" | "adminAllowances" | "adminRequests" | "adminDecisions";
/** Flip to true in the card that ships the endpoint. The real API always wins when true. */
export const ENDPOINTS: Record<EndpointGroup, { available: boolean; card: string; feature: string }> = {
  leaveTypes:      { available: false, card: "ELM-003", feature: "Leave types" },
  adminEmployees:  { available: false, card: "ELM-003", feature: "Employee management" },
  adminAllowances: { available: false, card: "ELM-003", feature: "Allowance management" },
  myBalances:      { available: false, card: "ELM-006", feature: "Leave balances" },
  myRequests:      { available: false, card: "ELM-005/006", feature: "Leave requests" },
  cancelRequest:   { available: false, card: "ELM-008", feature: "Cancelling requests" },
  adminDecisions:  { available: false, card: "ELM-007", feature: "Approvals" },
  adminRequests:   { available: false, card: "ELM-009", feature: "All leave requests" },
  adminSummary:    { available: false, card: "ELM-009", feature: "Admin dashboard" },
};

// src/lib/services/errors.ts
export class NotAvailableError extends Error { constructor(readonly feature: string, readonly card: string) { super(`${feature} is not available yet.`); } }

// src/lib/services/http.ts
export async function request<T>(group: EndpointGroup, path: string, options: ApiFetchOptions = {}): Promise<T> {
  const entry = ENDPOINTS[group];
  if (!entry.available) {
    if (MOCK_API_ENABLED) {
      const { mockFetch } = await import("@/lib/mock");   // dead-code-eliminated in production
      return mockFetch<T>(path, options);
    }
    throw new NotAvailableError(entry.feature, entry.card);
  }
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    // Safety net: an "available" endpoint whose URL is not routed yet (Django 404
    // without a JSON {detail}) or 501 is shown as "not available", not a crash.
    if (error instanceof ApiError && (error.status === 501 || (error.status === 404 && error.detail === null))) {
      throw new NotAvailableError(entry.feature, entry.card);
    }
    throw error;
  }
}
```

Service modules and functions:

| Module | Functions |
|---|---|
| `leave-types.ts` | `listLeaveTypes()` |
| `balances.ts` | `getMyBalances(year)` |
| `leave-requests.ts` | `listMyRequests(q)`, `getMyRequest(id)`, `createLeaveRequest(input)`, `cancelLeaveRequest(id)`, `previewLeaveRequest(input)` (optional server preview) |
| `admin-access.ts` | `pingAdmin()` (always real: `GET /api/admin/ping/`) |
| `admin-summary.ts` | `getAdminSummary()` |
| `admin-employees.ts` | `listEmployees(q)`, `getEmployee(id)`, `createEmployee(input)`, `updateEmployee(id, input)`, `deactivateEmployee(id)`, `reactivateEmployee(id)`, `listEmployeeOptions()` (all, for selects: `page_size=100` loop) |
| `admin-allowances.ts` | `getAllowances(employeeId, year)`, `setAllowance(employeeId, year, leaveType, days)` |
| `admin-requests.ts` | `listAdminRequests(q)`, `getAdminRequest(id)`, `approveRequest(id, remarks)`, `rejectRequest(id, remarks)` |
| `query.ts` | `toQueryString(obj)` (drops empty values, stable key order) |

Data hook `src/lib/use-async.ts`:

```ts
type AsyncState<T> =
  | { status: "loading"; data: T | null }            // keeps previous data while reloading (no flicker on filter change)
  | { status: "success"; data: T }
  | { status: "error"; data: T | null; error: unknown }
  | { status: "not-available"; data: null; feature: string; card: string };
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[]): AsyncState<T> & { reload: () => void };
```

It aborts on dependency change or unmount and ignores stale results. A 401 is
already handled globally by `apiFetch` and `AuthProvider`. A 403 maps to
`AccessDenied` through the `LoadError` helper.

URL state hook `src/lib/use-url-state.ts`: `useUrlState(schema)` reads typed
filters from `useSearchParams()`. It validates values (an unknown status is
ignored, `page` is clamped to ≥1, the year to the range 2000–2100) and writes
with `router.replace(pathname + "?" + qs, { scroll: false })`.

### 5.3 Error handling conventions in the UI

| Response | UI |
|---|---|
| Network (`status 0`) | `NETWORK_ERROR_MESSAGE` + Try again |
| 400 field errors `{field: [msg]}` | Message under each field. The first invalid field gets focus. A form `Alert` says "Check the highlighted fields." |
| 400 `{detail}` or `non_field_errors` | Form-level `Alert` with the server text |
| 401 | Global: `AuthProvider` → `/login?next=…` (existing behaviour) |
| 403 `{detail}` | Page load: `AccessDenied`. Unsafe request with `detail` starting "CSRF Failed": "Your request was rejected for security reasons. Reload the page and try again." |
| 404 `{detail}` | `NotFoundPanel` |
| 404 without JSON / 501 | `NotAvailableState` |
| 409 `{detail}` | `Alert` (warning) with the server text + **Reload** |
| 429 | "Too many requests. Wait a minute and try again." |
| 5xx | "Something went wrong. Please try again." |

### 5.4 Mock layer

Location: `src/lib/mock/`. Rules:

1. **Development only.** Enabled only when `process.env.NODE_ENV !== "production"`
   **and** `NEXT_PUBLIC_USE_MOCK_API === "true"` (`MOCK_API_ENABLED`). The mock
   is reached only through `await import("@/lib/mock")` inside that condition.
   In `next build`, `NODE_ENV` is inlined as `"production"`, so the branch and
   the chunk are removed. Check: after `npm run build`,
   `grep -rl "MOCK_SEED_SENTINEL_ELM" .next/static` finds nothing (the seed file
   exports that constant). `next.config.ts` prints a warning when the flag is
   `true` during a production build ("ignored in production builds").
2. **Real auth only.** Login, logout, `/me`, CSRF and `/api/admin/ping/` are
   never mocked. There is **no role switching**. The role always comes from the
   real session.
3. **Per endpoint group.** Only groups with `available: false` go to the mock.
   When a backend card ships, it flips its flag and the screen uses the real
   API, even with the mock flag on.
4. **Same contract.** Mock handlers use the paths, status codes and error
   shapes of [§6](#6-proposed-api-contracts). They throw the same `ApiError`
   (`new ApiError(400, null, { start_date: ["…"] })`), so UI error paths are
   exercised.
5. **Current user.** Handlers need to know who is calling. `mockFetch` calls
   the real `fetchMe()` (cached for 30 s) and applies the role rules:
   `/api/me/*` and `/api/leave-requests/*` need EMPLOYEE, and
   `/api/admin/*` needs ADMIN. Otherwise it returns 403 `{detail}`. On first
   use by an employee, the store adds that real user as an `Employee` (their
   real id, names and email; department "Engineering"), with allowances for
   the current year (Casual 12, Sick 10) and the previous year, and about 26
   generated requests. This gives their history two pages. Admin decisions
   record the real admin as `reviewed_by`.
6. **State** is kept in memory at module level. It survives client-side
   navigation and resets on a full reload. Business rules are applied with the
   same helpers as the UI preview (`src/lib/dates.ts`) plus the balance and
   overlap rules in `mock/rules.ts`. So submit, cancel, approve and reject
   change balances realistically (reserve on submit, convert on approve,
   release on reject or cancel, 409 on non-pending).
7. **Latency and scenarios for demonstrating states** (dev only, read from
   `localStorage["elm-mock"]`, a JSON object, in `try/catch`):
   `{ "latencyMs": 400, "scenario": "normal" | "empty" | "error" | "slow" }`.
   `empty` returns empty lists, zero allowances and zero counts. `error`
   returns 500 for GETs. `slow` uses a 3 s latency. The default is 250–600 ms
   of random latency. This is how the empty, error and loading screenshots are
   produced.

Files:

```
src/lib/mock/
  index.ts        export { mockFetch }; export const MOCK_SEED_SENTINEL_ELM = "…";
  router.ts       match(method, path) → handler; parses query and body; 404 {detail:"Not found."} for unknown ids; 405 otherwise
  store.ts        in-memory tables: employees, allowances, requests; nextId counters; ensureEmployeeForUser(user)
  seed.ts         fixed employees, hand-written requests, deterministic generator (mulberry32(20260923))
  rules.ts        validateCreate(), computeBalance(), overlaps(), paginate(), filterAdminRequests(), counts()
  prng.ts         mulberry32
  handlers/
    employee.ts   /api/leave-types/, /api/me/balances/, /api/leave-requests/**
    admin.ts      /api/admin/summary/, /api/admin/employees/**, /api/admin/leave-requests/**
```

### 5.5 Mock-to-contract coverage

Every endpoint in [§6](#6-proposed-api-contracts) has a mock handler except
`GET /api/health/`, `/api/auth/*` and `/api/admin/ping/`, which are real.

### 5.6 Seed data

All names, emails and reasons are **fictional**. Emails use `example.com`.
Relative dates are computed from Kolkata "today" when the store is created, so
the data always has future pending requests.

```ts
export const SEED_DEPARTMENTS = [
  "Engineering", "Human Resources", "Finance & Accounts", "Customer Success",
  "Research and Development — Applied Machine Learning Platform Group", // long
  "Operations",
];

export const SEED_EMPLOYEES: Omit<Employee, "created_at" | "updated_at" | "full_name">[] = [
  { id: 1001, username: "aarav.sharma",  first_name: "Aarav",  last_name: "Sharma",  email: "aarav.sharma@example.com",  department: "Engineering", is_active: true },
  { id: 1002, username: "venkata.chakravarthy", first_name: "Venkata Satya Narayana Subrahmanyam", last_name: "Chakravarthy-Ramachandran", email: "venkata.satyanarayana.subrahmanyam.chakravarthy@example.com", department: "Research and Development — Applied Machine Learning Platform Group", is_active: true },
  { id: 1003, username: "priya.nair",    first_name: "Priya",  last_name: "Nair",    email: "priya.nair@example.com",    department: "Human Resources", is_active: true },
  { id: 1004, username: "annemarie.fitzgerald", first_name: "Anne-Marie", last_name: "Fitzgerald-O'Sullivan", email: "anne-marie.fitzgerald-osullivan@example.com", department: "Customer Success", is_active: true },
  { id: 1005, username: "rohan.mehta",   first_name: "Rohan",  last_name: "Mehta",   email: "rohan.mehta@example.com",   department: "Finance & Accounts", is_active: true },
  { id: 1006, username: "fatima.khan",   first_name: "Fatima", last_name: "Khan",    email: "fatima.khan@example.com",   department: "Operations", is_active: true },
  { id: 1007, username: "karthik.iyer",  first_name: "Karthik", last_name: "Iyer",   email: "karthik.iyer@example.com",  department: "Engineering", is_active: true },
  { id: 1008, username: "meera.krishnan", first_name: "Meera", last_name: "Krishnan", email: "meera.krishnan@example.com", department: "Engineering", is_active: true },
  { id: 1009, username: "daniel.okafor", first_name: "Daniel", last_name: "Okafor",  email: "daniel.okafor@example.com", department: "Customer Success", is_active: true },
  { id: 1010, username: "sneha.patil",   first_name: "Sneha",  last_name: "Patil",   email: "sneha.patil@example.com",   department: "Finance & Accounts", is_active: true },
  { id: 1011, username: "arjun.reddy",   first_name: "Arjun",  last_name: "Reddy",   email: "arjun.reddy@example.com",   department: "Operations", is_active: false }, // inactive, history kept
  { id: 1012, username: "lakshmi.venkataraman", first_name: "Lakshmi", last_name: "Venkataraman", email: "lakshmi.venkataraman@example.com", department: "Human Resources", is_active: false },
];

// Allowances: every employee, previous and current year. Casual 12, Sick 10,
// except 1005 (Casual 8), 1006 (Sick 0: shows "No allowance set"), and
// 1009 in the current year: Casual 3 with 2 approved + 1 pending (available 0,
// for testing "not below approved + reserved").

export const SEED_LONG_REASON =
  "Attending my cousin's wedding in Thiruvananthapuram, followed by the traditional post-wedding family " +
  "ceremonies over the weekend. Travel involves an overnight train each way, so I will be unreachable on " +
  "the travel days. My pending code reviews are reassigned to Karthik and the release checklist is updated " +
  "in the team tracker. Contactable by phone for anything urgent."; // ~390 chars; seeds use up to 500 (the create limit)

export const SEED_REQUESTS_HANDWRITTEN = [
  // (relative to today T, working-day aligned by the generator helper nextWorkingDay())
  { employee: 1002, leave_type: "CASUAL", start: "+7wd", days: 3, status: "PENDING",  reason: SEED_LONG_REASON },
  { employee: 1004, leave_type: "SICK",   start: "-20wd", days: 2, status: "APPROVED", reason: "Fever and doctor-advised rest.", review_remarks: "Get well soon. No medical certificate needed for two days." },
  { employee: 1003, leave_type: "CASUAL", start: "+15wd", days: 5, status: "REJECTED", reason: "Family vacation.", review_remarks: "Quarter-end payroll closing falls in this week and two other HR team members are already on approved leave. Please choose dates after the 15th; happy to approve those promptly." },
  { employee: 1007, leave_type: "CASUAL", start: "+3wd", days: 1, status: "CANCELLED", reason: "Bank appointment (rescheduled)." },
  { employee: 1009, leave_type: "CASUAL", start: "+2wd", days: 1, status: "PENDING", reason: "Personal errand." },
  { employee: 1011, leave_type: "SICK",   start: "-60wd", days: 3, status: "APPROVED", reason: "Surgery recovery.", review_remarks: "" },
];
```

**Generator** (`seed.ts`). It is deterministic, so screenshots and pages are stable:

- For each active employee 1001–1010, plus the signed-in employee: build a
  timeline from 1 January of the previous year to today + 90 days. Pick
  non-overlapping ranges of 1–5 working days, with a start on a weekday and a
  gap of at least 3 working days. Ranges never cross 31 December.
- Status by date: past ranges → Approved 70 %, Rejected 15 %, Cancelled 15 %.
  Future ranges → Pending 50 %, Approved 30 %, Rejected 10 %, Cancelled 10 %.
- A range is kept only if approved + pending stay within that year's allowance
  for the type (the invariant `available ≥ 0`). Otherwise it becomes Rejected
  with the remark "Insufficient balance at the time of review."
- Reasons rotate through 15 short templates ("Doctor's appointment",
  "Child's school annual day", …) and 3 long ones (300–480 characters).
  Every 7th request gets a long remark.
- `created_at` is the start date minus 3–20 days (clamped to ≤ now), at 09:00–18:00 IST.
  Decided requests get `reviewed_by = { id: 900, full_name: "Neha Deshpande (HR Admin)" }`,
  and `reviewed_at` is `created_at` + 1–2 days.
- The generator is tuned for **≥ 80 requests across all employees** (target
  96, with 60+ in the current year) and **~26 requests for the signed-in employee**.
  This covers admin pagination (20 per page → 5 pages) and history pagination.
- When the store is created (dev only), `console.assert` checks that no
  Pending/Approved overlap exists per employee and that every balance is ≥ 0.

---

## 6. Proposed API contracts

These are for the backend cards to implement. Conventions follow ELM-002:

- Base path `/api/`. JSON only. Django **session auth** with credentials. Every
  unsafe method (POST/PUT/PATCH/DELETE) needs the `X-CSRFToken` header from
  `GET /api/auth/csrf/`.
- **401** = not signed in, session gone or account inactive (`WWW-Authenticate: Session`).
  **403** = signed in but the wrong role (`{detail: "Administrator role required."}`
  / `{detail: "Employee role required."}`), or a CSRF failure (`detail` starts with "CSRF Failed").
- Errors: `{"detail": "…"}` for general errors. **400 validation** uses DRF's
  shape `{"field": ["message", …], "non_field_errors": ["…"]}`. The frontend
  (`toApiError`) maps `non_field_errors` to the form-level message. Nested
  objects are **not** used in error bodies, because `toApiError` reads only
  string arrays.
- **404** `{"detail": "Not found."}` for missing records **and for records the
  caller may not see** (an employee reading another employee's request), so
  existence does not leak.
- **409** `{"detail": "…"}` for state conflicts (not Pending any more, the
  balance changed at decision time).
- Dates are `YYYY-MM-DD`. Datetimes are ISO 8601 in Asia/Kolkata (`+05:30`).
  Day counts are integers. Leave type codes are `CASUAL`/`SICK`. Status codes
  are upper case.
- Pagination: `?page=` (1-based) and `?page_size=` (default 20, max 100).
  Response: `{count, next, previous, page, page_size, total_pages, results}`.
  An out-of-range page gives 404 `{detail: "Invalid page."}` (DRF default);
  the UI then resets to page 1.
- Permissions: employee endpoints use `IsAuthenticated` + `IsEmployeeRole`,
  and admin endpoints use `IsAdminRole` (existing class). Both require `is_active`.

### 6.1 Shared: leave types (ELM-003/004)

| Method + path | Permission | Response |
|---|---|---|
| `GET /api/leave-types/` | Any authenticated | `200 [{ "code": "CASUAL", "name": "Casual Leave" }, { "code": "SICK", "name": "Sick Leave" }]` |

### 6.2 ELM-003: employees and allowances (admin)

| Method + path | Request | Success | Errors |
|---|---|---|---|
| `GET /api/admin/employees/` | Query: `q` (matches name, email, username or department; case-insensitive contains), `status` = `active`\|`inactive`\|`all` (default `all`), `ordering` = `name` (default) \| `-created_at`, `page`, `page_size` | `200 Paginated<Employee>` | 401, 403 |
| `POST /api/admin/employees/` | `EmployeeCreateInput` | `201 Employee` (never contains the password). Creates a `User` + `Profile(role=EMPLOYEE, department)` and runs Django password validators | 400 e.g. `{"email": ["An employee with this email already exists."]}`, `{"username": ["A user with that username already exists."]}`, `{"password": ["This password is too short. It must contain at least 8 characters."]}`, `{"department": ["This field may not be blank."]}`. 401, 403 |
| `GET /api/admin/employees/{id}/` | – | `200 Employee` | 404 (also for admin accounts: only role EMPLOYEE is listed and managed), 401, 403 |
| `PATCH /api/admin/employees/{id}/` | `EmployeeUpdateInput` (role, username, password and `is_active` are read-only here) | `200 Employee` | 400 (duplicate email, blank fields), 404, 401, 403 |
| `POST /api/admin/employees/{id}/deactivate/` | `{}` | `200 Employee` (`is_active: false`). Idempotent. Sessions of that user are invalidated (the existing 401 behaviour for inactive users). Leave history is kept. **Pending requests stay Pending** and can still be decided (see [§9](#9-known-limitations-assumptions-and-open-questions)) | 404, 401, 403 |
| `POST /api/admin/employees/{id}/reactivate/` | `{}` | `200 Employee` (`is_active: true`). Idempotent | 404, 401, 403 |
| `GET /api/admin/employees/{id}/allowances/?year=2026` | `year` required (2000–2100) | `200 { "employee_id": 1001, "year": 2026, "allowances": Allowance[] }`, one row per leave type (a row not set yet has `days: 0`, `updated_at: null`) | 400 `{"year": ["Enter a valid year."]}`, 404, 401, 403 |
| `PUT /api/admin/employees/{id}/allowances/{year}/{leave_type}/` | `{ "days": 12 }` (integer) | `200 Allowance` (upsert). Runs in a transaction that locks the employee's balance rows | 400 `{"days": ["Ensure this value is greater than or equal to 0."]}`, `{"days": ["Allowance cannot be less than approved plus pending leave (7 days)."]}`, `{"days": ["A valid integer is required."]}`. 404 (employee or leave type). 401, 403 |

Employees have **no** endpoints to change their role, allowance or profile
(ELM-003 acceptance).

### 6.3 ELM-006: employee balances and history

| Method + path | Request | Success | Errors |
|---|---|---|---|
| `GET /api/me/balances/?year=2026` | `year` optional (default: current Asia/Kolkata year) | `200 { "year": 2026, "balances": Balance[] }`, one per leave type, always both | 400 bad year, 401, 403 (admin) |
| `GET /api/leave-requests/` | Query: `year` (requests whose `start_date` is in that year; requests never span years), `status`, `page`, `page_size`. Ordered `-created_at`, `-id`. **Only the caller's own requests** | `200 Paginated<LeaveRequest>` | 400 invalid `status`/`year` (`{"status": ["Select a valid choice."]}`), 401, 403 |
| `GET /api/leave-requests/{id}/` | – | `200 LeaveRequest` (includes `review_remarks`, `reviewed_by`, `reviewed_at`) | **404 if not the caller's** request, 401, 403 |

### 6.4 ELM-005: submit a request (rules from ELM-004)

| Method + path | Request | Success | Errors |
|---|---|---|---|
| `POST /api/leave-requests/` | `LeaveRequestCreateInput`. `reason`: required, trimmed, 1–500 characters. The employee is always `request.user`. Any `employee` field is ignored | `201 LeaveRequest` (`status: "PENDING"`, `working_days` computed by the server, balance reserved). **Idempotency:** the same `client_request_id` from the same user within 24 h returns `200` with the original request, and nothing new is created | 400 examples: `{"leave_type": ["Select a valid choice."]}`; `{"start_date": ["Start date cannot be in the past."]}`; `{"end_date": ["End date must be on or after the start date."]}`; `{"non_field_errors": ["Leave cannot span two calendar years. Submit a separate request for each year."]}`; `{"non_field_errors": ["The selected dates contain no working days (Monday to Friday)."]}`; `{"non_field_errors": ["These dates overlap your pending or approved request #123 (5 Oct – 7 Oct 2026)."]}`; `{"non_field_errors": ["Not enough Casual Leave: 3 working days requested, 2 available."]}`; `{"reason": ["This field may not be blank."]}`. 401, 403 (admin) |
| `GET /api/leave-requests/preview/?leave_type=CASUAL&start_date=…&end_date=…` *(optional)* | Same validation as create, without saving | `200 { "working_days": 3, "balance": Balance, "valid": true }` or `200 { "working_days": 0, "valid": false, "errors": { … same shape as 400 … } }` | 401, 403 |

The preview endpoint is optional. The UI works with the client-side preview
([§7](#7-working-day-preview-algorithm)) and uses the server preview if
`ENDPOINTS.myRequests.available` and the endpoint exists. Either way, the
create response is the final word.

### 6.5 ELM-008: cancel a pending request

| Method + path | Request | Success | Errors |
|---|---|---|---|
| `POST /api/leave-requests/{id}/cancel/` | `{}` | `200 LeaveRequest` (`status: "CANCELLED"`, `cancelled_at` set, reservation released). Uses `select_for_update` on the request, so a concurrent approve and cancel resolve to exactly one outcome | 409 `{"detail": "Only pending requests can be cancelled. This request is Approved."}` (also for a repeated cancel: the balance is not released twice), 404 (not the caller's), 401, 403 |

### 6.6 ELM-007: admin review and decisions

| Method + path | Request | Success | Errors |
|---|---|---|---|
| `GET /api/admin/leave-requests/{id}/` | – | `200 AdminLeaveRequestDetail` (`balances` for the request's year, all leave types) | 404, 401, 403 |
| `POST /api/admin/leave-requests/{id}/approve/` | `{ "remarks": "" }` (optional, ≤500) | `200 LeaveRequest` (`APPROVED`, `reviewed_by` = the caller, `reviewed_at` = now). Transactional recheck: status still `PENDING`, and allowance ≥ approved + pending | 409 `{"detail": "This request has already been processed (Rejected)."}`; 409 `{"detail": "Approval would exceed the Casual Leave allowance for 2026 (12 days)."}`; 400 `{"remarks": ["Ensure this field has no more than 500 characters."]}`; 404, 401, 403 |
| `POST /api/admin/leave-requests/{id}/reject/` | `{ "remarks": "…" }` (**required**, trimmed, 1–500) | `200 LeaveRequest` (`REJECTED`, reviewer, time, remarks; reservation released) | 400 `{"remarks": ["Remarks are required when rejecting a request."]}`; 409 already processed; 404, 401, 403 |

### 6.7 ELM-009: admin dashboard and filters

| Method + path | Request | Success | Errors |
|---|---|---|---|
| `GET /api/admin/summary/` | – | `200 AdminSummary` | 401, 403 |
| `GET /api/admin/leave-requests/` | Query: `employee` (id), `status`, `leave_type`, `date_from`, `date_to` (inclusive; a request matches when `start_date <= date_to AND end_date >= date_from`; either bound may be omitted), `page`, `page_size`. Ordered **newest first** (`-created_at`, `-id`). Includes inactive employees' requests | `200 AdminLeaveRequestPage`: the page plus `counts` = status counts for **all filters except `status`**, so the count chips show the breakdown the status filter chooses from. `counts.total` is the sum | 400 `{"date_to": ["End of range must be on or after the start."]}`, `{"employee": ["Select a valid choice."]}`, 401, 403 |

---

## 7. Working-day preview algorithm

File: `src/lib/dates.ts`. These are pure functions with no dependencies. The
mock reuses them, and they are the reference for the backend tests. **The
backend is authoritative.** The preview only guides the user, and the server
response (`working_days` and 400 errors) always wins.

```ts
export const APP_TIME_ZONE = "Asia/Kolkata";

/** Today's calendar date in Asia/Kolkata as "YYYY-MM-DD", regardless of the browser's zone. */
export function todayInAppZone(now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

/** Strict parse of "YYYY-MM-DD" to a UTC-midnight Date (no local-zone or DST effects). */
export function parseISODate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? date : null; // rejects 2026-02-30
}

const DAY_MS = 86_400_000;

/** Mon–Fri days in [start, end], inclusive. O(1). Returns 0 if end < start. */
export function countWorkingDays(start: Date, end: Date): number {
  const total = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (total <= 0) return 0;
  const fullWeeks = Math.floor(total / 7);
  let count = fullWeeks * 5;
  const startDow = start.getUTCDay();               // 0 = Sun … 6 = Sat
  for (let i = 0; i < total % 7; i++) {
    const dow = (startDow + i) % 7;
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export type PreviewIssue =
  | "start-missing" | "end-missing" | "start-invalid" | "end-invalid"
  | "start-in-past" | "end-before-start" | "spans-years" | "no-working-days" | "exceeds-balance";

export type LeavePreview = {
  workingDays: number;          // 0 when invalid
  calendarDays: number;
  weekendDays: number;
  issues: { field: "start_date" | "end_date" | "form"; code: PreviewIssue; message: string }[];
  availableAfter: number | null; // available - workingDays, when a balance is known
};

export function previewLeave(input: {
  start: string; end: string; available?: number | null; leaveTypeName?: string; today?: ISODate;
}): LeavePreview;
```

`previewLeave` steps, stopping at the first issue for each field:

1. `start` is empty → "Choose a start date." `start` fails `parseISODate` → "Enter a valid start date." The same for `end`.
2. `start < today` (string comparison of ISO dates is valid) → start_date: "Start date cannot be in the past."
3. `end < start` → end_date: "End date must be on or after the start date."
4. `start.year !== end.year` → form: "Leave cannot span two calendar years. Submit a separate request for each year."
5. `workingDays = countWorkingDays(start, end)`. If it is 0 → form: "The selected dates contain no working days (Monday to Friday)."
6. If `available` is known and `workingDays > available` → form (`exceeds-balance`): "Not enough {type}: {n} working days requested, {available} available."
7. Otherwise the preview is valid. `weekendDays = calendarDays - workingDays`.

UI (`WorkingDayPreview`, inside a `role="status" aria-live="polite"` region that
updates on each date change):

- Valid: **"3 working days"**, "Mon 5 Oct – Fri 9 Oct 2026 · 2 weekend days not counted",
  "Casual Leave after this request: 5 of 12 days available".
- Invalid: the messages above, next to their fields (`start_date`/`end_date`)
  or in the preview (`form`).
- Before both dates are chosen: "Choose start and end dates to see how many working days this uses."
- Date inputs set `min={today}`. After a start is chosen, the end input gets
  `min={start}` and `max={start's year}-12-31`. These are hints only; the
  validation above still runs.
- Submit is blocked while client issues exist. Overlap is **not** checked on
  the client (it would need full history). The server's 400 is shown in the
  form `Alert`.
- "Today" is taken again on each validation, so a form left open past midnight
  IST stays correct. The Kolkata date is shown once under the start field:
  "Dates use India Standard Time (today is 23 Sep 2026)."

Reference cases (for manual checks and later unit tests):

| Start | End | Expected |
|---|---|---|
| Fri 2026-09-25 | Fri 2026-09-25 | 1 working day |
| Sat 2026-09-26 | Sun 2026-09-27 | 0 → "no working days" |
| Fri 2026-09-25 | Mon 2026-09-28 | 2 (weekend days 2) |
| Mon 2026-09-28 | Sun 2026-10-11 | 10 |
| Thu 2026-12-31 | Fri 2027-01-01 | spans years |
| 2026-09-22 (today is 09-23 IST) | – | start in past |
| 2026-10-05 | 2026-10-02 | end before start |
| 2026-02-30 | – | invalid date |
| Browser in America/Los_Angeles at 2026-09-23 20:00 PDT (= 09-24 08:30 IST) | – | today is **2026-09-24** |

---

## 8. Implementation plan

Rules for every phase:

- Keep the ELM-002 behaviour table ([2.4](#24-elm-002-behaviours-that-must-keep-working)) passing.
- No new dependencies.
- Only token variables in CSS: no raw hex outside `tokens.css`, which is
  checked with `grep -rnE "#[0-9a-fA-F]{3,6}\b" src --include=*.module.css`.
- Commit inside `frontend/` only.

**Checks for each phase** (all must be run and reported with real results):

1. `npm run lint`
2. `npx next typegen && npx tsc --noEmit`
3. `npm run build` (with `NEXT_PUBLIC_USE_MOCK_API` unset **and** with it set
   to `true`, to confirm the warning appears and the mock stays excluded), then
   `grep -rl "MOCK_SEED_SENTINEL_ELM" .next/static` finds nothing.
4. Manual browser checks at 375, 768 and 1280 px, against the real backend,
   both with the mock off (NA states) and with the mock on
   (`NEXT_PUBLIC_USE_MOCK_API=true npm run dev`).
5. Keyboard-only pass: Tab order, visible focus, dialogs (Esc, focus
   containment, focus return), drawer.
6. The ELM-002 regression steps from the README checklist.
7. Screenshots (desktop and mobile) of the main pages for the card.

### Phase A: foundation

Create:

```
src/styles/tokens.css
src/components/ui/icons.tsx
src/components/ui/button.tsx                 + button.module.css           (Button, ButtonLink)
src/components/ui/icon-button.tsx            + icon-button.module.css
src/components/ui/form-field.tsx             + form-field.module.css       (FormField, ErrorText)
src/components/ui/text-field.tsx             (TextField, SearchField)
src/components/ui/select.tsx
src/components/ui/date-field.tsx
src/components/ui/textarea.tsx
src/components/ui/alert.tsx                  + alert.module.css
src/components/ui/toast.tsx                  + toast.module.css            (ToastProvider, useToast)
src/components/ui/card.tsx                   + card.module.css             (Card, StatCard, DescriptionList)
src/components/ui/status-badge.tsx           + status-badge.module.css
src/components/ui/responsive-table.tsx       + responsive-table.module.css
src/components/ui/pagination.tsx             + pagination.module.css
src/components/ui/filter-bar.tsx             + filter-bar.module.css
src/components/ui/empty-state.tsx            + empty-state.module.css
src/components/ui/skeleton.tsx               + skeleton.module.css         (Skeleton, PageSkeleton, TableSkeleton, CardGridSkeleton)
src/components/ui/dialog.tsx                 + dialog.module.css           (Dialog, ConfirmDialog)
src/components/ui/page-header.tsx            + page-header.module.css
src/components/ui/visually-hidden.tsx
src/components/layout/app-shell.tsx          + app-shell.module.css
src/components/layout/sidebar.tsx            (Sidebar, NavLink)
src/components/layout/mobile-nav.tsx
src/components/layout/account-menu.tsx
src/components/layout/mock-banner.tsx
src/components/layout/nav-config.ts
src/components/layout/use-media-query.ts
src/components/states/access-denied.tsx
src/components/states/not-found-panel.tsx
src/components/states/not-available-state.tsx
src/components/states/load-error.tsx
src/app/not-found.tsx                        + not-found.module.css
src/app/(protected)/error.tsx
src/app/login/login.module.css
src/lib/dates.ts
src/lib/format.ts
src/lib/use-async.ts
src/lib/use-url-state.ts
src/lib/services/types.ts
src/lib/services/mock-flag.ts
src/lib/services/availability.ts
src/lib/services/errors.ts
src/lib/services/http.ts
src/lib/services/query.ts
src/lib/services/leave-types.ts
src/lib/services/balances.ts
src/lib/services/leave-requests.ts
src/lib/services/admin-access.ts
src/lib/services/admin-summary.ts
src/lib/services/admin-employees.ts
src/lib/services/admin-allowances.ts
src/lib/services/admin-requests.ts
src/lib/mock/index.ts
src/lib/mock/router.ts
src/lib/mock/store.ts
src/lib/mock/seed.ts
src/lib/mock/rules.ts
src/lib/mock/prng.ts
src/lib/mock/handlers/employee.ts
src/lib/mock/handlers/admin.ts
```

Change:

```
src/app/layout.tsx                    import tokens.css before globals.css
src/app/globals.css                   base styles on tokens; remove dark scheme; color-scheme: light; focus-visible default; reduced motion
src/app/(protected)/layout.tsx        RequireAuth > ToastProvider > AppShell
src/components/require-auth.tsx       states use Skeleton/Alert/Button; re-export AccessDenied from states/
src/app/login/page.tsx                centred Card with brand; same Suspense
src/app/login/login-form.tsx          TextField/Button/Alert; logic, messages and test IDs unchanged
src/app/(protected)/dashboard/dashboard-summary.tsx   interim restyle (Card, PageHeader with current-user/current-role)
src/app/(protected)/admin/admin-panel.tsx             interim restyle (Card, Alert); texts and test ID unchanged
next.config.ts                        warn when NEXT_PUBLIC_USE_MOCK_API=true in a production build
.env.example                          add NEXT_PUBLIC_USE_MOCK_API=false with comment
README.md                             routes, mock mode, scenarios, checks
```

Delete: `src/components/site-header.tsx` and `src/app/auth.module.css` (once
nothing imports them).

Phase A checks (in addition to the common ones):

- The shell renders for both roles.
- Drawer at 375 px: opens with Menu, Esc closes it, focus returns to Menu, and
  Tab stays inside.
- `/does-not-exist` shows the not-found card.
- Employee on `/admin` gets `access-denied`.
- Admin on `/admin` sees the dashboard with no access message (the server check passed silently).
- Logout → `/login`, then `/dashboard` → `/login?next=%2Fdashboard`.
- `/login?next=//evil.example` → `/dashboard`.
- A temporary dev check in the console: `todayInAppZone` and the §7 reference
  cases give the expected values.

### Phase B: employee pages

Create:

```
src/app/(protected)/dashboard/dashboard-router.tsx
src/app/(protected)/dashboard/employee-dashboard.tsx     + dashboard.module.css
src/app/(protected)/leave/layout.tsx
src/app/(protected)/leave/page.tsx
src/app/(protected)/leave/leave-history-view.tsx
src/app/(protected)/leave/apply/page.tsx
src/app/(protected)/leave/apply/apply-leave-form.tsx      + apply.module.css
src/app/(protected)/leave/[id]/page.tsx
src/app/(protected)/leave/[id]/leave-request-view.tsx
src/app/(protected)/leave/[id]/cancel-request-dialog.tsx
src/components/leave/balance-card.tsx                     + balance-card.module.css
src/components/leave/working-day-preview.tsx              + working-day-preview.module.css
src/components/leave/leave-request-table.tsx
src/components/leave/request-summary.tsx                  (RequestSummary, DecisionSummary)
src/components/leave/year-options.ts                      (current−3 … current+1)
```

Change: `src/app/(protected)/dashboard/page.tsx` (render `DashboardRouter`
inside Suspense). Delete: `dashboard-summary.tsx`.

Test IDs: `balance-card-CASUAL`, `balance-card-SICK`, `recent-requests`,
`leave-apply-form`, `working-day-preview`, `leave-history-table`,
`request-status`, `cancel-request-button`, `confirm-dialog`, `pagination`.

Phase B checks:

- Mock on (employee): balances add up (allowance − approved − pending =
  available).
- Submit a request: the preview matches the server `working_days`, the
  button is disabled while pending, and a double-click creates one request.
  You land on the details page with a toast, and the balance card shows the
  new pending days.
- Each validation message from §7 appears, and the server 400 overlap message
  shows in the form alert.
- History filters (year, status) update the URL and survive Back. Empty and
  no-results states show. Pagination works on page 2.
- Cancel: the button shows only for Pending. The dialog puts focus on "Keep
  request", Esc closes it and focus returns. Confirming gives Cancelled and
  the balance is released. A second cancel (open two tabs) shows the 409 alert.
- Mock off: every page shows NA without crashing.
- `/leave/999999` and `/leave/abc` show the not-found panel.
- An admin on `/leave` sees access denied, and an admin on `/dashboard` goes to `/admin`.

### Phase C: admin pages

Create:

```
src/app/(protected)/admin/layout.tsx
src/app/(protected)/admin/admin-dashboard.tsx             + admin.module.css
src/app/(protected)/admin/admin-access-check.tsx          (from admin-panel.tsx)
src/app/(protected)/admin/employees/page.tsx
src/app/(protected)/admin/employees/employee-list-view.tsx
src/app/(protected)/admin/employees/new/page.tsx
src/app/(protected)/admin/employees/new/create-employee-view.tsx
src/app/(protected)/admin/employees/[id]/page.tsx
src/app/(protected)/admin/employees/[id]/edit-employee-view.tsx
src/app/(protected)/admin/allowances/page.tsx
src/app/(protected)/admin/allowances/allowance-manager.tsx
src/app/(protected)/admin/requests/page.tsx
src/app/(protected)/admin/requests/admin-requests-view.tsx
src/app/(protected)/admin/requests/[id]/page.tsx
src/app/(protected)/admin/requests/[id]/review-request-view.tsx
src/app/(protected)/admin/requests/[id]/decision-dialog.tsx
src/components/admin/employee-form.tsx                    + employee-form.module.css
src/components/admin/status-counts.tsx
src/components/admin/admin-request-table.tsx
src/components/admin/allowance-table.tsx                  + allowance-table.module.css
src/components/admin/balance-impact.tsx
src/components/admin/employee-select.tsx                  (loads listEmployeeOptions; "(inactive)" suffix)
```

Change: `src/app/(protected)/admin/page.tsx` (no `RequireRole`, because the
layout has it; renders `AdminDashboard`). Delete: `admin-panel.tsx`.

Test IDs: `admin-ping-status` (kept), `stat-PENDING`, `stat-APPROVED`,
`stat-REJECTED`, `stat-CANCELLED`, `stat-employees`, `employee-table`,
`employee-form`, `deactivate-button`, `reactivate-button`,
`allowance-row-CASUAL`, `allowance-row-SICK`, `admin-request-filters`,
`admin-request-table`, `approve-button`, `reject-button`, `decision-dialog`,
`decision-remarks`, `balance-impact`.

Phase C checks:

- Mock on (admin): dashboard counts and recent requests link to review.
- Employee list: search debounces and updates `?q`, the status filter works,
  inactive rows show an "Inactive" text badge, and long names and departments
  wrap at 375 px with no page overflow.
- Create: duplicate email shows a field error, and the password field is empty
  after an error and never displayed. Success leads to the edit page with a toast.
- Edit: deactivate confirm (focus on Cancel), badge updated, history kept;
  reactivate works.
- Allowances: −1 and values below approved + pending show field errors. Save
  updates the available figure.
- Requests: every filter alone and combined (date overlap:
  `from=2026-10-06&to=2026-10-06` matches a 5–7 Oct request). Counts reflect
  filters except status. Newest first. 64+ rows paginate. Clearing filters
  resets page 1.
- Review: balance impact text is correct. Reject with empty remarks shows the
  field error and focus stays in the dialog. Approve works. Deciding again from
  a second tab gives the 409 alert. Afterwards the employee's `/leave/[id]`
  shows reviewer, time and remarks.
- An employee on each `/admin/**` route sees access denied.
- Mock off: NA states.

---

## 9. Known limitations, assumptions and open questions

**None of these block the design.** Each has a proposed default. A feature card
can confirm or change it without redesigning screens.

Assumptions (proposed defaults):

1. **Account creation:** the admin enters a username and an initial password
   on **Create employee**. The password is write-only, validated by Django's
   validators, never returned and never shown again. There is no password
   reset UI in Phase 1 (an admin can use the Django admin site). The ELM-003
   owner can switch to email-as-username without changing the layout.
2. **Admins are not leave-takers** in Phase 1. They have no balances, and
   `/leave/**` shows access denied for them. The employee list and allowances
   manage role `EMPLOYEE` accounts only.
3. **Department** is free text (required, ≤100 characters). The create form
   offers existing departments through a `<datalist>`.
4. **Deactivating an employee** keeps their history and leaves Pending
   requests Pending. An admin can still approve or reject them. The confirm
   dialog shows "{n} pending requests will stay pending until reviewed." The
   employee can no longer sign in (existing 401 behaviour).
5. **Admin dashboard counts** cover all requests. On `/admin/requests` the
   counts follow the filters except `status` (ELM-009 "counts reflect the
   selected filters").
6. **Allowance input** is a whole number of days, 0–366. Allowances are edited
   one leave type at a time (per-row Save), so each save is atomic and its
   error belongs to one row.
7. **History year filter** uses the request's `start_date` year. It is
   unambiguous because requests cannot span years.
8. **Reason** is required, 1–500 characters. Remarks are ≤500 characters,
   required only for rejection.

Known limitations:

- The client-side preview does not know about overlaps and can go stale if
  the balance changes in another tab. The server's 400 or 409 is authoritative
  and shown inline.
- Mock state is in memory per tab and resets on reload. It is for design and
  development only and is never a source of truth.
- There is no unit test runner in the frontend (`package.json` has lint and
  build only). The §7 reference cases are checked manually in Phase A. Adding
  a runner (e.g. Vitest) would be a separate, explicitly approved dependency
  change.
- Only light theme. No i18n. Dates are shown in English (`en-IN`) formats.
- The drawer and account block move **Log out** behind the **Menu** button at
  widths below 1024 px (one extra tap). Desktop keeps it always visible.
- An admin's landing URL becomes `/admin` (via `/dashboard`). ELM-002 manual
  steps that expect the admin to stay on `/dashboard` should wait for `/admin`.
- Public holidays, half days, attachments and notifications are out of Phase 1
  scope (Project Brief) and have no UI.
