/**
 * eBay Category ID to Parallel Category Slug Mapping
 *
 * eBay has 30,000+ categories. We map common ones to our ~40 simplified categories.
 * Unmapped categories fall back to title-based detection or "other".
 *
 * Source: https://pages.ebay.com/sellerinformation/news/categorychanges.html
 */

// Map eBay category IDs to Parallel slugs
export const EBAY_CATEGORY_MAP: Record<string, string> = {
  // Electronics
  "625": "cameras-photo",        // Cameras & Photo
  "31388": "cell-phones",        // Cell Phones & Accessories
  "58058": "computers-tablets",  // Computers/Tablets & Networking
  "293": "video-games",          // Video Games & Consoles
  "15052": "audio-equipment",    // Consumer Electronics > Portable Audio
  "32852": "tv-video",           // TV, Video & Home Audio

  // Fashion - Men
  "1059": "mens-clothing",       // Men's Clothing
  "11450": "mens-clothing",      // Clothing, Shoes & Accessories > Men

  // Fashion - Women
  "15724": "womens-clothing",    // Women's Clothing
  "11554": "womens-clothing",    // Clothing, Shoes & Accessories > Women

  // Fashion - Shoes
  "93427": "sneakers",           // Athletic Shoes
  "63889": "sneakers",           // Men's Shoes
  "3034": "sneakers",            // Women's Shoes

  // Fashion - Accessories
  "14324": "watches",            // Watches
  "281": "jewelry",              // Jewelry & Watches
  "169291": "handbags",          // Women's Bags & Handbags
  "79720": "sunglasses",         // Sunglasses & Fashion Eyewear

  // Collectibles
  "868": "trading-cards",        // Sports Trading Cards
  "183454": "trading-cards",     // Collectible Card Games
  "64482": "sports-memorabilia", // Sports Mem, Cards & Fan Shop
  "11116": "coins-currency",     // Coins & Paper Money
  "550": "art",                  // Art
  "20081": "vintage-antiques",   // Antiques
  "63": "comics-manga",          // Comic Books

  // Home & Garden
  "11700": "furniture",          // Home & Garden > Furniture
  "20625": "kitchen-dining",     // Kitchen, Dining & Bar
  "631": "tools-workshop",       // Tools & Workshop Equipment
  "10033": "home-decor",         // Home Decor
  "20469": "bedding",            // Bedding

  // Sports & Outdoors
  "888": "exercise-fitness",     // Sporting Goods
  "1492": "outdoor-gear",        // Camping & Hiking
  "7294": "cycling",             // Cycling
  "1513": "golf",                // Golf
  "159049": "team-sports",       // Team Sports

  // Motors
  "6000": "car-parts",           // eBay Motors > Parts & Accessories
  "10063": "motorcycle-parts",   // Motorcycle Parts
  "66482": "wheels-tires",       // Wheels, Tires & Parts
};

// Keyword-based fallback detection (when category ID unavailable)
export const KEYWORD_CATEGORY_MAP: Array<{ keywords: string[]; slug: string }> = [
  // Electronics
  { keywords: ["camera", "canon", "nikon", "sony a7", "fujifilm", "lens"], slug: "cameras-photo" },
  { keywords: ["iphone", "samsung galaxy", "pixel", "phone"], slug: "cell-phones" },
  { keywords: ["macbook", "laptop", "ipad", "tablet", "computer"], slug: "computers-tablets" },
  { keywords: ["playstation", "xbox", "nintendo", "ps5", "gaming"], slug: "video-games" },
  { keywords: ["headphones", "airpods", "speaker", "audio"], slug: "audio-equipment" },

  // Fashion
  { keywords: ["jordan", "yeezy", "nike", "adidas", "sneaker", "shoe", "dunk"], slug: "sneakers" },
  { keywords: ["rolex", "omega", "cartier", "watch", "seiko", "patek"], slug: "watches" },
  { keywords: ["louis vuitton", "gucci", "chanel", "hermes", "bag", "purse"], slug: "handbags" },
  { keywords: ["ring", "necklace", "bracelet", "earring", "diamond", "gold 14k", "silver 925"], slug: "jewelry" },

  // Collectibles
  { keywords: ["pokemon", "charizard", "magic the gathering", "yugioh", "psa", "trading card", "sports card"], slug: "trading-cards" },
  { keywords: ["signed", "autograph", "jersey", "memorabilia"], slug: "sports-memorabilia" },
  { keywords: ["coin", "silver eagle", "gold coin", "currency", "banknote"], slug: "coins-currency" },
  { keywords: ["painting", "print", "sculpture", "artwork", "art"], slug: "art" },
  { keywords: ["antique", "vintage", "retro", "mid century"], slug: "vintage-antiques" },

  // Home & Garden
  { keywords: ["chair", "sofa", "table", "desk", "furniture", "eames", "herman miller"], slug: "furniture" },
  { keywords: ["kitchen", "cookware", "knife", "appliance"], slug: "kitchen-dining" },
  { keywords: ["tool", "drill", "saw", "wrench", "dewalt", "milwaukee"], slug: "tools-workshop" },

  // Sports
  { keywords: ["treadmill", "weights", "dumbbell", "gym", "fitness"], slug: "exercise-fitness" },
  { keywords: ["tent", "camping", "hiking", "backpack", "outdoor"], slug: "outdoor-gear" },
  { keywords: ["bike", "bicycle", "cycling"], slug: "cycling" },
  { keywords: ["golf club", "golf ball", "titleist", "callaway"], slug: "golf" },
];

// Brand to category hints
export const BRAND_CATEGORY_HINTS: Record<string, string> = {
  // Watches
  "rolex": "watches",
  "omega": "watches",
  "cartier": "watches",
  "patek philippe": "watches",
  "audemars piguet": "watches",
  "tag heuer": "watches",

  // Sneakers
  "nike": "sneakers",
  "adidas": "sneakers",
  "jordan": "sneakers",
  "new balance": "sneakers",
  "yeezy": "sneakers",

  // Handbags
  "louis vuitton": "handbags",
  "gucci": "handbags",
  "chanel": "handbags",
  "hermes": "handbags",
  "prada": "handbags",

  // Electronics
  "apple": "computers-tablets",
  "sony": "cameras-photo",
  "canon": "cameras-photo",
  "nikon": "cameras-photo",

  // Furniture
  "herman miller": "furniture",
  "eames": "furniture",
  "knoll": "furniture",
};

/**
 * Detect category from eBay data
 */
export function detectCategory(data: {
  categoryId?: string;
  categoryPath?: string;
  title: string;
  brand?: string;
}): string | null {
  // 1. Try direct category ID mapping
  if (data.categoryId && EBAY_CATEGORY_MAP[data.categoryId]) {
    return EBAY_CATEGORY_MAP[data.categoryId];
  }

  // 2. Try brand hint
  if (data.brand) {
    const brandLower = data.brand.toLowerCase();
    if (BRAND_CATEGORY_HINTS[brandLower]) {
      return BRAND_CATEGORY_HINTS[brandLower];
    }
  }

  // 3. Keyword detection from title
  const titleLower = data.title.toLowerCase();
  for (const mapping of KEYWORD_CATEGORY_MAP) {
    for (const keyword of mapping.keywords) {
      if (titleLower.includes(keyword.toLowerCase())) {
        return mapping.slug;
      }
    }
  }

  // 4. No match - return null (will be "uncategorized")
  return null;
}

/**
 * Map eBay condition to Parallel condition
 */
export function mapCondition(ebayCondition?: string): string {
  if (!ebayCondition) return "good";

  const condition = ebayCondition.toLowerCase();

  if (condition.includes("new") && !condition.includes("without")) {
    return "new";
  }
  if (condition.includes("open box") || condition.includes("new without") || condition.includes("like new")) {
    return "like-new";
  }
  if (condition.includes("pre-owned") || condition.includes("used") || condition.includes("good")) {
    return "good";
  }
  if (condition.includes("parts") || condition.includes("not working") || condition.includes("fair")) {
    return "fair";
  }

  return "good"; // Default
}
