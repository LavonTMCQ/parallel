'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Monitor, Shirt, Trophy, Home, Dumbbell, Car,
  ChevronDown, Loader2
} from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  children: Category[];
  _count?: { listings: number };
}

// Map icon names to Lucide components
const iconMap: Record<string, React.ReactNode> = {
  monitor: <Monitor size={16} />,
  shirt: <Shirt size={16} />,
  trophy: <Trophy size={16} />,
  home: <Home size={16} />,
  dumbbell: <Dumbbell size={16} />,
  car: <Car size={16} />,
};

export default function CategoryNav() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/categories`)
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border-b border-white/10 bg-surface/50">
        <div className="max-w-7xl mx-auto px-8 py-3 flex items-center gap-2 text-dim">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Loading categories...</span>
        </div>
      </div>
    );
  }

  return (
    <nav className="border-b border-white/10 bg-surface/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
          {/* All Items */}
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-dim hover:text-white hover:bg-white/5 transition whitespace-nowrap"
          >
            All Items
          </Link>

          {/* Category Links */}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="relative"
              onMouseEnter={() => setOpenDropdown(cat.slug)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                href={`/category/${cat.slug}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-dim hover:text-white hover:bg-white/5 transition whitespace-nowrap group"
              >
                {iconMap[cat.icon] || <Monitor size={16} />}
                <span>{cat.name}</span>
                {cat.children.length > 0 && (
                  <ChevronDown size={12} className="opacity-50 group-hover:opacity-100 transition" />
                )}
              </Link>

              {/* Dropdown */}
              {cat.children.length > 0 && openDropdown === cat.slug && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-surface border border-white/10 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {cat.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/category/${child.slug}`}
                      className="block px-4 py-2 text-xs text-dim hover:text-white hover:bg-white/5 transition"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
