// src/services/listings.service.ts
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

// Helper: Format listing with parsed images
function formatListing(listing: any) {
  if (!listing) return null;
  return {
    ...listing,
    images: typeof listing.images === 'string' ? JSON.parse(listing.images) : listing.images,
  };
}

interface GetAllParams {
  page: number;
  limit: number;
  sort: string;
  category?: string;
}

export async function getAll({ page, limit, sort, category }: GetAllParams) {
  const where: Prisma.ListingWhereInput = { status: 'ACTIVE' };
  if (category) {
    const cat = await prisma.category.findUnique({
      where: { slug: category },
      include: { children: true }
    });
    if (cat) {
      const categoryIds = [cat.id, ...cat.children.map((c: { id: string }) => c.id)];
      where.categoryId = { in: categoryIds };
    }
  }

  let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { priceParallel: 'asc' };
  if (sort === 'price_desc') orderBy = { priceParallel: 'desc' };
  if (sort === 'popular') orderBy = { viewCount: 'desc' };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true }
    }),
    prisma.listing.count({ where })
  ]);

  return {
    listings: listings.map(formatListing),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function getById(id: string, sessionId?: string) {
    const listing = await prisma.listing.findUnique({
        where: { id },
        include: {
          user: {
            include: {
              listings: {
                where: { id: { not: id }, status: 'ACTIVE' },
                take: 6,
                orderBy: { createdAt: 'desc' }
              },
              reviewsReceived: true
            }
          },
          category: { include: { parent: true } },
          watchers: true
        }
      });
  
      if (!listing) return null;
  
      await prisma.listing.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      });
  
      // Similar items, seller stats, etc. will be calculated here
      // ... (logic to be moved from index.ts)
  
      return formatListing(listing);
}

export async function deleteById(id: string) {
    await prisma.listing.delete({ where: { id } });
    console.log(`[DELETE] Listing ${id} removed.`);
}

import { MediaService } from './media';
// create, update functions will go here

export async function create(data: any) {
  const {
    title,
    description,
    categoryId,
    brand,
    condition,
    price,
    shippingOption,
    shippingPrice,
    images,
    acceptsOffers,
    specifics,
    clerkUserId
  } = data;

  // Validation
  if (!title || title.length < 10) throw new Error('validation: Title must be at least 10 characters');
  if (!condition) throw new Error('validation: Condition is required');
  if (!price || price <= 0) throw new Error('validation: Valid price is required');
  if (!images || images.length === 0) throw new Error('validation: At least one image is required');

  // Find or create user
  let userId: string | null = null;
  if (clerkUserId) {
    let user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: `${clerkUserId}@placeholder.parallel`,
        }
      });
      console.log(`[AUTH] Created placeholder user for Clerk ID: ${clerkUserId}`);
    }
    userId = user.id;
  }

  // Format specifics
  let fullDescription = description || '';
  if (specifics && specifics.length > 0) {
    const specsText = specifics.map((s: { key: string; value: string }) => `${s.key}: ${s.value}`).join('\n');
    fullDescription = fullDescription ? `${fullDescription}\n\n--- Item Specifics ---\n${specsText}` : specsText;
  }

  // Upload images
  const capturedImages = await MediaService.uploadMany(images || []);

  // Create listing
  const listing = await prisma.listing.create({
    data: {
      title,
      description: fullDescription,
      sourcePlatform: 'parallel',
      sourceId: `manual-${Date.now()}`,
      images: JSON.stringify(capturedImages),
      categoryId: categoryId || null,
      brand: brand || null,
      condition,
      priceSource: price,
      shippingSource: shippingPrice,
      priceParallel: price,
      shippingParallel: shippingPrice,
      buyerSavings: 0,
      userId: userId,
    }
  });

  console.log(`[CREATE] Manual listing ${listing.id}: ${title}`);
  return listing;
}

export async function update(id: string, data: any) {
  const {
    title,
    description,
    categoryId,
    brand,
    condition,
    price,
    shippingPrice,
    images,
    status
  } = data;

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return null;

  const updatedListing = await prisma.listing.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(categoryId && { categoryId }),
      ...(brand !== undefined && { brand }),
      ...(condition && { condition }),
      ...(price && { priceParallel: price, priceSource: price }),
      ...(shippingPrice !== undefined && { shippingParallel: shippingPrice, shippingSource: shippingPrice }),
      ...(images && { images: JSON.stringify(images) }),
      ...(status && { status }),
    }
  });

  console.log(`[UPDATE] Listing ${id} updated`);
  return updatedListing;
}
