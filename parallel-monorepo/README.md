# Parallel Monorepo

This repository houses the entire Parallel ecosystem ("The Sync & Slash Marketplace").

## Structure

We utilize a modern Monorepo architecture (suggested: Turborepo) to manage dependencies and build pipelines across our applications.

### Apps
*   **`apps/web`**: The Buyer-facing Marketplace and Seller Dashboard.
    *   **Stack:** Next.js (React), Tailwind CSS (Brand Kit).
    *   **Port:** 3000
*   **`apps/api`**: The Backend Logic (Pricing Engine, JIT Scrapers, User Auth).
    *   **Stack:** Node.js (TypeScript) or Python (FastAPI).
    *   **Port:** 8000
*   **`apps/extension`**: The "Mirror Tool" Chrome Extension.
    *   **Stack:** React, Vite (for build), Manifest V3.
    *   **Key File:** `src/scripts/content.js` (Ingestion Logic).

### Packages
*   **`packages/shared`**: Shared logic, types, and constants.
    *   `src/pricing.ts`: The "FairPrice" Engine logic (shared between API and Frontend/Extension).

## Quick Start

1.  **Install Dependencies:** `npm install` (root)
2.  **Dev Mode:** `npm run dev` (starts all apps)

## Development Standards
*   **Colors:** Use `brandkit` variables (Midnight `#0B1120`, Electric Lime `#A3E635`).
*   **Code:** TypeScript strict mode.
*   **Formatting:** Prettier + ESLint.
