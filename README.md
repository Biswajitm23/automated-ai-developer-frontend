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

## Checks

```bash
npm run lint
npx tsc --noEmit
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
