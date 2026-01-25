# Parallel Setup Guide

## Prerequisites
*   Node.js 18+
*   Chrome Browser

## Installation
1.  **Clone & Install:**
    ```bash
    npm install
    ```

2.  **Database Setup (SQLite):**
    *   Navigate to API: `cd apps/api`
    *   Generate Client: `npx prisma generate`
    *   Run Migrations: `npx prisma migrate dev`
    *   *Note:* We use Prisma 5 to avoid v7 configuration complexity.

3.  **Environment Variables:**
    *   Create `apps/api/.env` (optional for Dev, required for Stripe).
    *   `STRIPE_SECRET_KEY=sk_test_...`

## Running the Stack
1.  **Start All (Root):**
    ```bash
    npm run dev
    ```
    *   API: http://localhost:8000
    *   Web: http://localhost:3000

2.  **Load Extension:**
    *   Build: `cd apps/extension && npm run build`
    *   Load `apps/extension/dist` in `chrome://extensions`.

## Troubleshooting
*   **Images not loading?** Ensure `referrerPolicy="no-referrer"` is on the `<img>` tag.
*   **Extension error?** Refresh the target eBay page before scanning.
