// src/services/ingest.service.ts
import { prisma } from '../lib/prisma';
import { detectCategory, mapCondition } from '../data/categoryMapping';
import { estimateWeight } from './shipping';
import { getShippingRate } from './shipping';
import { calculateParallelPrice } from './pricing.service';
import { MediaService } from './media';

export async function ingest(data: any) {
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
  } = data;

  console.log(`[INGEST] Receiving: ${title}`);

  if (seller_rating_score && seller_rating_score < 80) {
    throw new Error('QUALITY_GATE_FAILED');
  }

  const detectedSlug = detectCategory({
    categoryId: category_id,
    categoryPath: category_path,
    title,
    brand
  });

  let categoryId: string | null = null;
  if (detectedSlug) {
    const category = await prisma.category.findUnique({ where: { slug: detectedSlug } });
    if (category) categoryId = category.id;
  }

  const mappedCondition = mapCondition(ebayCondition);

  const weight = estimateWeight(title);
  const estimatedShipping = await getShippingRate({
    weight_oz: weight,
    category: title
  });

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

  return {
    id: listing.id,
    status: 'IMPORTED',
    category: detectedSlug,
    pricing_strategy: pricing
  };
}
