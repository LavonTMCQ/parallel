# Technical PRD: PARALLEL
**Product Requirements Document v1.0**
**Date:** January 2026
**Status:** MVP Definition

---

## 1. Objective
To build a peer-to-peer marketplace MVP driven by a **Chrome Extension ingestion engine**. The system prioritizes inventory synchronization over manual listing creation to solve the "Cold Start" problem. The core value proposition is "Total Landed Cost" arbitrage.

---

## 2. MVP Feature Priority (The Build Order)

### Phase 1: Ingestion & Pricing (Weeks 1-3)
1.  **Authentication & Onboarding:**
    *   Email/Password + OAuth (Google/Apple).
    *   **Critical:** Integration with **Stripe Connect** for seller payouts (KYC/Identity verification must happen here).
2.  **Chrome Extension V1 (Ingestion):**
    *   Client-side script to scrape "Active Listings" from the source DOM (eBay).
    *   Extracts: Title, Photos, Price, Description, Item Specifics.
3.  **Quality Gates (Input Filter):**
    *   Extension logic to verify source account credibility.
    *   Rule: `IF feedback_score > 90% AND feedback_count > 50 THEN Allow_Sync ELSE Reject`.
4.  **The "FairPrice" Engine:**
    *   Backend logic to calculate the `Parallel_Price` based on landed cost analysis (see Section 3.2).

### Phase 2: Transaction & Safety (Weeks 4-6)
5.  **JIT (Just-in-Time) Availability Check:**
    *   Server-side scraper to verify source item status at the moment of checkout.
6.  **Checkout & Escrow:**
    *   Stripe Connect "Direct Charges" or "Destination Charges".
    *   Funds held in escrow logic.
7.  **Shipping Integration:**
    *   Integration with EasyPost or Shippo API for label generation and tracking updates.

---

## 3. Technical Specifications

### 3.1 The Chrome Extension (Client-Side)
*   **Trigger:** Button injected into the User's "Active Listings" page on the source platform.
*   **Method:** DOM parsing (Client-side) to avoid server-side IP blocking.
*   **Data Payload (JSON Example):**
    ```json
    {
      "source_platform": "ebay",
      "source_id": "123456789",
      "title": "Nike Air Max 90 - Size 10",
      "price_source": 100.00,
      "shipping_source": 8.00,
      "currency": "USD",
      "images": [
        "https://i.ebayimg.com/images/g/...", 
        "https://i.ebayimg.com/images/g/..."
      ],
      "description_html": "<div...>...</div>",
      "condition_text": "New with Box",
      "seller_rating_score": 98.5,
      "seller_rating_count": 1540
    }
    ```

### 3.2 The Pricing Engine (Backend Logic)
*   **Goal:** Ensure the Buyer pays less on Parallel than the Source Total, while maintaining Seller Net.
*   **Logic:**
    ```text
    // Inputs
    Source_Total = Source_Price + Source_Shipping
    Parallel_Fee = 0.10  (10%)
    Estimated_Parallel_Shipping = API_Rate_Quote(Weight, Dimensions)

    // Calculation
    Target_Buyer_Price = Source_Total * 0.95  // We aim for 5% savings
    
    // Reverse Engineering the Listing Price
    Parallel_List_Price = Target_Buyer_Price - Estimated_Parallel_Shipping
    ```
*   **Display Logic:** If `Parallel_List_Price` results in a significantly lower Net Profit for the seller (due to shipping discrepancies), display a warning during import: *"Shipping on Parallel is higher for this item. Price adjusted to maintain velocity."*

---

## 4. Safety Mechanics (Critical)

### 4.1 JIT (Just-in-Time) Availability Check
*   **Trigger:** Buyer clicks "Pay Now" / "Checkout".
*   **Process:**
    1.  API receives checkout request.
    2.  Server spawns a headless browser session (Puppeteer / Selenium / Playwright).
    3.  Bot visits the `source_url`.
    4.  Bot scans DOM for keywords: "Sold", "Ended", "Out of Stock", "This listing is no longer available".
    5.  **Logic:**
        *   If **Active**: Process Stripe Charge.
        *   If **Sold**: Block transaction, return error *"Item Unavailable - Just sold on another platform."*
*   **Latency Budget:** < 2.5 seconds.

### 4.2 Escrow Payouts
*   **Stripe Configuration:** Manual Payouts.
*   **Release Trigger:**
    *   Listen for Webhook from Shipping Provider (EasyPost): `status: delivered`.
    *   Start 48-hour timer.
    *   If no dispute filed -> Release funds to Seller Stripe Account.

---

## 5. Database Schema (Simplified)

| Table | Critical Fields | Notes |
| :--- | :--- | :--- |
| **Users** | `id`, `email`, `stripe_account_id`, `source_rating_score`, `source_rating_count` | Store the imported reputation here. |
| **Listings** | `id`, `user_id`, `source_url`, `source_platform`, `status`, `price`, `shipping_rate_id` | Status enum: `ACTIVE`, `PENDING_SYNC`, `SOLD`, `PAUSED`. |
| **Orders** | `id`, `listing_id`, `buyer_id`, `seller_id`, `stripe_charge_id`, `escrow_status`, `tracking_number` | Escrow status enum: `HELD`, `RELEASED`, `REFUNDED`. |

---

## 6. MVP Acceptance Criteria
1.  **Ingestion Speed:** A user can install the extension and import 10 items in under 1 minute.
2.  **Price Advantage:** Imported items consistently show a lower "Total Landed Cost" than the source link.
3.  **Conflict Prevention:** The Checkout flow successfully fails if the original source item is manually marked "Sold" during the transaction attempt.
4.  **Financial Safety:** Seller cannot withdraw funds immediately after sale; funds are locked until delivery + 48h.
