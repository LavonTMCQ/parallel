
import express from 'express';
import * as offersController from '../controllers/offers.controller';

const router = express.Router();

// Create an offer
// POST /api/v1/offers
router.post('/', offersController.createOffer);

// Respond to an offer (accept/decline/counter)
// POST /api/v1/offers/:id/respond
router.post('/:id/respond', offersController.respondToOffer);

export default router;
