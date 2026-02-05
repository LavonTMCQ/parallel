export function formatListing(listing: any) {
  return {
    ...listing,
    images: typeof listing.images === 'string' ? JSON.parse(listing.images) : listing.images
  };
}
