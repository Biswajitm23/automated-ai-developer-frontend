# Employee Leave Management — Frontend

Next.js 16 + TypeScript frontend for the Employee Leave Management application.

The backend API and database live in a separate repository:
https://github.com/Biswajitm23/automated-ai-developer-backend

Task requirements are tracked on the Trello board
[Employee Leave Management](https://trello.com/b/uWtRCnyB/employee-leave-management).

## Prerequisites

- Node.js 20.9 or newer, npm
- The backend running locally (see the backend repository's README)

## First-time setup

```bash
cp .env.example .env.local
npm install
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` to the backend's base URL
(default `http://localhost:8000`, no trailing slash). Next.js inlines
`NEXT_PUBLIC_*` values at build time, so restart the dev server after changing it.

## Running locally

```bash
npm run dev      # http://localhost:3000
```

Start the backend first. To check it is healthy, open
`http://localhost:8000/api/health/`; it returns `{"status": "ok", ...}`.

Open the frontend at `http://localhost:3000` and keep `NEXT_PUBLIC_API_BASE_URL`
on the same hostname (`http://localhost:8000`). See
[Same hostname requirement](#same-hostname-requirement).

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Redirects to `/login`; signed-in users continue from there to `/dashboard` |
| `/login` | Public | Sign-in form. Accepts `?next=/some/path` (same-site paths only) |
| `/dashboard` | Signed-in users | Shows the signed-in user and their role (interim; the employee dashboard arrives in ELM-UI-001 Phase B) |
| `/admin` | Role `ADMIN` | Confirms administrator access with `GET /api/admin/ping/`. Employees see "Access denied" |
| anything else | Any | "Page not found" card (`src/app/not-found.tsx`), e.g. `/register` |

There is no registration page. Accounts are created by an administrator.

Signed-in pages share one layout (`src/components/layout/`): a sidebar with the
navigation and the account block (name, role, **Log out**) from 1024 px, and a
top bar with a **Menu** button that opens the same content in a drawer below
1024 px. The navigation already lists the employee (`/leave`, `/leave/apply`)
and admin (`/admin/requests`, `/admin/employees`, `/admin/allowances`) pages
from the UI design; until those pages are built they show "Page not found".

The design, component library, API contracts and the plan for the remaining
pages are in [docs/ui-design.md](docs/ui-design.md).

## Signing in

Authentication uses the Django session. The Django API decides who is signed in
and what they may do. The frontend only reflects its answers:

1. `GET /api/auth/me/` on load (and again when the tab regains focus) tells the
   app whether a session exists. `401` means signed out.
2. Before every `POST` the app fetches a fresh CSRF token from
   `GET /api/auth/csrf/` and sends it in the `X-CSRFToken` header. All requests
   use `credentials: "include"` so the browser sends the session cookie.
3. `POST /api/auth/login/` with username and password. A wrong password, an
   unknown user and an inactive account all get the same message:
   "Invalid username or password." Too many attempts return `429`.
4. `POST /api/auth/logout/` ends the server-side session. The app then clears
   its state and goes to `/login`.

Protected pages (`src/app/(protected)/`) redirect signed-out visitors to
`/login?next=<page>` and return there after sign-in. Any `401` from the API
counts as signed out (also when an account is deactivated mid-session). A `403`
means signed in but not allowed. The code is in `src/lib/api.ts`,
`src/lib/auth.ts` and `src/components/`.

### Creating the first administrator

The first account is created with the backend's `create_admin` management
command (see the backend README). It reads `ELM_ADMIN_USERNAME`,
`ELM_ADMIN_EMAIL` and `ELM_ADMIN_PASSWORD` from the environment and accepts
`--no-input`. Keep the password out of shell history and logs. Administrators
can then add employee accounts in the Django admin (`http://localhost:8000/admin/`).

### Same hostname requirement

The browser only sends the Django session and CSRF cookies to the API when the
frontend and the API use the **same hostname**. Use `http://localhost:3000`
with `http://localhost:8000`, or `127.0.0.1` for both. Mixing `localhost` and
`127.0.0.1` makes them different sites, and sign-in appears to succeed but you
are sent straight back to the login page.

## Mock API (development only)

Most leave-management endpoints are not in the backend yet. Each group of
endpoints has an availability flag in `src/lib/services/availability.ts`.
While a flag is `false`, pages show a plain **"Nothing to show yet"** and
actions say **"This can't be done right now. Please try again later."** (no
technical wording, at the owner's request). For design and
development you can serve those endpoints from an in-browser mock instead:

```bash
NEXT_PUBLIC_USE_MOCK_API=true npm run dev
```

(or set it in `.env.local` and restart `npm run dev`). A blue banner, "Development
data: some screens use the mock API", is shown on every signed-in page.

- **Development only.** The mock is enabled only when `NODE_ENV` is not
  `production` *and* the flag is `true`. `npm run build` ignores the flag (it
  prints a warning) and the mock code is not included in the build.
- **Real sign-in.** Login, logout, the session, CSRF and `/api/admin/ping/`
  always use the real backend. There is no role switching: the role comes from
  the real session, and the mock applies the same role rules (403) as the API.
- **Data** is fictional (`src/lib/mock/seed.ts`): 12 employees (two inactive,
  some with very long names and departments), about 100 requests including long
  reasons and remarks. The signed-in employee gets their own history of about
  25 requests on first use. The data lives in memory: it survives navigation
  and resets on a full page reload.
- **Real endpoints win.** When a backend card ships an endpoint group, set its
  flag to `true`; the page then uses the real API even with the mock flag on.

### Scenarios

To show the loading, empty and error states, set a scenario in the browser
console and reload:

```js
localStorage.setItem("elm-mock", JSON.stringify({ scenario: "empty" }));
// "normal" (default) | "empty" (no data) | "error" (every GET returns 500) | "slow" (3 s latency)
localStorage.setItem("elm-mock", JSON.stringify({ scenario: "normal", latencyMs: 400 }));
localStorage.removeItem("elm-mock");
```

The default latency is a random 250–600 ms.

## Manual verification checklist

Run the backend and `npm run dev`, open `http://localhost:3000`, and have an
administrator account (`create_admin`), an employee account and a second
employee you can deactivate (Django admin, untick **Active**).

| Acceptance criterion | Steps | Expected |
|---|---|---|
| Valid credentials allow login | Sign in at `/login` as the admin, then as the employee | Lands on `/dashboard` showing the username and role (Administrator / Employee) |
| Invalid credentials show a clear error | Submit a wrong password; submit the form empty | "Invalid username or password." alert, password cleared; empty fields show "Enter your username." / "Enter your password." without a request |
| Logout ends access to protected resources | Click **Log out**, then open `/dashboard` and press Back | Sent to `/login`; `/dashboard` redirects to `/login?next=%2Fdashboard`; `GET /api/auth/me/` returns 401 |
| Employees cannot access admin APIs or pages | As the employee, open `/admin` | "Access denied" panel, no admin links in the navigation; `GET /api/admin/ping/` returns 403 |
| Admin access (control) | As the admin, open `/admin` | The admin dashboard loads. The server check runs silently: no message when it passes, "Access denied" on a 403, and a plain error with **Try again** if it fails |
| Inactive accounts cannot access protected resources | Deactivate a signed-in employee, then reload or refocus the tab; try signing in again | Sent to `/login`; sign-in shows the same generic error |
| Safe redirects | Open `/login?next=//evil.example` and sign in | Lands on `/dashboard` |
| No public registration | Look for a sign-up link; open `/register` | No link; 404 |
| Responsive | Resize to 375 px wide; open **Menu** | Login form, top bar and the menu drawer (with **Log out**) fit without horizontal scrolling. The drawer closes with Esc and focus returns to **Menu** |
| Page not found | Open `/does-not-exist` | "Page not found" card with **Go to dashboard** and **Home** |

**Log out** is in the sidebar at 1024 px and wider. Below 1024 px it is in the
menu drawer: select **Menu** (`data-testid="mobile-menu-button"`) first.

Expected console noise: while you are signed out, the app re-checks the session
when the tab regains focus (at most once a second). On `/login` and other
signed-out pages, each re-check logs `GET /api/auth/me/ 401 (Unauthorized)` in
the browser console. This is expected, not a bug.

## Checks

```bash
npm run lint
npx next typegen && npx tsc --noEmit
npm run build
```

`npx tsc --noEmit` needs the generated route types. Run `npm run build` or
`npx next typegen` first in a fresh clone, otherwise it reports that
`LayoutProps` cannot be found.

The mock must never reach production output. After `npm run build` (also with
`NEXT_PUBLIC_USE_MOCK_API=true`, which only prints a warning):

```bash
grep -rl "MOCK_SEED_SENTINEL_ELM" .next/static   # must print nothing
```

CSS Modules use design tokens only (`src/styles/tokens.css`); this must print
nothing:

```bash
grep -rnE "#[0-9a-fA-F]{3,6}\b" src --include=*.module.css
```

## Troubleshooting

- **Sign-in shows a network error** — the backend is not running, or
  `NEXT_PUBLIC_API_BASE_URL` is wrong. `http://localhost:8000/api/health/`
  reports whether the API can reach PostgreSQL (check `docker compose ps` in
  the backend repository if it cannot).
- **CORS error in the browser console** — add this origin to
  `CORS_ALLOWED_ORIGINS` in the backend's `.env`.
- **Sign-in "works" but you land on the login page again, or you are always
  signed out** — the frontend and API hostnames differ (see
  [Same hostname requirement](#same-hostname-requirement)), or the backend is
  missing `CORS_ALLOW_CREDENTIALS=True`.
- **"Your sign-in request was rejected for security reasons"** — the backend
  rejected the CSRF check. Add this origin (e.g. `http://localhost:3000`) to
  `CSRF_TRUSTED_ORIGINS` in the backend's `.env` and reload the page.
- **"Too many attempts"** — the backend throttles sign-in attempts. Wait a
  minute and try again.
