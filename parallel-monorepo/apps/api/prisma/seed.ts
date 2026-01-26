import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Category Taxonomy - eBay-inspired hierarchy
const CATEGORIES = [
  // Electronics
  { name: "Electronics", slug: "electronics", icon: "monitor", children: [
    { name: "Cameras & Photo", slug: "cameras-photo", icon: "camera" },
    { name: "Computers & Tablets", slug: "computers-tablets", icon: "laptop" },
    { name: "Cell Phones", slug: "cell-phones", icon: "smartphone" },
    { name: "Video Games", slug: "video-games", icon: "gamepad-2" },
    { name: "Audio Equipment", slug: "audio-equipment", icon: "headphones" },
    { name: "TV & Video", slug: "tv-video", icon: "tv" },
  ]},

  // Fashion
  { name: "Fashion", slug: "fashion", icon: "shirt", children: [
    { name: "Men's Clothing", slug: "mens-clothing", icon: "shirt" },
    { name: "Women's Clothing", slug: "womens-clothing", icon: "shirt" },
    { name: "Sneakers", slug: "sneakers", icon: "footprints" },
    { name: "Watches", slug: "watches", icon: "watch" },
    { name: "Handbags", slug: "handbags", icon: "shopping-bag" },
    { name: "Jewelry", slug: "jewelry", icon: "gem" },
    { name: "Sunglasses", slug: "sunglasses", icon: "glasses" },
  ]},

  // Collectibles
  { name: "Collectibles", slug: "collectibles", icon: "trophy", children: [
    { name: "Trading Cards", slug: "trading-cards", icon: "layers" },
    { name: "Sports Memorabilia", slug: "sports-memorabilia", icon: "medal" },
    { name: "Coins & Currency", slug: "coins-currency", icon: "coins" },
    { name: "Art", slug: "art", icon: "palette" },
    { name: "Vintage & Antiques", slug: "vintage-antiques", icon: "clock" },
    { name: "Comics & Manga", slug: "comics-manga", icon: "book-open" },
  ]},

  // Home & Garden
  { name: "Home & Garden", slug: "home-garden", icon: "home", children: [
    { name: "Furniture", slug: "furniture", icon: "armchair" },
    { name: "Kitchen & Dining", slug: "kitchen-dining", icon: "utensils" },
    { name: "Tools & Workshop", slug: "tools-workshop", icon: "wrench" },
    { name: "Home Decor", slug: "home-decor", icon: "lamp" },
    { name: "Bedding", slug: "bedding", icon: "bed" },
  ]},

  // Sports & Outdoors
  { name: "Sports & Outdoors", slug: "sports-outdoors", icon: "dumbbell", children: [
    { name: "Exercise & Fitness", slug: "exercise-fitness", icon: "dumbbell" },
    { name: "Outdoor Gear", slug: "outdoor-gear", icon: "tent" },
    { name: "Cycling", slug: "cycling", icon: "bike" },
    { name: "Golf", slug: "golf", icon: "flag" },
    { name: "Team Sports", slug: "team-sports", icon: "trophy" },
  ]},

  // Motors
  { name: "Motors", slug: "motors", icon: "car", children: [
    { name: "Car Parts", slug: "car-parts", icon: "cog" },
    { name: "Motorcycle Parts", slug: "motorcycle-parts", icon: "bike" },
    { name: "Wheels & Tires", slug: "wheels-tires", icon: "circle" },
  ]},
];

// Sample listings with proper category assignments
const MOCK_ITEMS = [
  {
    title: "Vintage Rolex Submariner 16610",
    price: 8500.00,
    shipping: 50.00,
    categorySlug: "watches",
    brand: "Rolex",
    condition: "good",
    img: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Nike Air Jordan 1 Chicago Lost & Found",
    price: 450.00,
    shipping: 15.00,
    categorySlug: "sneakers",
    brand: "Nike",
    condition: "new",
    img: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Herman Miller Eames Lounge Chair",
    price: 4200.00,
    shipping: 250.00,
    categorySlug: "furniture",
    brand: "Herman Miller",
    condition: "good",
    img: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Sony A7IV Mirrorless Camera Body",
    price: 2100.00,
    shipping: 20.00,
    categorySlug: "cameras-photo",
    brand: "Sony",
    condition: "like-new",
    img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "PSA 10 Charizard Base Set 1999",
    price: 12000.00,
    shipping: 100.00,
    categorySlug: "trading-cards",
    brand: "Pokemon",
    condition: "new",
    img: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "MacBook Pro 16 M3 Max 64GB",
    price: 3500.00,
    shipping: 25.00,
    categorySlug: "computers-tablets",
    brand: "Apple",
    condition: "like-new",
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Gucci Marmont Small Shoulder Bag",
    price: 1800.00,
    shipping: 20.00,
    categorySlug: "handbags",
    brand: "Gucci",
    condition: "good",
    img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Yeezy Boost 350 V2 Onyx",
    price: 280.00,
    shipping: 15.00,
    categorySlug: "sneakers",
    brand: "Adidas",
    condition: "new",
    img: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&w=800&q=80"
  },
];

async function main() {
  console.log("🌱 Seeding Parallel Marketplace...\n");

  // 1. Seed Categories
  console.log("📁 Creating category taxonomy...");
  const categoryMap = new Map<string, string>(); // slug -> id

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];

    // Create parent category
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: i },
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        sortOrder: i,
      }
    });
    categoryMap.set(cat.slug, parent.id);
    console.log(`  ✓ ${cat.name}`);

    // Create children
    if (cat.children) {
      for (let j = 0; j < cat.children.length; j++) {
        const child = cat.children[j];
        const childCat = await prisma.category.upsert({
          where: { slug: child.slug },
          update: { name: child.name, icon: child.icon, parentId: parent.id, sortOrder: j },
          create: {
            name: child.name,
            slug: child.slug,
            icon: child.icon,
            parentId: parent.id,
            sortOrder: j,
          }
        });
        categoryMap.set(child.slug, childCat.id);
        console.log(`    └─ ${child.name}`);
      }
    }
  }

  // 2. Create Users
  console.log("\n👤 Creating demo users...");

  const alice = await prisma.user.upsert({
    where: { email: 'alice@parallel.demo' },
    update: {},
    create: {
      email: 'alice@parallel.demo',
      name: 'Alice Vault',
      bio: 'Vintage collector & archivist. Importing my best pieces from eBay.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
      isVerified: true,
    }
  });
  console.log(`  ✓ Alice Vault (verified seller)`);

  const bob = await prisma.user.upsert({
    where: { email: 'bob@parallel.demo' },
    update: {},
    create: {
      email: 'bob@parallel.demo',
      name: 'Bob The Buyer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  });
  console.log(`  ✓ Bob The Buyer`);

  // 3. Create Reviews
  console.log("\n⭐ Creating reviews...");
  await prisma.review.deleteMany({ where: { receiverId: alice.id } }); // Clear existing
  await prisma.review.createMany({
    data: [
      {
        rating: 5,
        comment: "Alice shipped this Rolex overnight. Insane condition. Parallel is the future.",
        type: "BUYER_TO_SELLER",
        receiverId: alice.id,
        authorId: bob.id
      },
      {
        rating: 5,
        comment: "Item exactly as described. Prices are way better than eBay.",
        type: "BUYER_TO_SELLER",
        receiverId: alice.id,
        authorId: bob.id
      },
      {
        rating: 4,
        comment: "Great camera, fast shipping. Minor scuff not mentioned but still happy.",
        type: "BUYER_TO_SELLER",
        receiverId: alice.id,
        authorId: bob.id
      }
    ]
  });
  console.log(`  ✓ 3 reviews for Alice`);

  // 4. Create Listings with Categories
  console.log("\n📦 Creating listings...");

  for (const item of MOCK_ITEMS) {
    const parallelShipping = 10.00;
    const sourceTotal = item.price + item.shipping;
    const targetBuyerPrice = Number((sourceTotal * 0.95).toFixed(2));
    const parallelListPrice = Number((targetBuyerPrice - parallelShipping).toFixed(2));

    const categoryId = categoryMap.get(item.categorySlug);

    await prisma.listing.create({
      data: {
        title: item.title,
        sourcePlatform: "DEMO",
        sourceId: `demo_${Math.random().toString(36).substr(2, 9)}`,
        sourceUrl: "https://ebay.com/demo",
        description: `${item.title}. Authenticated and verified. Ships from NYC.`,
        images: JSON.stringify([item.img]),

        // Category & Discovery
        categoryId: categoryId,
        brand: item.brand,
        condition: item.condition,

        // Pricing
        priceSource: item.price,
        shippingSource: item.shipping,
        priceParallel: parallelListPrice,
        shippingParallel: parallelShipping,
        buyerSavings: Number((sourceTotal - targetBuyerPrice).toFixed(2)),

        status: "ACTIVE",
        userId: alice.id
      }
    });
    console.log(`  ✓ ${item.title} [${item.categorySlug}]`);
  }

  // 5. Summary
  const catCount = await prisma.category.count();
  const listingCount = await prisma.listing.count();

  console.log("\n" + "=".repeat(50));
  console.log("✅ Seed complete!");
  console.log(`   📁 ${catCount} categories`);
  console.log(`   📦 ${listingCount} listings`);
  console.log(`   👤 2 users`);
  console.log("=".repeat(50));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
