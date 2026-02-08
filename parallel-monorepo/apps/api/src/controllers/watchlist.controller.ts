
import { Request, Response } from 'express';
import * as watchlistService from '../services/watchlist.service';

export const getWatchlist = async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    if (!sessionId) {
      return res.status(400).json({ error: 'x-session-id header is required' });
    }
    const watchlist = await watchlistService.getWatchlist(sessionId);
    res.json(watchlist);
  } catch (error) {
    console.error('Failed to fetch watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
};

export const addToWatchlist = async (req: Request, res: Response) => {
  try {
    const { listingId } = req.body;
    const sessionId = req.headers['x-session-id'] as string;
    const result = await watchlistService.addToWatchlist(listingId, sessionId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Failed to add to watchlist:', error);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
};

export const removeFromWatchlist = async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;
    const sessionId = req.headers['x-session-id'] as string;
    const result = await watchlistService.removeFromWatchlist(listingId, sessionId);
     if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    console.error('Failed to remove from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
};
