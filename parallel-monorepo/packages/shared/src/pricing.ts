export interface PricingInputs {
  sourcePrice: number;
  sourceShipping: number;
  parallelShipping: number; // Estimated shipping on our platform
}

export interface PricingResult {
  sourceTotal: number;
  targetBuyerPrice: number;
  parallelListPrice: number;
  sellerNetOnParallel: number; // Assuming 10% fee
  buyerSavings: number;
}

/**
 * THE FAIRPRICE ENGINE™
 * Calculates the optimal listing price to ensure "Total Landed Cost" arbitrage.
 * 
 * Logic:
 * 1. Calculate Source Total (Price + Shipping)
 * 2. Target Buyer Price = Source Total * 0.95 (5% Savings)
 * 3. Parallel List Price = Target Buyer Price - Parallel Shipping
 */
export function calculateParallelPrice(inputs: PricingInputs): PricingResult {
  const { sourcePrice, sourceShipping, parallelShipping } = inputs;
  const PARALLEL_FEE_PERCENT = 0.10;

  // 1. Establish the "Price to Beat"
  const sourceTotal = sourcePrice + sourceShipping;

  // 2. Set the Target Landed Cost for the Buyer (5% less than eBay)
  const targetBuyerPrice = Number((sourceTotal * 0.95).toFixed(2));

  // 3. Reverse engineer the Item Price
  // TargetBuyerPrice = ParallelListPrice + ParallelShipping
  // ParallelListPrice = TargetBuyerPrice - ParallelShipping
  let parallelListPrice = Number((targetBuyerPrice - parallelShipping).toFixed(2));

  // Safety: Price cannot be negative. 
  if (parallelListPrice < 0) {
    parallelListPrice = 0; // Edge case for very low value items with high shipping
    // In production, this should probably throw a "Not Eligible for Import" error
  }

  // 4. Calculate Seller Net
  const parallelFee = parallelListPrice * PARALLEL_FEE_PERCENT;
  const sellerNetOnParallel = Number((parallelListPrice - parallelFee).toFixed(2));

  const buyerSavings = Number((sourceTotal - targetBuyerPrice).toFixed(2));

  return {
    sourceTotal,
    targetBuyerPrice,
    parallelListPrice,
    sellerNetOnParallel,
    buyerSavings
  };
}
