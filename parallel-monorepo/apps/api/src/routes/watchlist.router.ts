
import express from 'express';
import * as watchlistController from '../controllers/watchlist.controller';

const router = express.Router();

// Get user's watchlist
// GET /api/v1/watchlist
router.get('/', watchlistController.getWatchlist);

// Add to watchlist
// POST /api/v1/watchlist
router.post('/', watchlistController.addToWatchlist);

// Remove from watchlist
// DELETE /api/v1/watchlist/:listingId
router.delete('/:listingId', watchlistController.removeFromWatchlist);

export default router;
