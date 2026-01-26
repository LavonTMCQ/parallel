'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, ChevronRight, ArrowLeft } from 'lucide-react';
import SearchBar from '../../components/SearchBar';
import CategoryNav from '../../components/CategoryNav';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parent?: Category;
  children: Category[];
}

interface Listing {
  id: string;
  title: string;
  images: string[];
  priceSource: number;
  shippingSource: number;
  priceParallel: number;
  shippingParallel: number;
  buyerSavings: number;
  brand?: string;
  condition?: string;
  category?: Category;
}

interface CategoryResponse {
  category: Category;
  listings: Listing[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [data, setData] = useState<CategoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');

  const fetchCategory = useCallback(async () => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    queryParams.set('sort', sort);
    queryParams.set('page', page.toString());
    queryParams.set('limit', '20');

    try {
      const res = await fetch(`http://localhost:8000/api/v1/categories/${slug}?${queryParams}`);
      if (!res.ok) throw new Error('Category not found');
      const result = await res.json();
      setData(result);
    } catch (e) {
      console.error('Failed to fetch category:', e);
    } finally {
      setLoading(false);
    }
  }, [slug, sort, page]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  const updateParams = (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      params.set(key, value.toString());
    });
    router.push(`/category/${slug}?${params.toString()}`);
  };

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}&category=${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight text-white">
        <nav className="border-b border-white/10 px-8 py-4 flex items-center gap-6 bg-midnight/80 backdrop-blur-md sticky top-0 z-50">
          <Link href="/" className="font-mono text-xl font-bold tracking-tighter flex items-center gap-2">
            <span className="text-lime font-bold">//</span> PARALLEL
          </Link>
          <SearchBar className="flex-1 max-w-2xl" />
        </nav>
        <CategoryNav />
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-surface rounded w-48" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-surface border border-white/10 rounded-xl overflow-hidden">
                  <div className="aspect-square bg-white/5" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-6 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-midnight text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Category not found</h1>
          <Link href="/" className="text-lime hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  const { category, listings, pagination } = data;

  return (
    <div className="min-h-screen bg-midnight text-white">
      {/* Header */}
      <nav className="border-b border-white/10 px-8 py-4 flex items-center gap-6 bg-midnight/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="font-mono text-xl font-bold tracking-tighter flex items-center gap-2">
          <span className="text-lime font-bold">//</span> PARALLEL
        </Link>
        <SearchBar onSearch={handleSearch} className="flex-1 max-w-2xl" />
      </nav>

      <CategoryNav />

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-dim mb-6">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight size={14} />
          {category.parent && (
            <>
              <Link href={`/category/${category.parent.slug}`} className="hover:text-white transition">
                {category.parent.name}
              </Link>
              <ChevronRight size={14} />
            </>
          )}
          <span className="text-white">{category.name}</span>
        </nav>

        {/* Category Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
            <p className="text-dim">{pagination.total} items available</p>
          </div>

          <select
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value, page: 1 })}
            className="bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-lime/50"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        {/* Subcategories */}
        {category.children.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-dim uppercase tracking-wider mb-3">Browse Subcategories</h2>
            <div className="flex flex-wrap gap-2">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/category/${child.slug}`}
                  className="px-4 py-2 bg-surface border border-white/10 rounded-lg text-sm hover:border-lime/50 hover:text-lime transition"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="text-center py-20 bg-surface border border-white/10 rounded-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-midnight border border-white/10 mb-4 text-dim">
              //
            </div>
            <h3 className="text-xl font-bold mb-2">No items in this category</h3>
            <p className="text-dim text-sm">Check back soon for new listings</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {listings.map((item) => (
                <Link
                  href={`/listing/${item.id}`}
                  key={item.id}
                  className="group bg-surface border border-white/10 rounded-xl overflow-hidden hover:border-lime/50 transition duration-300"
                >
                  <div className="aspect-square bg-black relative overflow-hidden">
                    <img
                      src={item.images?.[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded">
                      -{Math.round((item.buyerSavings / (item.priceSource + item.shippingSource)) * 100)}%
                    </div>
                    {item.condition && (
                      <div className="absolute top-2 left-2 bg-surface/90 backdrop-blur text-[10px] font-medium px-2 py-1 rounded capitalize">
                        {item.condition}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {item.brand && (
                      <div className="text-[10px] text-lime font-bold uppercase mb-1">{item.brand}</div>
                    )}
                    <h3 className="font-bold text-sm truncate mb-2">{item.title}</h3>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs text-dim line-through">
                          ${(item.priceSource + item.shippingSource).toFixed(0)}
                        </div>
                        <div className="text-lg font-mono font-bold text-lime">
                          ${(item.priceParallel + item.shippingParallel).toFixed(0)}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-lime group-hover:text-midnight transition">
                        <ShoppingBag size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => updateParams({ page: page - 1 })}
                  disabled={page === 1}
                  className="px-4 py-2 bg-surface border border-white/10 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-lime/50 transition"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-dim">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  onClick={() => updateParams({ page: page + 1 })}
                  disabled={page >= pagination.pages}
                  className="px-4 py-2 bg-surface border border-white/10 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-lime/50 transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
