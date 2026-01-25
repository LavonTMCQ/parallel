# Repository Guidelines

This repo is a container for the working monorepo located at `parallel-monorepo/`. Use the guidance below when contributing.

## Project Structure & Module Organization
- `parallel-monorepo/apps/api`: Express + TypeScript API with Prisma (`src/`, `prisma/`, `dev.db`).
- `parallel-monorepo/apps/web`: Next.js app router UI (`app/`, `globals.css`, Tailwind config).
- `parallel-monorepo/apps/extension`: Vite-powered Chrome extension (`src/`, `manifest.json`).
- `parallel-monorepo/packages/shared`: Shared TypeScript logic (`src/pricing.ts`).

## Build, Test, and Development Commands
Run commands from `parallel-monorepo/`:
- `npm install`: install workspace dependencies.
- `npm run dev`: start API + web together via `concurrently`.
- `npm run dev -w parallel-api`: API dev server (ts-node-dev, port 8000).
- `npm run dev -w parallel-web`: Next.js dev server (port 3000).
- `npm run dev -w parallel-extension`: Vite dev server for extension.
- `npm run build`: build all workspaces.
- `npm run lint -w parallel-web`: Next.js ESLint checks.
- `npm run test`: runs workspace tests (currently no test scripts defined).

## Coding Style & Naming Conventions
- TypeScript is the default across apps; keep strict typing and avoid `any`.
- Indentation is 2 spaces; use single quotes in TS/JS to match existing files.
- React components use `PascalCase` (e.g., `App.tsx`); routes follow Next.js `app/` conventions (`app/page.tsx`).
- Tailwind is used in web/extension; prefer utility classes over bespoke CSS.

## Testing Guidelines
- No test framework or naming convention is configured yet.
- If adding tests, place them alongside sources (e.g., `src/foo.test.ts`) and add a workspace `test` script.
- Update `npm run test` expectations when introducing a runner.

## Commit & Pull Request Guidelines
- No `.git` history is present in this checkout, so no established commit convention is discoverable.
- Use clear, imperative commit subjects (e.g., “Add pricing guardrails”) or adopt Conventional Commits if you introduce automation.
- PRs should include a short problem/solution summary, screenshots for UI changes, and note any new env vars.

## Configuration & Data
- API uses Prisma with `parallel-monorepo/apps/api/prisma/schema.prisma`; local data lives in `dev.db`.
- Use `.env` files for secrets; do not commit credentials.
