// src/routes/listings.router.ts
import express from 'express';
import * as ListingsController from '../controllers/listings.controller';
import * as offersController from '../controllers/offers.controller';

const router = express.Router();

router.get('/', ListingsController.getListings);
router.post('/create', ListingsController.createListing);
router.get('/:id', ListingsController.getListingById);
router.put('/:id', ListingsController.updateListing);
router.delete('/:id', ListingsController.deleteListing);

// Nested route for offers on a listing
router.get('/:id/offers', offersController.getOffersForListing);

export default router;
