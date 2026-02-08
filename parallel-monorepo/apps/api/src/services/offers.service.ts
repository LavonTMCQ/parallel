
import { prisma } from '../lib/prisma';

export const createOffer = async (listingId: string, amount: number, message?: string, buyerEmail?: string, buyerName?: string) => {
  if (!listingId || !amount) {
    return { error: 'listingId and amount are required', status: 400 };
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return { error: 'Listing not found', status: 404 };
  }

  const minOffer = listing.priceParallel * 0.5;
  if (amount < minOffer) {
    return {
      error: 'OFFER_TOO_LOW',
      message: `Minimum offer is $${minOffer.toFixed(2)} (50% of listing price)`,
      status: 400
    };
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  const offer = await prisma.offer.create({
    data: {
      listingId,
      amount,
      message: message || null,
      buyerEmail: buyerEmail || null,
      buyerName: buyerName || null,
      expiresAt
    },
    include: { listing: true }
  });

  console.log(`[OFFER] New offer $${amount} on listing ${listingId}`);

  return {
    offer: {
      id: offer.id,
      status: offer.status,
      amount: offer.amount,
      expiresAt: offer.expiresAt,
      message: 'Offer submitted successfully'
    }
  };
};

export const getOffersForListing = async (listingId: string) => {
  return prisma.offer.findMany({
    where: { listingId: listingId },
    orderBy: { createdAt: 'desc' }
  });
};

export const respondToOffer = async (offerId: string, action: string, counterAmount?: number, counterMessage?: string) => {
  if (!['ACCEPT', 'DECLINE', 'COUNTER'].includes(action)) {
    return { error: 'Invalid action. Must be ACCEPT, DECLINE, or COUNTER', status: 400 };
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { listing: true }
  });

  if (!offer) {
    return { error: 'Offer not found', status: 404 };
  }

  if (offer.status !== 'PENDING') {
    return { error: 'Offer has already been responded to', status: 400 };
  }

  let status = action === 'ACCEPT' ? 'ACCEPTED' : action === 'DECLINE' ? 'DECLINED' : 'COUNTERED';

  const updatedOffer = await prisma.offer.update({
    where: { id: offerId },
    data: {
      status,
      counterAmount: action === 'COUNTER' ? counterAmount : null,
      counterMessage: action === 'COUNTER' ? counterMessage : null
    }
  });

  console.log(`[OFFER] Offer ${offerId} ${status}`);
  
  return {
    offer: {
      id: updatedOffer.id,
      status: updatedOffer.status,
      counterAmount: updatedOffer.counterAmount,
      message: `Offer ${status.toLowerCase()}`
    }
  };
};
