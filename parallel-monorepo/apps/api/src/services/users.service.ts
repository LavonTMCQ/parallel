
import { prisma } from '../lib/prisma';
import { formatListing } from '../lib/helpers';

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      listings: { include: { category: true } },
      reviewsReceived: { include: { author: true } }
    }
  });

  if (!user) {
    return { error: 'User not found', status: 404 };
  }

  const formattedListings = user.listings.map(formatListing);

  const avgRating = user.reviewsReceived.length > 0
    ? user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0) / user.reviewsReceived.length
    : null;

  return {
    user: {
      ...user,
      listings: formattedListings,
      stats: {
        totalListings: user.listings.length,
        totalReviews: user.reviewsReceived.length,
        avgRating: avgRating ? Number(avgRating.toFixed(1)) : null
      }
    }
  };
};
