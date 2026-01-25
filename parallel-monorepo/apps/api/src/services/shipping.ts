export interface ShipmentDetails {
  weight_oz: number;
  origin_zip?: string;
  dest_zip?: string;
  category?: string; // e.g. "Shoes", "Jewelry"
}

/**
 * PARALLEL LOGISTICS ENGINE
 * Powered by EasyPost (Planned)
 */
export async function getShippingRate(details: ShipmentDetails): Promise<number> {
  const easyPostKey = process.env.EASYPOST_API_KEY;
  
  if (easyPostKey) {
    // TODO: Implement real EasyPost API call here
    // const api = new EasyPost(easyPostKey);
    // const shipment = await api.Shipment.create({...});
    // return shipment.lowestRate();
    console.log("[SHIPPING] EasyPost Key found - Mocking API Call");
  }

  // --- MOCK LOGIC (Fallback) ---
  console.log(`[SHIPPING] Calculating estimate for ${details.category || 'Unknown'} (${details.weight_oz}oz)`);

  // Base Rates (USPS Ground Advantage Estimates)
  const BASE_RATE = 5.00;
  
  // Weight Factor ($0.20 per oz over 4oz)
  let weightCost = 0;
  if (details.weight_oz > 4) {
    weightCost = (details.weight_oz - 4) * 0.20;
  }

  // Category Multipliers (Insurance/Handling)
  let categorySurcharge = 0;
  const cat = (details.category || "").toLowerCase();
  
  if (cat.includes("shoe") || cat.includes("sneaker")) {
    categorySurcharge = 5.00; // Bulky box
  } else if (cat.includes("jewelry") || cat.includes("watch")) {
    categorySurcharge = 2.00; // Insurance/Signature
  } else if (cat.includes("clothing") || cat.includes("shirt")) {
    categorySurcharge = 0.00; // Poly mailer
  }

  // Calculate Total
  const total = BASE_RATE + weightCost + categorySurcharge;
  
  // Safety Floor/Ceiling
  return Math.max(4.50, Math.min(total, 50.00));
}

/**
 * Helper to guess weight based on category if unknown
 */
export function estimateWeight(category: string): number {
  const c = category.toLowerCase();
  if (c.includes("shoe")) return 32; // 2 lbs
  if (c.includes("boot")) return 48; // 3 lbs
  if (c.includes("shirt")) return 8; // 0.5 lb
  if (c.includes("pants") || c.includes("jeans")) return 16; // 1 lb
  if (c.includes("jacket") || c.includes("coat")) return 32; // 2 lbs
  if (c.includes("jewelry")) return 4; // 0.25 lb
  return 12; // Default
}
