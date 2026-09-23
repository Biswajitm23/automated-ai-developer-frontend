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

Start the backend first. The home page calls the backend health endpoint and
should show **"Connected — API and database are healthy."**

Open the frontend at `http://localhost:3000` and keep `NEXT_PUBLIC_API_BASE_URL`
on the same hostname (`http://localhost:8000`). See
[Same hostname requirement](#same-hostname-requirement).

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Backend health check, plus a **Sign in** / **Go to dashboard** link |
| `/login` | Public | Sign-in form. Accepts `?next=/some/path` (same-site paths only) |
| `/dashboard` | Signed-in users | Shows the signed-in user and their role |
| `/admin` | Role `ADMIN` | Confirms administrator access with `GET /api/admin/ping/`. Employees see "Access denied" |

There is no registration page. Accounts are created by an administrator.

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

## Manual verification checklist

Run the backend and `npm run dev`, open `http://localhost:3000`, and have an
administrator account (`create_admin`), an employee account and a second
employee you can deactivate (Django admin, untick **Active**).

| Acceptance criterion | Steps | Expected |
|---|---|---|
| Valid credentials allow login | Sign in at `/login` as the admin, then as the employee | Lands on `/dashboard` showing the username and role (Administrator / Employee) |
| Invalid credentials show a clear error | Submit a wrong password; submit the form empty | "Invalid username or password." alert, password cleared; empty fields show "Enter your username." / "Enter your password." without a request |
| Logout ends access to protected resources | Click **Log out**, then open `/dashboard` and press Back | Sent to `/login`; `/dashboard` redirects to `/login?next=%2Fdashboard`; `GET /api/auth/me/` returns 401 |
| Employees cannot access admin APIs or pages | As the employee, open `/admin` | "Access denied" panel, no Admin link in the header; `GET /api/admin/ping/` returns 403 |
| Admin access (control) | As the admin, open `/admin` | "Administrator access confirmed by the server." |
| Inactive accounts cannot access protected resources | Deactivate a signed-in employee, then reload or refocus the tab; try signing in again | Sent to `/login`; sign-in shows the same generic error |
| Safe redirects | Open `/login?next=//evil.example` and sign in | Lands on `/dashboard` |
| No public registration | Look for a sign-up link; open `/register` | No link; 404 |
| Responsive | Resize to 375 px wide | Login form, header and **Log out** fit without horizontal scrolling |

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

## Troubleshooting

- **"Could not reach the backend"** — the backend is not running, or
  `NEXT_PUBLIC_API_BASE_URL` is wrong.
- **"Backend responded, but is unhealthy"** — the backend is up but cannot reach
  PostgreSQL. Check `docker compose ps` in the backend repository.
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
