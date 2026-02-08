
import { prisma } from '../lib/prisma';
import { checkAvailability } from './jit';
import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let stripe: Stripe;
if (stripeKey) {
  stripe = new Stripe(stripeKey);
}

export const createOnboardingLink = async () => {
  console.log("[STRIPE] Requesting Onboarding Link");
  if (!stripe) {
    console.log("[STRIPE] Mock Mode: Returning fake URL");
    return {
      data: {
        url: "http://localhost:3000?onboarding=success_mock",
        mock: true
      }
    };
  }
  return { error: "Real Stripe integration pending API Key", status: 501 };
};

export const createCheckoutSession = async (listingId: string) => {
  console.log(`[STRIPE] Creating Checkout for ${listingId}`);
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return { error: "Listing not found", status: 404 };
  }

  if (listing.sourceUrl) {
    const status = await checkAvailability(listing.sourceUrl);
    if (status === 'SOLD') {
      await prisma.listing.update({ where: { id: listingId }, data: { status: 'SOLD_ON_SOURCE' } });
      return { error: "Item just sold on eBay! Transaction blocked.", status: 409 };
    }
  }

  if (!stripe) {
    console.log("[STRIPE] Mock Mode: Returning fake URL");
    return {
      data: {
        url: "http://localhost:3000/success_mock",
        mock: true
      }
    };
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: listing.title,
          images: listing.images ? JSON.parse(listing.images).slice(0, 1) : [],
        },
        unit_amount: Math.round((listing.priceParallel + listing.shippingParallel) * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success_mock?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/listing/${listingId}`,
    metadata: { listingId },
  });

  return { data: { url: session.url } };
};

export const handleWebhook = async (body: Buffer, sig: string) => {
  if (!stripe || !webhookSecret) {
    console.error('[STRIPE] Missing API Key or Webhook Secret');
    return { error: 'Configuration Error', status: 500 };
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`[STRIPE] Webhook Error: ${err.message}`);
    return { error: err.message, status: 400 };
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as any;
      console.log(`[STRIPE] Payment success for session: ${session.id}`);
      if (session.metadata?.listingId) {
        const listingId = session.metadata.listingId;
        await prisma.listing.update({ where: { id: listingId }, data: { status: 'SOLD' } });
        console.log(`[STRIPE] Marked listing ${listingId} as SOLD`);
      }
      break;
    default:
      console.log(`[STRIPE] Unhandled event type ${event.type}`);
  }

  return { data: { received: true } };
};
