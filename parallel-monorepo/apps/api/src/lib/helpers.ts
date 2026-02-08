
import { Listing, Category } from '@prisma/client';

// Allow category to be optional as includes are not guaranteed
type ListingWithOptionalCategory = Listing & { category?: Category | null };

/**
 * Formats a listing object by parsing JSON strings and ensuring correct types.
 * @param listing - The listing object from Prisma.
 * @returns A formatted listing object.
 */
export const formatListing = (listing: ListingWithOptionalCategory) => {
  if (!listing) return null;

  return {
    ...listing,
    images: listing.images ? JSON.parse(listing.images) : [],
    // 'tags' does not exist on the Listing model, removing for now.
    // tags: listing.tags ? JSON.parse(listing.tags) : [],
    priceSource: Number(listing.priceSource),
    priceParallel: Number(listing.priceParallel),
    shippingSource: Number(listing.shippingSource),
    shippingParallel: Number(listing.shippingParallel),
    favoriteCount: Number(listing.favoriteCount),
    viewCount: Number(listing.viewCount),
  };
};
