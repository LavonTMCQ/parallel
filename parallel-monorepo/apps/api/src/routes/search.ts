import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { formatListing } from '../lib/helpers';
import { Prisma } from '@prisma/client';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const category = req.query.category as string;
    const condition = req.query.condition as string;
    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice = parseFloat(req.query.maxPrice as string) || 999999;
    const brand = req.query.brand as string;
    const sort = (req.query.sort as string) || 'newest';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Build where clause
    const where: Prisma.ListingWhereInput = {
      status: 'ACTIVE',
      priceParallel: { gte: minPrice, lte: maxPrice }
    };

    // Text search (simple LIKE for SQLite)
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { brand: { contains: q } }
      ];
    }

    // Category filter
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

    // Condition filter
    if (condition) {
      where.condition = condition;
    }

    // Brand filter
    if (brand) {
      where.brand = { contains: brand };
    }

    // Build sort order
    let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { priceParallel: 'asc' };
    if (sort === 'price_desc') orderBy = { priceParallel: 'desc' };
    if (sort === 'popular') orderBy = { viewCount: 'desc' };

    // Execute query
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

    // Get aggregations for filters
    const [brands, conditions] = await Promise.all([
      prisma.listing.groupBy({
        by: ['brand'],
        where: { status: 'ACTIVE', brand: { not: null } },
        _count: true,
        orderBy: { _count: { brand: 'desc' } },
        take: 20
      }),
      prisma.listing.groupBy({
        by: ['condition'],
        where: { status: 'ACTIVE', condition: { not: null } },
        _count: true
      })
    ]);

    res.json({
      query: q,
      listings: listings.map(formatListing),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        brands: brands.filter((b: { brand: string | null }) => b.brand).map((b: { brand: string | null; _count: number }) => ({ name: b.brand, count: b._count })),
        conditions: conditions.filter((c: { condition: string | null }) => c.condition).map((c: { condition: string | null; _count: number }) => ({ name: c.condition, count: c._count }))
      }
    });
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
