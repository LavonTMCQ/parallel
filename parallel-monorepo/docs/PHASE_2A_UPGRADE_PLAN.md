# Phase 2A: Frontend & API Production Upgrade

**Status:** Planning
**Owner:** Claude (CEO/Architect)
**Created:** 2026-01-25

---

## Executive Summary

Parallel MVP is functional but needs production-grade marketplace features. This document outlines the upgrade from basic MVP to a competitive eBay-style marketplace experience.

---

## Current State Assessment

### What Works
- Chrome Extension scrapes eBay listings via JSON-LD
- FairPrice Engine calculates 5% savings automatically
- JIT availability checks prevent double-selling
- Basic seller dashboard and buyer grid view
- Dark mode design system (midnight, surface, lime, dim)

### Critical Gaps
1. **No Categories** - Can't browse by type, shipping estimates guess from title
2. **No Search** - Browse-only, no way to find specific items
3. **No Filters** - Can't narrow by price, condition, brand
4. **No Pagination** - All listings load at once (breaks at scale)
5. **No Auth** - Anonymous only, no user accounts
6. **Mocked Integrations** - Stripe/EasyPost return fake data

---

## Database Schema Changes

### New Fields on Listing
```prisma
model Listing {
  // ... existing fields ...

  // NEW: Category & Discovery
  category      String?       // "electronics", "fashion", "collectibles", etc.
  subcategory   String?       // "cameras", "sneakers", "trading-cards"
  brand         String?       // "Sony", "Nike", "Pokemon"
  condition     String?       // "new", "like-new", "good", "fair"

  // NEW: Search & Sort
  searchVector  String?       // Full-text search index
  viewCount     Int           @default(0)
  favoriteCount Int           @default(0)
}
```

### New Category Model
```prisma
model Category {
  id          String   @id @default(uuid())
  name        String   @unique  // "Electronics"
  slug        String   @unique  // "electronics"
  icon        String?           // Lucide icon name
  parentId    String?
  parent      Category? @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  listings    Listing[]
  sortOrder   Int       @default(0)
}
```

---

## API Endpoints to Add

### Search & Discovery
```
GET /api/v1/search?q={query}&category={slug}&minPrice={n}&maxPrice={n}&condition={c}&sort={field}&page={n}&limit={n}

GET /api/v1/categories
GET /api/v1/categories/:slug
GET /api/v1/categories/:slug/listings
```

### Enhanced Listings
```
GET /api/v1/listings?category={slug}&sort={price_asc|price_desc|newest|popular}&page={n}&limit={n}
```

### User Auth (Phase 2B)
```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

---

## Frontend Components to Build

### Navigation & Discovery
- [ ] **CategoryNav** - eBay-style horizontal category bar
- [ ] **SearchBar** - Global search with autocomplete
- [ ] **FilterSidebar** - Price range, condition, brand checkboxes
- [ ] **SortDropdown** - Price low/high, newest, popular

### Listing Enhancements
- [ ] **ListingCard** - Add category badge, condition tag, brand
- [ ] **ListingGrid** - Pagination controls, results count
- [ ] **ListingDetail** - Breadcrumb navigation, related items

### Pages to Add
- [ ] `/search` - Search results page
- [ ] `/category/[slug]` - Category browse page
- [ ] `/category/[slug]/[subcategory]` - Subcategory page

---

## Category Taxonomy (eBay-Inspired)

```
Electronics
├── Cameras & Photo
├── Computers & Tablets
├── Cell Phones
├── Video Games
└── Audio Equipment

Fashion
├── Men's Clothing
├── Women's Clothing
├── Sneakers
├── Watches
└── Handbags

Collectibles
├── Trading Cards
├── Sports Memorabilia
├── Coins
├── Art
└── Vintage

Home & Garden
├── Furniture
├── Kitchen
├── Tools
└── Decor

Sports & Outdoors
├── Exercise Equipment
├── Outdoor Gear
├── Team Sports
└── Cycling
```

---

## Extension Upgrade: Category Detection

Update `content.js` to extract category from eBay breadcrumbs:

```javascript
// eBay category breadcrumb: "Electronics > Cameras & Photo > Digital Cameras"
const breadcrumbs = document.querySelectorAll('.seo-breadcrumb-text span');
const categoryPath = Array.from(breadcrumbs).map(el => el.textContent.trim());
// categoryPath = ["Electronics", "Cameras & Photo", "Digital Cameras"]
```

Map eBay categories to Parallel categories in ingestion.

---

## Implementation Order

### Week 1: Schema & API
1. Add category/brand/condition fields to Prisma schema
2. Create Category model and seed initial taxonomy
3. Add search endpoint with filtering
4. Add pagination to listings endpoint

### Week 2: Frontend Core
1. Build CategoryNav component
2. Build SearchBar component
3. Build FilterSidebar component
4. Create /search and /category/[slug] pages

### Week 3: Polish & Extension
1. Update extension to scrape categories
2. Add category auto-detection in API
3. Responsive mobile testing
4. Performance optimization

---

## Success Metrics

- [ ] Users can browse by category
- [ ] Search returns relevant results in <200ms
- [ ] Filters narrow results correctly
- [ ] Pagination loads 20 items per page
- [ ] Extension captures category from eBay
- [ ] Mobile experience is usable

---

## Decisions Made

### 1. Category Mapping Strategy (via Codex consultation)
**Decision:** Deterministic mapping layer + title-based fallback

- Create mapping table: eBay category ID → Parallel category slug
- Use listing signals (title, item specifics, brand) for disambiguation
- Confidence scoring with "Other" fallback for unmapped categories
- Version the mapping as JSON artifact for easy updates
- Business rule: Electronics > Computers takes precedence over Business & Industrial

### 2. Search Engine
**Decision:** Prisma full-text search NOW, Typesense LATER

- SQLite FTS5 is sufficient for <100k listings
- Avoid premature optimization
- Add Typesense in Phase 3 when we hit scale issues
- Keep search endpoint interface stable for future swap

### 3. Brand Detection
**Decision:** Extract from eBay item specifics + title regex

- eBay provides brand in structured data when available
- Fallback: regex patterns for common brands in title
- Build brand dictionary over time from successful extractions

### 4. Condition Mapping
**Decision:** Simplify to 4 tiers

| eBay Condition | Parallel Condition |
|----------------|-------------------|
| New, New with tags | `new` |
| Open box, New without tags | `like-new` |
| Pre-owned, Used | `good` |
| For parts, Not working | `fair` |

---

## Notes

- Prioritize buyer experience over seller tools
- Keep dark mode aesthetic consistent
- Don't over-engineer; ship incrementally
- Test with real eBay imports, not mock data
