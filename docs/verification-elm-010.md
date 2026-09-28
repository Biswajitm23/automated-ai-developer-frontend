# ELM-010 full-flow verification (2026-09-28)

Run against the local stack: Next.js dev server (this repo, branch
`feature/ELM-010-responsive-full-flow`) and the Django API (backend branch
`feature/ELM-009-admin-dashboard-filters`) with PostgreSQL. Headless Chromium
(Playwright) at 1440 × 900 (desktop) and 390 × 860 (phone), using the test
accounts `e2e_admin` and `e2e_employee` only.

## Layout sweep

Every route below was opened at both widths as the listed role. For each page
the script recorded horizontal overflow, elements wider than the viewport,
tap targets under 24 × 24 px, and script errors.

| Role | Routes |
|---|---|
| Signed out | `/login`, `/forgot-password` |
| Employee | `/dashboard`, `/leave`, `/leave/apply`, `/leave/[id]` (pending, approved), `/admin` (denied) |
| Admin | `/admin`, `/admin/requests`, `/admin/requests/[id]` (pending, rejected), `/admin/employees`, `/admin/employees/new`, `/admin/employees/[id]`, `/admin/allowances?employee=`, `/dashboard` (redirects to `/admin`) |

Result: no horizontal scrolling and no overflowing elements on any page at
either width; no script errors. Fixed in this card:

- Tap targets under 24 px: breadcrumb links, the main link in each table row
  and "Back to sign in" now have at least 24 px (36 px for the last).
- The full-page "Access denied" state had no `h1`; it now uses one (the
  in-page 403 panel below a page header keeps its `h2`).

## Core flows (both widths)

| Step | Expected | Result |
|---|---|---|
| Sign in with the keyboard only (type, Tab, Enter) | Dashboard | Pass |
| First Tab on a signed-in page | "Skip to main content" | Pass |
| Submit an empty leave form | A message per field plus a summary | Pass |
| Apply three times | Pending grows, available shrinks by the working days | Pass (8 → 2 available at 390 px) |
| Apply beyond the balance | Refused: "Not enough Casual Leave: 3 working days requested, 2 available." | Pass |
| Apply overlapping an existing request | Refused, naming the request | Pass |
| Cancel dialog: Escape, then cancel | Escape closes; cancelling releases the days | Pass (2 → 4 available) |
| Admin phone menu | Opens, lists the admin pages, Escape closes | Pass |
| Approve with remarks | Approved; buttons disappear | Pass |
| Reject without remarks, then with | Blocked, then rejected | Pass |
| Employee sees the decision | Status, reviewer, time and remarks | Pass |
| Final balance | Approved and available match the decisions | Pass (5 used, 5 available at 390 px; 7 used, 3 available at 1440 px) |
| Admin opens `/leave/apply`; employee opens `/admin/**` | Access denied (the API also answers 403) | Pass |

## Checks

- Frontend: `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
- Backend: `manage.py check`, `makemigrations --check` and all 188 tests pass.

## Known limitations

- Screenshots and flows were checked in Chromium only; Safari and Firefox
  were not tested.
- Full-page screenshots show the sticky top bar part-way down the page; this
  is how the screenshot tool captures sticky elements, not a layout fault.
- The local dev server does not pick up file changes on the Windows drive;
  restart `npm run dev` after editing.
