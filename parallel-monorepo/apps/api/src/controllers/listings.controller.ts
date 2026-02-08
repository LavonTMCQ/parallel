// src/controllers/listings.controller.ts
import { Request, Response } from 'express';
import * as ListingsService from '../services/listings.service';

export async function getListings(req: Request, res: Response) {
  try {
    const { page, limit, sort, category } = req.query;
    const result = await ListingsService.getAll({
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
      sort: sort as string || 'newest',
      category: category as string,
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

export async function getListingById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const sessionId = req.headers['x-session-id'] as string;
    const listing = await ListingsService.getById(id, sessionId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(listing);
  } catch (error) {
    console.error(`Failed to fetch ${req.params.id}`, error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
}

export async function createListing(req: Request, res: Response) {
  try {
    const listing = await ListingsService.create(req.body);
    res.status(201).json({
      id: listing.id,
      status: 'CREATED',
      title: listing.title,
      price: listing.priceParallel,
      message: 'Listing created successfully'
    });
  } catch (error: any) {
    console.error('Failed to create listing:', error);
    // Check for specific validation errors from the service
    if (error.message.includes('validation')) {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create listing' });
  }
}

export async function updateListing(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updatedListing = await ListingsService.update(id, req.body);
    if (!updatedListing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json({
      id: updatedListing.id,
      status: 'UPDATED',
      message: 'Listing updated successfully'
    });
  } catch (error) {
    console.error('Failed to update listing:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
}

export async function deleteListing(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await ListingsService.deleteById(id);
    res.status(200).json({ status: 'DELETED' });
  } catch (error) {
    console.error(`Failed to delete ${req.params.id}`, error);
    res.status(500).json({ error: 'Delete failed' });
  }
}
