import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_ITEMS = [
  { title: "Vintage Rolex Submariner 16610", price: 8500.00, shipping: 50.00, cat: "Watches", img: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80" },
  { title: "Nike Air Jordan 1 Chicago Lost & Found", price: 450.00, shipping: 15.00, cat: "Sneakers", img: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80" },
  { title: "Herman Miller Eames Lounge Chair", price: 4200.00, shipping: 250.00, cat: "Furniture", img: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80" },
  { title: "Sony A7IV Mirrorless Camera Body", price: 2100.00, shipping: 20.00, cat: "Electronics", img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80" }
];

async function main() {
  console.log("🌱 Seeding Reputation Graph...");

  // 1. Create the "Power Seller" (Alice)
  const alice = await prisma.user.upsert({
    where: { email: 'alice@parallel.demo' },
    update: {},
    create: {
      email: 'alice@parallel.demo',
      name: 'Alice Vault',
      bio: 'Vintage collector & archivist. Importing my best pieces from eBay to save you fees.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
      isVerified: true,
    }
  });

  // 2. Create a "Buyer" (Bob) to leave reviews
  const bob = await prisma.user.upsert({
    where: { email: 'bob@parallel.demo' },
    update: {},
    create: {
      email: 'bob@parallel.demo',
      name: 'Bob The Buyer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  });

  // 3. Create Reviews (Alice <-> Bob)
  await prisma.review.createMany({
    data: [
      {
        rating: 5,
        comment: "Alice shipped this Rolex overnight. Insane condition. Parallel is the new wave.",
        type: "BUYER_TO_SELLER",
        receiverId: alice.id,
        authorId: bob.id
      },
      {
        rating: 5,
        comment: "Item exactly as described. Prices are 10% lower than her Poshmark store.",
        type: "BUYER_TO_SELLER",
        receiverId: alice.id,
        authorId: bob.id
      }
    ]
  });

  // 4. Create Items for Alice
  for (const item of MOCK_ITEMS) {
    const parallelShipping = 10.00;
    const sourceTotal = item.price + item.shipping;
    const targetBuyerPrice = Number((sourceTotal * 0.95).toFixed(2));
    const parallelListPrice = Number((targetBuyerPrice - parallelShipping).toFixed(2));
    
    await prisma.listing.create({
      data: {
        title: item.title,
        sourcePlatform: "MOCK_DEMO",
        sourceId: `mock_${Math.random().toString(36).substr(2, 9)}`,
        sourceUrl: "https://ebay.com/demo",
        description: `AUTHENTICATED. ${item.title}. Sourced from my personal archive. Ships from NYC.`,
        images: JSON.stringify([item.img]),
        
        priceSource: item.price,
        shippingSource: item.shipping,
        
        priceParallel: parallelListPrice,
        shippingParallel: parallelShipping,
        buyerSavings: Number((sourceTotal - targetBuyerPrice).toFixed(2)),
        
        status: "ACTIVE",
        userId: alice.id // Link to Alice
      }
    });
  }
  
  console.log("✅ Seed complete: Alice is now a Power Seller.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });