// src/services/pricing.service.ts

interface PricingInputs {
    sourcePrice: number;
    sourceShipping: number;
    parallelShipping: number;
  }
  
export function calculateParallelPrice(inputs: PricingInputs) {
    const { sourcePrice, sourceShipping, parallelShipping } = inputs;
    const sourceTotal = sourcePrice + sourceShipping;
    const targetBuyerPrice = Number((sourceTotal * 0.95).toFixed(2));
    let parallelListPrice = Number((targetBuyerPrice - parallelShipping).toFixed(2));
    if (parallelListPrice < 0) parallelListPrice = 0;
  
    return {
      sourceTotal,
      targetBuyerPrice,
      parallelListPrice,
      savings: Number((sourceTotal - targetBuyerPrice).toFixed(2))
    };
}
