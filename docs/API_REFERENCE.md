# Parallel API Reference

Base URL: `http://localhost:8000/api/v1`

## Listings

### `GET /listings`
Returns all mirrored listings, sorted by newest.
*   **Response:** `Listing[]`

### `GET /listings/:id`
Returns details for a single listing.
*   **Response:** `Listing` object (with parsed `images` array).

### `POST /ingest`
Creates a new listing from scraped data.
*   **Body:**
    ```json
    {
      "source_platform": "ebay",
      "source_id": "12345",
      "title": "Item Name",
      "price_source": 100.00,
      "shipping_source": 10.00,
      "images": ["url1", "url2"],
      "seller_rating_score": 98.5
    }
    ```
*   **Response:**
    ```json
    {
      "id": "uuid",
      "status": "IMPORTED",
      "pricing_strategy": { ... }
    }
    ```

### `DELETE /listings/:id`
Removes a listing from the marketplace.
*   **Response:** `{ "status": "DELETED" }`

## Stripe (Planned)

### `POST /onboarding/link`
Creates a Stripe Connect Express login link for sellers.

### `POST /checkout/session`
Creates a payment session for a buyer.
