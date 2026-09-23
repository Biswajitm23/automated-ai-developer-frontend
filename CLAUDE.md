@AGENTS.md

# Employee Leave Management — Frontend

This repository contains the Next.js + TypeScript frontend only. The Django API
and PostgreSQL database live in a separate repository:
https://github.com/Biswajitm23/automated-ai-developer-backend

## Task source
- Trello is the source of task requirements.
- Board: Employee Leave Management — ID `6ab23ef82a4c8c74db67b5c7`
  (https://trello.com/b/uWtRCnyB/employee-leave-management)
- Project Brief card: https://trello.com/c/ql171MlA
- Work only on this board and the two project repositories.

## Workflow
- Process one Ready task at a time, respecting priority labels
  (P0 — Foundation, P1 — MVP, P2 — Later) and card dependencies.
- Read complete card descriptions (via `get_card`, not list previews) and all
  comments before implementation.
- If blocked, post a specific question on the card and move it to
  Needs Clarification.
- Move completed implementation to Review. The owner accepts work as Done;
  never move cards to Done yourself.
- A card that spans both repositories needs a matching task branch in each.

## Git
- Work on a task branch per card (e.g. `feature/ELM-002-user-roles-authentication`).
- Commit relevant source code, tests, configuration, and documentation
  (including `.env.example` with placeholder values).
- Never commit `.env.local` or any real environment file, credentials,
  `node_modules/`, build output (`.next/`), or local tool state.
- Review `git status` and the staged diff before each commit.

## Local environment
- Runs directly in WSL with `npm run dev` on http://localhost:3000.
- Needs the backend running on http://localhost:8000. See README.md.

## Security
- Keep credentials out of source code, Git, logs, and Trello comments.
- Never print secrets to the terminal; generate them directly into ignored files.

## Reporting
- Report actual verification results, including failures.
- Never report an unrun check as passed.
