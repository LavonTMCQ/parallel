
import { Request, Response } from 'express';
import * as offersService from '../services/offers.service';

export const createOffer = async (req: Request, res: Response) => {
  try {
    const { listingId, amount, message, buyerEmail, buyerName } = req.body;
    const result = await offersService.createOffer(listingId, amount, message, buyerEmail, buyerName);
    if (result.error) {
      return res.status(result.status).json({ error: result.error, message: result.message });
    }
    res.status(201).json(result.offer);
  } catch (error) {
    console.error('Failed to create offer:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
};

export const getOffersForListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const offers = await offersService.getOffersForListing(id);
    res.json(offers);
  } catch (error) {
    console.error('Failed to fetch offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
};

export const respondToOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, counterAmount, counterMessage } = req.body;
    const result = await offersService.respondToOffer(id, action, counterAmount, counterMessage);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.offer);
  } catch (error) {
    console.error('Failed to respond to offer:', error);
    res.status(500).json({ error: 'Failed to respond to offer' });
  }
};
