import { prisma } from '../lib/prisma';
import { formatListing } from '../lib/helpers';

export const getWatchlist = async (sessionId: string) => {
  const watchlist = await prisma.watchlist.findMany({
    where: { sessionId },
    include: {
      listing: {
        include: { category: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return watchlist.map(w => formatListing(w.listing));
};

export const addToWatchlist = async (listingId: string, sessionId: string) => {
  if (!listingId) {
    return { error: 'listingId is required', status: 400 };
  }
  if (!sessionId) {
    return { error: 'x-session-id header is required', status: 400 };
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return { error: 'Listing not found', status: 404 };
  }

  const existing = await prisma.watchlist.findUnique({
    where: { listingId_sessionId: { listingId, sessionId } }
  });

  if (existing) {
    return { error: 'Already watching this listing', status: 409 };
  }

  await prisma.watchlist.create({
    data: { listingId, sessionId }
  });

  await prisma.listing.update({
    where: { id: listingId },
    data: { favoriteCount: { increment: 1 } }
  });

  const watcherCount = await prisma.watchlist.count({ where: { listingId } });
  
  console.log(`[WATCHLIST] Added listing ${listingId}`);

  return {
    data: {
      success: true,
      watcherCount,
      message: 'Added to watchlist'
    }
  };
};

export const removeFromWatchlist = async (listingId: string, sessionId: string) => {
   if (!sessionId) {
    return { error: 'x-session-id header is required', status: 400 };
  }

  try {
     await prisma.watchlist.delete({
      where: { listingId_sessionId: { listingId, sessionId } }
    });
  } catch (error) {
      // It's possible the item is already removed, which is not a critical error.
      console.log(`[WATCHLIST] Item ${listingId} not found for session, assuming already removed.`);
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: { favoriteCount: { decrement: 1 } }
  });

  const watcherCount = await prisma.watchlist.count({ where: { listingId } });

  console.log(`[WATCHLIST] Removed listing ${listingId}`);

  return {
    data: {
      success: true,
      watcherCount,
      message: 'Removed from watchlist'
    }
  };
};