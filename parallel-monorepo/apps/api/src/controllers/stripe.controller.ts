
import { Request, Response } from 'express';
import * as stripeService from '../services/stripe.service';

export const createOnboardingLink = async (req: Request, res: Response) => {
    try {
        const result = await stripeService.createOnboardingLink();
        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }
        res.json(result.data);
    } catch (error) {
        console.error('[STRIPE] Onboarding failed:', error);
        res.status(500).json({ error: 'Onboarding failed' });
    }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
    try {
        const { listingId } = req.body;
        const result = await stripeService.createCheckoutSession(listingId);
        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }
        res.json(result.data);
    } catch (error) {
        console.error('[STRIPE] Checkout failed:', error);
        res.status(500).json({ error: 'Checkout failed' });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const sig = req.headers['stripe-signature'] as string;
        const result = await stripeService.handleWebhook(req.body, sig);
        if (result.error) {
            return res.status(result.status || 500).send(`Webhook Error: ${result.error}`);
        }
        res.json({ received: true });
    } catch (error) {
        console.error('[STRIPE] Webhook handling failed:', error);
        res.status(400).send(`Webhook Error: ${(error as Error).message}`);
    }
};
