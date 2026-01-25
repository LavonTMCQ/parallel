# Parallel Vendor Strategy

This document outlines the third-party services integrated into Parallel to handle "The Hard Stuff."

## 1. Payments & Compliance: Stripe Stack
We use Stripe as our primary financial infrastructure to minimize vendor sprawl.
*   **Payouts:** Stripe Connect (Express).
*   **Sales Tax:** Stripe Tax (0.5% per transaction).
*   **Fraud:** Stripe Radar (Free tier).
*   **Identity (KYC):** Stripe Identity ($1.50/verification).

## 2. Logistics: EasyPost
*   **Usage:** Real-time rate quotes and label generation.
*   **Cost:** Free for first 50K labels.
*   **Status:** Pending integration (Currently using $10 mock).

## 3. Media: Cloudinary
*   **Usage:** Image hosting and transformation (Auto-resizing for different devices).
*   **Cost:** Free tier (25GB).
*   **Strategy:** Phase 1 uses Hotlinking; Phase 2 will hydrate to Cloudinary.

## 4. Search: Typesense
*   **Usage:** Fast, typo-tolerant search for the buyer marketplace.
*   **Cost:** ~$7-29/mo (Cloud) or self-hosted (Free).
*   **Status:** Planned for Buyer Discovery phase.
