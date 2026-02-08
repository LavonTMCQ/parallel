import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { checkAvailability } from '../services/jit';
import { getShippingRate, estimateWeight } from '../services/shipping';
import { detectCategory, mapCondition } from '../data/categoryMapping';
import { MediaService } from '../services/media';

const router = express.Router();

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

// Helper: Format listing with parsed images
function formatListing(listing: any) {
  return {
    ...listing,
    images: typeof listing.images === 'string' ? JSON.parse(listing.images) : listing.images
  };
}

// PLACEHOLDER - Will be filled with extracted listings routes from index.ts
// TODO: Extract listings routes from index.ts lines 99-644

export default router;