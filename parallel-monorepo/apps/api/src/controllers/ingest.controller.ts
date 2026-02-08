// src/controllers/ingest.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { detectCategory, mapCondition } from '../data/categoryMapping';
import { estimateWeight } from '../services/shipping';
import { getShippingRate } from '../services/shipping';
import { MediaService } from '../services/media';

// Refactored calculateParallelPrice to be self-contained
function calculateParallelPrice(inputs: { sourcePrice: number; sourceShipping: number; parallelShipping: number; }) {
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

export async function ingestListing(req: Request, res: Response) {
    try {
        const {
            source_platform,
            source_id,
            title,
            price_source,
            shipping_source,
            images,
            url,
            seller_rating_score,
            category_id,
            category_path,
            brand,
            condition: ebayCondition
        } = req.body;

        console.log(`[INGEST] Receiving: ${title}`);

        if (seller_rating_score && seller_rating_score < 80) {
            return res.status(400).json({
                error: 'QUALITY_GATE_FAILED',
                message: 'Seller rating is below 80% threshold.'
            });
        }

        const detectedSlug = detectCategory({ categoryId: category_id, categoryPath: category_path, title, brand });
        let categoryId: string | null = null;
        if (detectedSlug) {
            const category = await prisma.category.findUnique({ where: { slug: detectedSlug } });
            if (category) categoryId = category.id;
        }

        const mappedCondition = mapCondition(ebayCondition);

        const weight = estimateWeight(title);
        const estimatedShipping = await getShippingRate({ weight_oz: weight, category: title });

        const pricing = calculateParallelPrice({
            sourcePrice: price_source,
            sourceShipping: shipping_source,
            parallelShipping: estimatedShipping
        });

        console.log(`[MEDIA] capturing ${images?.length || 0} images...`);
        const capturedImages = await MediaService.uploadMany(images || []);

        const listing = await prisma.listing.create({
            data: {
                title,
                sourcePlatform: source_platform || 'unknown',
                sourceId: source_id || 'unknown',
                sourceUrl: url || '',
                description: 'Imported via Extension',
                images: JSON.stringify(capturedImages),
                categoryId,
                sourceCategoryId: category_id || null,
                sourceCategoryPath: category_path || null,
                brand: brand || null,
                condition: mappedCondition,
                priceSource: price_source || 0.0,
                shippingSource: shipping_source || 0.0,
                priceParallel: pricing.parallelListPrice,
                shippingParallel: estimatedShipping,
                buyerSavings: pricing.savings
            }
        });

        console.log(`[SUCCESS] Persisted Listing ${listing.id} [${detectedSlug || 'uncategorized'}]`);

        return res.status(201).json({
            id: listing.id,
            status: 'IMPORTED',
            category: detectedSlug,
            pricing_strategy: pricing
        });

    } catch (error) {
        console.error("Ingest Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
