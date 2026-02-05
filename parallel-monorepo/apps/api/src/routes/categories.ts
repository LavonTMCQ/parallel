import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { formatListing } from '../lib/helpers';
import { Prisma } from '@prisma/client';

const router = Router();

// Get all categories (with hierarchy)
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        _count: { select: { listings: true } }
      }
    });

    res.json(categories);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single category with listings
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || 'newest';

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        parent: true
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get category IDs (include children for parent categories)
    const categoryIds = [category.id, ...category.children.map((c: { id: string }) => c.id)];

    // Build sort order
    let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { priceParallel: 'asc' };
    if (sort === 'price_desc') orderBy = { priceParallel: 'desc' };
    if (sort === 'popular') orderBy = { viewCount: 'desc' };

    // Get listings
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: { categoryId: { in: categoryIds }, status: 'ACTIVE' },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true }
      }),
      prisma.listing.count({
        where: { categoryId: { in: categoryIds }, status: 'ACTIVE' }
      })
    ]);

    res.json({
      category,
      listings: listings.map(formatListing),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to fetch category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

export default router;
