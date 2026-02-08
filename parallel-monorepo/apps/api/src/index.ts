import dotenv from 'dotenv';
dotenv.config();
// (debug log removed)
import express from 'express';
import cors, { type CorsOptions } from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { Prisma } from '@prisma/client';
import { prisma } from './lib/prisma';
import { validateEnv, IS_PROD, parsePort, parseCorsOrigins } from './lib/env';
import categoriesRouter from './routes/categories';
import searchRouter from './routes/search';
import listingsRouter from './routes/listings.router';
import ingestRouter from './routes/ingest.router';
import { checkAvailability } from './services/jit';
import { getShippingRate, estimateWeight } from './services/shipping';
import { calculateParallelPrice } from './services/pricing.service';
import { detectCategory, mapCondition } from './data/categoryMapping';
import { MediaService } from './services/media';


const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const PORT = parsePort(process.env.PORT, 8000);

const corsAllowlist = parseCorsOrigins(process.env.CORS_ORIGINS);
const corsOrigin: CorsOptions["origin"] = (origin, callback) => {
  // Allow non-browser clients (no Origin header)
  if (!origin) return callback(null, true);

  // Dev: allow all origins for local iteration
  if (!IS_PROD) return callback(null, true);

  // Prod: strict allowlist
  if (corsAllowlist.includes(origin)) return callback(null, true);

  return callback(null, false);
};

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// --- ROUTES ---

// 1. Health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'parallel-api-v2' });
});

// Domain Routers
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/listings', listingsRouter);
app.use('/api/v1/ingest', ingestRouter);


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
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  console.log(`[STRIPE] Creating Checkout for ${listingId}`);

  try {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Check availability (JIT)
    if (listing.sourceUrl) {
      const status = await checkAvailability(listing.sourceUrl);
      if (status === 'SOLD') {
        await prisma.listing.update({ where: { id: listingId }, data: { status: 'SOLD_ON_SOURCE' } });
        return res.status(409).json({ error: "Item just sold on eBay! Transaction blocked." });
      }
    }

    // Mock Mode if no key
    if (!stripeKey) {
      console.log("[STRIPE] Mock Mode: Returning fake URL");
      return res.json({ url: "http://localhost:3000/success_mock", mock: true });
    }

    // Real Stripe Session
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: listing.title,
            images: listing.images ? JSON.parse(listing.images).slice(0, 1) : [],
          },
          unit_amount: Math.round((listing.priceParallel + listing.shippingParallel) * 100), // cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success_mock?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/listing/${listingId}`,
      metadata: { listingId },
    });

    return res.json({ url: session.url });

  } catch (e: any) {
    console.error('[STRIPE] Checkout failed:', e);
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
// STRIPE WEBHOOKS
// ============================================

app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!stripeKey || !webhookSecret) {
    console.error('[STRIPE] Missing API Key or Webhook Secret');
    return res.status(500).send('Configuration Error');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Dynamically import Stripe to avoid initialization errors if key is missing
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);
    
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error(`[STRIPE] Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as any;
      console.log(`[STRIPE] Payment success for session: ${session.id}`);
      
      // Logic to mark item as sold
      if (session.metadata?.listingId) {
        const listingId = session.metadata.listingId;
        await prisma.listing.update({ where: { id: listingId }, data: { status: 'SOLD' } });
        console.log(`[STRIPE] Marked listing ${listingId} as SOLD`);
      }
      break;
    default:
      console.log(`[STRIPE] Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`// PARALLEL API v3 listening on port ${PORT}`);
  console.log(`   Categories, Search, Offers, Watchlist enabled`);
});
