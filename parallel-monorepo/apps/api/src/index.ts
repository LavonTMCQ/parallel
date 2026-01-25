import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { checkAvailability } from './services/jit';
import { getShippingRate, estimateWeight } from './services/shipping';

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

// --- ROUTES ---

// 1. Health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'parallel-api-v1' });
});

// 2. Ingest (Write)
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
      seller_rating_score 
    } = req.body;

    console.log(`[INGEST] Receiving: ${title}`);

    // A. Quality Gates
    if (seller_rating_score && seller_rating_score < 80) {
      return res.status(400).json({ 
        error: 'QUALITY_GATE_FAILED', 
        message: 'Seller rating is below 80% threshold.' 
      });
    }

    // B. Calculate Pricing
    // 1. Estimate Shipping
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

    // C. Write to DB (Prisma)
    const listing = await prisma.listing.create({
      data: {
        title,
        sourcePlatform: source_platform || 'unknown',
        sourceId: source_id || 'unknown',
        sourceUrl: url || '',
        description: 'Imported via Extension',
        images: JSON.stringify(images || []), // Store as JSON string
        
        priceSource: price_source || 0.0,
        shippingSource: shipping_source || 0.0,
        
        priceParallel: pricing.parallelListPrice,
        shippingParallel: estimatedShipping,
        buyerSavings: pricing.savings
      }
    });

    console.log(`[SUCCESS] Persisted Listing ${listing.id}`);
    
    // Return the shape expected by the extension
    return res.status(201).json({
      id: listing.id,
      status: 'IMPORTED',
      pricing_strategy: pricing
    });

  } catch (error) {
    console.error("Ingest Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. List (Read for Frontend)
app.get('/api/v1/listings', async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Parse images back to array
    const formatted = listings.map(l => ({
      ...l,
      images: JSON.parse(l.images)
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// 3a. Get Single Listing
app.get('/api/v1/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { user: true }
    });
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Parse images
    const formatted = {
      ...listing,
      images: JSON.parse(listing.images)
    };

    res.json(formatted);
  } catch (error) {
    console.error(`Failed to fetch ${req.params.id}`, error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// 4. Delete Listing
app.delete('/api/v1/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.listing.delete({
      where: { id }
    });
    console.log(`[DELETE] Listing ${id} removed.`);
    res.status(200).json({ status: 'DELETED' });
  } catch (error) {
    console.error(`Failed to delete ${req.params.id}`, error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// 5. Stripe Onboarding (Mock)
app.post('/api/v1/onboarding/link', async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  console.log("[STRIPE] Requesting Onboarding Link");

  if (!stripeKey) {
    console.log("[STRIPE] Mock Mode: Returning fake URL");
    // Simulate a successful onboarding URL
    return res.json({ 
      url: "http://localhost:3000?onboarding=success_mock", 
      mock: true 
    });
  }

  // Real Stripe logic would go here
  // const account = await stripe.accounts.create({ type: 'express' });
  // const link = await stripe.accountLinks.create(...);
  res.status(501).json({ error: "Real Stripe integration pending API Key" });
});

// 6. Checkout Session (Mock with JIT)
app.post('/api/v1/checkout/session', async (req, res) => {
  const { listingId } = req.body;
  console.log(`[STRIPE] Creating Checkout for ${listingId}`);

  try {
    // 1. Get Listing URL
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || !listing.sourceUrl) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // 2. JIT Safety Check
    const status = await checkAvailability(listing.sourceUrl);
    
    if (status === 'SOLD') {
      // Mark as sold in our DB too
      await prisma.listing.update({ 
        where: { id: listingId }, 
        data: { status: 'SOLD_ON_SOURCE' } 
      });
      return res.status(409).json({ error: "Item just sold on eBay! Transaction blocked." });
    }

    if (status === 'ERROR') {
      return res.status(500).json({ error: "Could not verify item availability. Try again." });
    }

    // 3. Create Session (Mock)
    return res.json({
      url: "http://localhost:3000/success_mock",
      mock: true
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Checkout failed" });
  }
});

// 7. Get User Profile
app.get('/api/v1/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        listings: true,
        reviewsReceived: {
          include: { author: true }
        }
      }
    });
    
    if (!user) return res.status(404).json({ error: "User not found" });

    // Parse images in listings
    const formattedListings = user.listings.map(l => ({
      ...l,
      images: JSON.parse(l.images)
    }));

    res.json({ ...user, listings: formattedListings });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.listen(PORT, () => {
  console.log(`// PARALLEL API listening on port ${PORT}`);
});
