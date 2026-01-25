# GEMINI.md - Project Context: Parallel Marketplace

## 1. Project Overview
**Parallel** is a peer-to-peer marketplace designed to solve the "Cold Start" problem via a browser-based **"Mirror Tool" (Chrome Extension)**. The core value proposition is **"Total Landed Cost" arbitrage**: creating a friction-free bridge from existing platforms (eBay, Poshmark) to a more efficient marketplace where buyers pay less and sellers maintain their net profit.

**Core Mechanism: "Sync & Slash"**
1.  **Ingest:** Chrome Extension reads seller inventory locally to bypass API limits.
2.  **Slash:** Backend algorithm calculates "Total Landed Cost" and sets a lower price by leveraging Parallel's lower 10% fee structure.
3.  **Sync:** "Just-in-Time" (JIT) checks verify stock on the source platform at the moment of checkout to prevent double-selling.

## 2. Technical Architecture
*   **Documentation:**
    *   [Architecture Overview](docs/ARCHITECTURE.md)
    *   [Competitive Landscape](docs/COMPETITIVE_LANDSCAPE.md)
    *   [Roadmap 2026](docs/ROADMAP_2026.md)
    *   [Vendor Strategy](docs/VENDOR_STRATEGY.md)
    *   [API Reference](docs/API_REFERENCE.md)
    *   [Setup Guide](docs/SETUP_GUIDE.md)

### Stack
*   **Frontend:** Web (React/Next.js 15), Mobile (React Native or iOS Swift).
*   **Ingestion:** Chrome Extension (Manifest V3, Client-side DOM parsing).
*   **Backend:** Node.js/Express + Prisma + SQLite (Dev).
*   **Payments:** Stripe Connect (Critical for Seller Payouts and KYC).

## 3. Design System ("The Architect")
*   **Theme:** Dark Mode Native. "Efficient, mathematical, precise."
*   **Colors:**
    *   Background: Midnight (`#0B1120`)
    *   Surface: Surface (`#162032`)
    *   Primary/Action: Electric Lime (`#A3E635`)
    *   Text: White (`#FFFFFF`) & Dim Slate (`#94A3B8`)
*   **Typography:**
    *   UI: **Inter**
    *   Data/Financials: **JetBrains Mono**

## 4. Current State
**Phase 1 (Ingestion) is Complete.**
*   Extension scrapes High-Res images and Price (via JSON-LD).
*   API persists listings.
*   Dashboard & Detail pages display inventory.

**Phase 2 (Transactions) is Active.**
*   Stripe Connect scaffold built (Mock Mode).
*   **Current Task:** Implementing JIT Availability Checker (Puppeteer).

## 5. Usage
*   **Context:** Refer to `Parallel_Technical_PRD.markdown` for specific logic rules regarding pricing and quality gates.
*   **Design:** Adhere strictly to the hex codes in `brandkit.pdf` for all UI implementation.
