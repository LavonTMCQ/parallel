'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Shirt, Watch, Armchair, Smartphone, Car, Dumbbell, Star, Package, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

// Unified Taxonomy (eBay + Poshmark)
const CATEGORIES = [
  {
    id: 'fashion',
    name: 'Fashion',
    icon: Shirt,
    subs: ['Women', 'Men', 'Kids', 'Handbags', 'Shoes', 'Jewelry', 'Watches', 'Accessories']
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: Smartphone,
    subs: ['Cell Phones', 'Computers & Tablets', 'Cameras & Photo', 'Video Games', 'TV, Audio & Video', 'Surveillance']
  },
  {
    id: 'collectibles',
    name: 'Collectibles',
    icon: Star, // Using Star for generic collectibles
    subs: ['Trading Cards', 'Sports Memorabilia', 'Coins & Paper Money', 'Art', 'Antiques', 'Comics']
  },
  {
    id: 'home',
    name: 'Home & Garden',
    icon: Armchair,
    subs: ['Furniture', 'Kitchen & Dining', 'Home Decor', 'Bedding', 'Tools & Workshop', 'Yard & Garden']
  },
  {
    id: 'toys',
    name: 'Toys & Hobbies',
    icon: Package, // Generic Package/Box for toys
    subs: ['Action Figures', 'Dolls & Bears', 'Games', 'Model Trains', 'RC & Control Line', 'Puzzles']
  },
  {
    id: 'sports',
    name: 'Sporting Goods',
    icon: Dumbbell,
    subs: ['Team Sports', 'Outdoor Sports', 'Golf', 'Cycling', 'Fishing', 'Fitness & Yoga']
  },
  {
    id: 'motors',
    name: 'Motors',
    icon: Car,
    subs: ['Parts & Accessories', 'Motorcycles', 'Powersports', 'Boats']
  },
  {
    id: 'health',
    name: 'Health & Beauty',
    icon: ShoppingBag, // Using Bag for retail items
    subs: ['Makeup', 'Skin Care', 'Hair Care', 'Fragrances', 'Vitamins & Supplements']
  }
];

export default function VerticalCategoryNav() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenCategory(openCategory === id ? null : id);
  };

  return (
    <nav className="w-full">
      <div className="p-4 font-mono text-xs text-dim uppercase tracking-widest border-b border-white/5 mb-2">
        Categories
      </div>
      
      <ul className="space-y-1 p-2">
        {CATEGORIES.map((cat) => (
          <li key={cat.id}>
            <button
              onClick={() => toggle(cat.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition text-sm ${openCategory === cat.id ? 'bg-white/10 text-white' : 'text-dim hover:text-white hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-3">
                <cat.icon size={18} />
                <span className="font-medium">{cat.name}</span>
              </div>
              {openCategory === cat.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* Sub-categories */}
            {openCategory === cat.id && (
              <ul className="ml-9 mt-1 space-y-1 border-l border-white/10 pl-2">
                {cat.subs.map((sub) => (
                  <li key={sub}>
                    <Link 
                      href={`/search?category=${sub.toLowerCase()}`}
                      className="block px-3 py-2 text-sm text-dim hover:text-lime transition"
                    >
                      {sub}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
