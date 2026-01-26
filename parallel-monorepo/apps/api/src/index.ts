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

// Get single listing (enhanced with similar items, seller items, watchers)
app.get('/api/v1/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            listings: {
              where: { id: { not: id }, status: 'ACTIVE' },
              take: 6,
              orderBy: { createdAt: 'desc' }
            },
            reviewsReceived: true
          }
        },
        category: { include: { parent: true } },
        watchers: true
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

    // Get similar listings (same category, different item)
    let similarItems: any[] = [];
    if (listing.categoryId) {
      similarItems = await prisma.listing.findMany({
        where: {
          categoryId: listing.categoryId,
          id: { not: id },
          status: 'ACTIVE'
        },
        take: 8,
        orderBy: { viewCount: 'desc' },
        include: { category: true }
      });
    }

    // Get more from this category (broader)
    let categoryItems: any[] = [];
    if (listing.category?.parentId) {
      categoryItems = await prisma.listing.findMany({
        where: {
          category: { parentId: listing.category.parentId },
          id: { not: id },
          status: 'ACTIVE'
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { category: true }
      });
    }

    // Calculate seller stats
    const sellerStats = listing.user ? {
      totalListings: listing.user.listings.length + 1, // +1 for current
      avgRating: listing.user.reviewsReceived.length > 0
        ? Number((listing.user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0) / listing.user.reviewsReceived.length).toFixed(1))
        : null,
      totalReviews: listing.user.reviewsReceived.length,
      positivePercent: listing.user.reviewsReceived.length > 0
        ? Math.round((listing.user.reviewsReceived.filter(r => r.rating >= 4).length / listing.user.reviewsReceived.length) * 100)
        : null
    } : null;

    // Check if current session is watching
    const isWatching = sessionId
      ? listing.watchers.some(w => w.sessionId === sessionId)
      : false;

    res.json({
      ...formatListing(listing),
      watcherCount: listing.watchers.length,
      isWatching,
      sellerStats,
      sellerOtherItems: listing.user?.listings.map(formatListing) || [],
      similarItems: similarItems.map(formatListing),
      categoryItems: categoryItems.map(formatListing)
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
// MANUAL LISTING CREATION (Sell Page)
// ============================================

app.post('/api/v1/listings/create', async (req, res) => {
  try {
    const {
      title,
      description,
      categoryId,
      brand,
      condition,
      price,
      shippingOption,
      shippingPrice,
      images,
      acceptsOffers,
      specifics,
      clerkUserId
    } = req.body;

    // Validation
    if (!title || title.length < 10) {
      return res.status(400).json({ error: 'Title must be at least 10 characters' });
    }
    if (!condition) {
      return res.status(400).json({ error: 'Condition is required' });
    }
    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }
    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    // Find or create user if clerkUserId provided
    let userId: string | null = null;
    if (clerkUserId) {
      let user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
      if (!user) {
        // Create a placeholder user - will be updated with full profile via webhook
        user = await prisma.user.create({
          data: {
            clerkId: clerkUserId,
            email: `${clerkUserId}@placeholder.parallel`, // Temporary until webhook updates
          }
        });
        console.log(`[AUTH] Created placeholder user for Clerk ID: ${clerkUserId}`);
      }
      userId = user.id;
    }

    // Format specifics into description if provided
    let fullDescription = description || '';
    if (specifics && specifics.length > 0) {
      const specsText = specifics.map((s: { key: string; value: string }) => `${s.key}: ${s.value}`).join('\n');
      fullDescription = fullDescription ? `${fullDescription}\n\n--- Item Specifics ---\n${specsText}` : specsText;
    }

    // Create the listing
    const listing = await prisma.listing.create({
      data: {
        title,
        description: fullDescription,
        sourcePlatform: 'parallel',
        sourceId: `manual-${Date.now()}`,
        sourceUrl: null,
        images: JSON.stringify(images),

        // Category & Discovery
        categoryId: categoryId || null,
        brand: brand || null,
        condition,

        // Pricing - For manual listings, source price = parallel price
        // since there's no external source to compare against
        priceSource: price,
        shippingSource: shippingPrice,
        priceParallel: price,
        shippingParallel: shippingPrice,
        buyerSavings: 0, // No savings for direct listings

        // Owner
        userId: userId,
      }
    });

    console.log(`[CREATE] Manual listing ${listing.id}: ${title}`);

    return res.status(201).json({
      id: listing.id,
      status: 'CREATED',
      title: listing.title,
      price: listing.priceParallel,
      message: 'Listing created successfully'
    });

  } catch (error) {
    console.error('Failed to create listing:', error);
    return res.status(500).json({ error: 'Failed to create listing' });
  }
});

// Update existing listing
app.put('/api/v1/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      categoryId,
      brand,
      condition,
      price,
      shippingPrice,
      images,
      status
    } = req.body;

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(categoryId && { categoryId }),
        ...(brand !== undefined && { brand }),
        ...(condition && { condition }),
        ...(price && { priceParallel: price, priceSource: price }),
        ...(shippingPrice !== undefined && { shippingParallel: shippingPrice, shippingSource: shippingPrice }),
        ...(images && { images: JSON.stringify(images) }),
        ...(status && { status }),
      }
    });

    console.log(`[UPDATE] Listing ${id} updated`);

    return res.json({
      id: updatedListing.id,
      status: 'UPDATED',
      message: 'Listing updated successfully'
    });

  } catch (error) {
    console.error('Failed to update listing:', error);
    return res.status(500).json({ error: 'Failed to update listing' });
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
// OFFERS
// ============================================

// Create an offer
app.post('/api/v1/offers', async (req, res) => {
  try {
    const { listingId, amount, message, buyerEmail, buyerName } = req.body;

    if (!listingId || !amount) {
      return res.status(400).json({ error: 'listingId and amount are required' });
    }

    // Get listing to validate offer
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Validate offer amount (must be at least 50% of price)
    const minOffer = listing.priceParallel * 0.5;
    if (amount < minOffer) {
      return res.status(400).json({
        error: 'OFFER_TOO_LOW',
        message: `Minimum offer is $${minOffer.toFixed(2)} (50% of listing price)`
      });
    }

    // Create offer with 48h expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const offer = await prisma.offer.create({
      data: {
        listingId,
        amount,
        message: message || null,
        buyerEmail: buyerEmail || null,
        buyerName: buyerName || null,
        expiresAt
      },
      include: { listing: true }
    });

    console.log(`[OFFER] New offer $${amount} on listing ${listingId}`);

    res.status(201).json({
      id: offer.id,
      status: offer.status,
      amount: offer.amount,
      expiresAt: offer.expiresAt,
      message: 'Offer submitted successfully'
    });
  } catch (error) {
    console.error('Failed to create offer:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// Get offers for a listing
app.get('/api/v1/listings/:id/offers', async (req, res) => {
  try {
    const { id } = req.params;

    const offers = await prisma.offer.findMany({
      where: { listingId: id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(offers);
  } catch (error) {
    console.error('Failed to fetch offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Respond to an offer (accept/decline/counter)
app.post('/api/v1/offers/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, counterAmount, counterMessage } = req.body;

    if (!['ACCEPT', 'DECLINE', 'COUNTER'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be ACCEPT, DECLINE, or COUNTER' });
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: { listing: true }
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.status !== 'PENDING') {
      return res.status(400).json({ error: 'Offer has already been responded to' });
    }

    let status = action === 'ACCEPT' ? 'ACCEPTED' : action === 'DECLINE' ? 'DECLINED' : 'COUNTERED';

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: {
        status,
        counterAmount: action === 'COUNTER' ? counterAmount : null,
        counterMessage: action === 'COUNTER' ? counterMessage : null
      }
    });

    console.log(`[OFFER] Offer ${id} ${status}`);

    res.json({
      id: updatedOffer.id,
      status: updatedOffer.status,
      counterAmount: updatedOffer.counterAmount,
      message: `Offer ${status.toLowerCase()}`
    });
  } catch (error) {
    console.error('Failed to respond to offer:', error);
    res.status(500).json({ error: 'Failed to respond to offer' });
  }
});

// ============================================
// WATCHLIST
// ============================================

// Add to watchlist
app.post('/api/v1/watchlist', async (req, res) => {
  try {
    const { listingId } = req.body;
    const sessionId = req.headers['x-session-id'] as string;

    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'x-session-id header is required' });
    }

    // Check if listing exists
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check if already watching
    const existing = await prisma.watchlist.findUnique({
      where: { listingId_sessionId: { listingId, sessionId } }
    });

    if (existing) {
      return res.status(409).json({ error: 'Already watching this listing' });
    }

    // Add to watchlist
    await prisma.watchlist.create({
      data: { listingId, sessionId }
    });

    // Update favorite count
    await prisma.listing.update({
      where: { id: listingId },
      data: { favoriteCount: { increment: 1 } }
    });

    // Get updated count
    const watcherCount = await prisma.watchlist.count({ where: { listingId } });

    console.log(`[WATCHLIST] Added listing ${listingId}`);

    res.status(201).json({
      success: true,
      watcherCount,
      message: 'Added to watchlist'
    });
  } catch (error) {
    console.error('Failed to add to watchlist:', error);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

// Remove from watchlist
app.delete('/api/v1/watchlist/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'x-session-id header is required' });
    }

    await prisma.watchlist.delete({
      where: { listingId_sessionId: { listingId, sessionId } }
    });

    // Update favorite count
    await prisma.listing.update({
      where: { id: listingId },
      data: { favoriteCount: { decrement: 1 } }
    });

    // Get updated count
    const watcherCount = await prisma.watchlist.count({ where: { listingId } });

    console.log(`[WATCHLIST] Removed listing ${listingId}`);

    res.json({
      success: true,
      watcherCount,
      message: 'Removed from watchlist'
    });
  } catch (error) {
    console.error('Failed to remove from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

// Get user's watchlist
app.get('/api/v1/watchlist', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'x-session-id header is required' });
    }

    const watchlist = await prisma.watchlist.findMany({
      where: { sessionId },
      include: {
        listing: {
          include: { category: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(watchlist.map(w => formatListing(w.listing)));
  } catch (error) {
    console.error('Failed to fetch watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`// PARALLEL API v3 listening on port ${PORT}`);
  console.log(`   Categories, Search, Offers, Watchlist enabled`);
});
