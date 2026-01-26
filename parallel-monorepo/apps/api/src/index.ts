import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { PrismaClient, Prisma } from '@prisma/client';
import { checkAvailability } from './services/jit';
import { getShippingRate, estimateWeight } from './services/shipping';
import { detectCategory, mapCondition } from './data/categoryMapping';

// Initialize Prisma
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Types
interface PricingInputs {
  sourcePrice: number;
  sourceShipping: number;
  parallelShipping: number;
}

// Logic
function calculateParallelPrice(inputs: PricingInputs) {
  const { sourcePrice, sourceShipping, parallelShipping } = inputs;
  const sourceTotal = sourcePrice + sourceShipping;
  const targetBuyerPrice = Number((sourceTotal * 0.95).toFixed(2));
  let parallelListPrice = Number((targetBuyerPrice - parallelShipping).toFixed(2));
  if (parallelListPrice < 0) parallelListPrice = 0;

  return {
    sourceTotal,
    targetBuyerPrice,
    parallelListPrice,
    savings: Number((sourceTotal - targetBuyerPrice).toFixed(2))
  };
}

// Helper: Format listing with parsed images
function formatListing(listing: any) {
  return {
    ...listing,
    images: typeof listing.images === 'string' ? JSON.parse(listing.images) : listing.images
  };
}

// --- ROUTES ---

// 1. Health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'parallel-api-v2' });
});

// ============================================
// CATEGORIES
// ============================================

// Get all categories (with hierarchy)
app.get('/api/v1/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        _count: { select: { listings: true } }
      }
    });

    res.json(categories);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single category with listings
app.get('/api/v1/categories/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || 'newest';

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        parent: true
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get category IDs (include children for parent categories)
    const categoryIds = [category.id, ...category.children.map(c => c.id)];

    // Build sort order
    let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { priceParallel: 'asc' };
    if (sort === 'price_desc') orderBy = { priceParallel: 'desc' };
    if (sort === 'popular') orderBy = { viewCount: 'desc' };

    // Get listings
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: { categoryId: { in: categoryIds }, status: 'ACTIVE' },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true }
      }),
      prisma.listing.count({
        where: { categoryId: { in: categoryIds }, status: 'ACTIVE' }
      })
    ]);

    res.json({
      category,
      listings: listings.map(formatListing),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to fetch category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// ============================================
// SEARCH
// ============================================

app.get('/api/v1/search', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const category = req.query.category as string;
    const condition = req.query.condition as string;
    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice = parseFloat(req.query.maxPrice as string) || 999999;
    const brand = req.query.brand as string;
    const sort = (req.query.sort as string) || 'newest';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Build where clause
    const where: Prisma.ListingWhereInput = {
      status: 'ACTIVE',
      priceParallel: { gte: minPrice, lte: maxPrice }
    };

    // Text search (simple LIKE for SQLite)
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { brand: { contains: q } }
      ];
    }

    // Category filter
    if (category) {
      const cat = await prisma.category.findUnique({
        where: { slug: category },
        include: { children: true }
      });
      if (cat) {
        const categoryIds = [cat.id, ...cat.children.map(c => c.id)];
        where.categoryId = { in: categoryIds };
      }
    }

    // Condition filter
    if (condition) {
      where.condition = condition;
    }

    // Brand filter
    if (brand) {
      where.brand = { contains: brand };
    }

    // Build sort order
    let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { priceParallel: 'asc' };
    if (sort === 'price_desc') orderBy = { priceParallel: 'desc' };
    if (sort === 'popular') orderBy = { viewCount: 'desc' };

    // Execute query
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true }
      }),
      prisma.listing.count({ where })
    ]);

    // Get aggregations for filters
    const [brands, conditions] = await Promise.all([
      prisma.listing.groupBy({
        by: ['brand'],
        where: { status: 'ACTIVE', brand: { not: null } },
        _count: true,
        orderBy: { _count: { brand: 'desc' } },
        take: 20
      }),
      prisma.listing.groupBy({
        by: ['condition'],
        where: { status: 'ACTIVE', condition: { not: null } },
        _count: true
      })
    ]);

    res.json({
      query: q,
      listings: listings.map(formatListing),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        brands: brands.filter(b => b.brand).map(b => ({ name: b.brand, count: b._count })),
        conditions: conditions.filter(c => c.condition).map(c => ({ name: c.condition, count: c._count }))
      }
    });
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ============================================
// LISTINGS
// ============================================

// List all (with pagination and filters)
app.get('/api/v1/listings', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || 'newest';
    const category = req.query.category as string;

    // Build where clause
    const where: Prisma.ListingWhereInput = { status: 'ACTIVE' };

    if (category) {
      const cat = await prisma.category.findUnique({
        where: { slug: category },
        include: { children: true }
      });
      if (cat) {
        const categoryIds = [cat.id, ...cat.children.map(c => c.id)];
        where.categoryId = { in: categoryIds };
      }
    }

    // Build sort order
    let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { priceParallel: 'asc' };
    if (sort === 'price_desc') orderBy = { priceParallel: 'desc' };
    if (sort === 'popular') orderBy = { viewCount: 'desc' };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true }
      }),
      prisma.listing.count({ where })
    ]);

    res.json({
      listings: listings.map(formatListing),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Get single listing
app.get('/api/v1/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        user: true,
        category: { include: { parent: true } }
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Increment view count
    await prisma.listing.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    // Get related listings (same category)
    let related: any[] = [];
    if (listing.categoryId) {
      related = await prisma.listing.findMany({
        where: {
          categoryId: listing.categoryId,
          id: { not: id },
          status: 'ACTIVE'
        },
        take: 4,
        orderBy: { viewCount: 'desc' }
      });
    }

    res.json({
      ...formatListing(listing),
      related: related.map(formatListing)
    });
  } catch (error) {
    console.error(`Failed to fetch ${req.params.id}`, error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// ============================================
// INGEST (Updated with categories)
// ============================================

app.post('/api/v1/ingest', async (req, res) => {
  try {
    const {
      source_platform,
      source_id,
      title,
      price_source,
      shipping_source,
      images,
      url,
      seller_rating_score,
      // New fields from extension
      category_id,
      category_path,
      brand,
      condition: ebayCondition
    } = req.body;

    console.log(`[INGEST] Receiving: ${title}`);

    // A. Quality Gates
    if (seller_rating_score && seller_rating_score < 80) {
      return res.status(400).json({
        error: 'QUALITY_GATE_FAILED',
        message: 'Seller rating is below 80% threshold.'
      });
    }

    // B. Detect category
    const detectedSlug = detectCategory({
      categoryId: category_id,
      categoryPath: category_path,
      title,
      brand
    });

    let categoryId: string | null = null;
    if (detectedSlug) {
      const category = await prisma.category.findUnique({ where: { slug: detectedSlug } });
      if (category) categoryId = category.id;
    }

    // C. Map condition
    const mappedCondition = mapCondition(ebayCondition);

    // D. Calculate Pricing
    const weight = estimateWeight(title);
    const estimatedShipping = await getShippingRate({
      weight_oz: weight,
      category: title
    });

    const pricing = calculateParallelPrice({
      sourcePrice: price_source,
      sourceShipping: shipping_source,
      parallelShipping: estimatedShipping
    });

    // E. Write to DB
    const listing = await prisma.listing.create({
      data: {
        title,
        sourcePlatform: source_platform || 'unknown',
        sourceId: source_id || 'unknown',
        sourceUrl: url || '',
        description: 'Imported via Extension',
        images: JSON.stringify(images || []),

        // Category & Discovery
        categoryId,
        sourceCategoryId: category_id || null,
        sourceCategoryPath: category_path || null,
        brand: brand || null,
        condition: mappedCondition,

        // Pricing
        priceSource: price_source || 0.0,
        shippingSource: shipping_source || 0.0,
        priceParallel: pricing.parallelListPrice,
        shippingParallel: estimatedShipping,
        buyerSavings: pricing.savings
      }
    });

    console.log(`[SUCCESS] Persisted Listing ${listing.id} [${detectedSlug || 'uncategorized'}]`);

    return res.status(201).json({
      id: listing.id,
      status: 'IMPORTED',
      category: detectedSlug,
      pricing_strategy: pricing
    });

  } catch (error) {
    console.error("Ingest Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete Listing
app.delete('/api/v1/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.listing.delete({ where: { id } });
    console.log(`[DELETE] Listing ${id} removed.`);
    res.status(200).json({ status: 'DELETED' });
  } catch (error) {
    console.error(`Failed to delete ${req.params.id}`, error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ============================================
// STRIPE / CHECKOUT (Unchanged)
// ============================================

app.post('/api/v1/onboarding/link', async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  console.log("[STRIPE] Requesting Onboarding Link");

  if (!stripeKey) {
    console.log("[STRIPE] Mock Mode: Returning fake URL");
    return res.json({
      url: "http://localhost:3000?onboarding=success_mock",
      mock: true
    });
  }

  res.status(501).json({ error: "Real Stripe integration pending API Key" });
});

app.post('/api/v1/checkout/session', async (req, res) => {
  const { listingId } = req.body;
  console.log(`[STRIPE] Creating Checkout for ${listingId}`);

  try {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || !listing.sourceUrl) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const status = await checkAvailability(listing.sourceUrl);

    if (status === 'SOLD') {
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: 'SOLD_ON_SOURCE' }
      });
      return res.status(409).json({ error: "Item just sold on eBay! Transaction blocked." });
    }

    if (status === 'ERROR') {
      return res.status(500).json({ error: "Could not verify item availability. Try again." });
    }

    return res.json({
      url: "http://localhost:3000/success_mock",
      mock: true
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Checkout failed" });
  }
});

// ============================================
// USERS
// ============================================

app.get('/api/v1/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        listings: { include: { category: true } },
        reviewsReceived: { include: { author: true } }
      }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const formattedListings = user.listings.map(formatListing);

    // Calculate average rating
    const avgRating = user.reviewsReceived.length > 0
      ? user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0) / user.reviewsReceived.length
      : null;

    res.json({
      ...user,
      listings: formattedListings,
      stats: {
        totalListings: user.listings.length,
        totalReviews: user.reviewsReceived.length,
        avgRating: avgRating ? Number(avgRating.toFixed(1)) : null
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`// PARALLEL API v2 listening on port ${PORT}`);
  console.log(`   Categories, Search, Pagination enabled`);
});
