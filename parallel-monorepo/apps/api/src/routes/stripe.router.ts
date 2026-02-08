
import express from 'express';
import * as stripeController from '../controllers/stripe.controller';

const router = express.Router();

// Stripe Onboarding Link
// POST /api/v1/stripe/onboarding/link
router.post('/onboarding/link', stripeController.createOnboardingLink);

// Stripe Checkout Session
// POST /api/v1/stripe/checkout/session
router.post('/checkout/session', stripeController.createCheckoutSession);

// Stripe Webhook Handler
// POST /api/v1/stripe/webhooks
router.post('/webhooks', express.raw({ type: 'application/json' }), stripeController.handleWebhook);


export default router;
