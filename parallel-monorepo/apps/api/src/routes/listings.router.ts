// src/routes/listings.router.ts
import express from 'express';
import * as ListingsController from '../controllers/listings.controller';

const router = express.Router();

router.get('/', ListingsController.getListings);
router.post('/create', ListingsController.createListing);
router.get('/:id', ListingsController.getListingById);
router.put('/:id', ListingsController.updateListing);
router.delete('/:id', ListingsController.deleteListing);

export default router;
