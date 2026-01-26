# Parallel Architecture

## Overview
Parallel is a "Sync & Slash" marketplace. We mirror inventory from external platforms (eBay) and price it lower by reducing fees.

## Tech Stack
*   **Monorepo Manager:** NPM Workspaces
*   **Frontend:** Next.js 15 (App Router), Tailwind CSS
*   **Backend:** Node.js (Express), Prisma ORM, **PostgreSQL (Railway Managed)**
*   **Authentication:** **Clerk (Dark Theme)**
*   **Extension:** React, Vite, Manifest V3
*   **Payments & KYC:** Stripe (Connect, Identity, Tax, Radar)
*   **Shipping:** EasyPost
*   **Media:** Cloudinary (Planned)
*   **Search:** Typesense (Planned)

## Core Flows

### 1. Ingestion (The Mirror)
1.  **Trigger:** User clicks "Scan Page" in Chrome Extension on an eBay Item URL.
2.  **Scraper (`content.js`):**
    *   Prioritizes `JSON-LD` (Structured Data) for Price/Images.
    *   Fallbacks to DOM selectors and Meta Tags.
    *   Extracts High-Res images (`s-l1600.jpg`).
3.  **API (`POST /ingest`):**
    *   Receives payload.
    *   Runs **FairPrice Engine**: `Target = Source * 0.95`.
    *   Saves to DB with `status: ACTIVE`.

### 2. The Transaction (Planned)
1.  **Buyer** clicks "Buy Now".
2.  **JIT Check:** Headless browser verifies item is still active on source.
3.  **Stripe:** Process payment, split funds (90% Seller, 10% Platform).
4.  **Escrow:** Funds held until delivery.

## Key Decisions
*   **Hotlinking Images:** We do not host images in Phase 1. We hotlink to eBay's CDN with `referrerPolicy="no-referrer"`.
*   **Client-Side Scraping:** We scrape via the Extension to use the user's IP/Session, avoiding anti-bot blocks.
