# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Parallel is a peer-to-peer marketplace using a "Sync & Slash" mechanism: sellers import listings from eBay/Poshmark via Chrome Extension, prices are automatically set 5% below source (FairPrice Engine), and Just-in-Time availability checks prevent double-selling.

## Monorepo Structure

```
parallel-monorepo/
├── apps/
│   ├── api/          # Express.js backend (port 8000)
│   ├── web/          # Next.js 15 frontend (port 3000)
│   └── extension/    # Chrome Extension (Manifest V3)
└── packages/
    └── shared/       # Shared pricing logic
```

## Commands

### Development
```bash
# From parallel-monorepo/
npm install                              # Install all workspace deps
npm run dev                              # Start API + Web concurrently
```

### Individual Apps
```bash
npm run dev -w parallel-api              # API only (port 8000)
npm run dev -w parallel-web              # Web only (port 3000)
npm run build -w parallel-extension      # Build extension to dist/
```

### Database (Prisma)
```bash
cd apps/api
npx prisma generate                      # Generate client after schema changes
npx prisma migrate dev                   # Run migrations
npx prisma db seed                       # Seed demo data (Alice + 4 listings)
```

### Linting
```bash
npm run lint -w parallel-web             # ESLint for Next.js app
```

## Architecture

### Data Flow
1. **Ingestion**: Extension scrapes eBay/Poshmark item pages → POSTs to `/api/v1/ingest`
2. **Pricing**: API calculates Parallel price using FairPrice Engine (95% of source total minus estimated shipping)
3. **Display**: Web fetches listings from `/api/v1/listings`
4. **Checkout**: JIT check via Puppeteer confirms item still available on source before payment

### FairPrice Engine (`packages/shared/src/pricing.ts`)
```
Target_Buyer_Price = (Source_Price + Source_Shipping) × 0.95
Parallel_List_Price = Target_Buyer_Price - Estimated_Parallel_Shipping
```

### API Routes (`apps/api/src/index.ts`)
- `POST /api/v1/ingest` - Import listing from extension
- `GET /api/v1/listings` - List all listings
- `GET /api/v1/listings/:id` - Single listing with seller
- `DELETE /api/v1/listings/:id` - Remove listing
- `POST /api/v1/checkout/session` - Create checkout (includes JIT check)
- `GET /api/v1/users/:id` - User profile with listings and reviews

### Key Services
- `apps/api/src/services/jit.ts` - Puppeteer-based availability checker
- `apps/api/src/services/shipping.ts` - Shipping rate estimation

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | Express 4, TypeScript, Prisma 5 |
| Database | SQLite (dev) |
| Extension | React 18, Vite, CRXJS |
| Headless Browser | Puppeteer (JIT checks) |

## Design System

**Colors** (via Tailwind config):
- `midnight` (#0B1120) - background
- `surface` (#162032) - cards/panels
- `lime` (#A3E635) - primary accent
- `dim` (#94A3B8) - secondary text

**Fonts**: Inter (UI), JetBrains Mono (data/monospace)

## Database Schema

**Models** in `apps/api/prisma/schema.prisma`:
- `User` - email, name, stripeAccountId, listings, reviews
- `Listing` - title, sourceUrl, priceSource, priceParallel, status, images (JSON string)
- `Review` - rating (1-5), type (BUYER_TO_SELLER/SELLER_TO_BUYER)

## Extension

Content script runs on `ebay.com/itm/*` pages. Scrapes via DOM + JSON-LD. Build with `npm run build -w parallel-extension`, then load `dist/` folder in `chrome://extensions` (Developer mode).

## Important Notes

- Images stored as JSON strings in DB; parse with `JSON.parse()` when reading
- Stripe and EasyPost are mocked; real API keys needed for production
- Quality gate rejects sellers with <80% rating
- No test framework configured yet
