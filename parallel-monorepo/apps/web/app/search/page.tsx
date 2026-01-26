'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft, SlidersHorizontal, X } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import FilterSidebar from '../components/FilterSidebar';
import CategoryNav from '../components/CategoryNav';

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
  category?: { name: string; slug: string };
}

interface SearchResponse {
  query: string;
  listings: Listing[];
  pagination: { page: number; limit: number; total: number; pages: number };
  filters: {
    brands: { name: string; count: number }[];
    conditions: { name: string; count: number }[];
  };
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Extract params
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const condition = searchParams.get('condition') || '';
  const brand = searchParams.get('brand') || '';
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (condition) params.set('condition', condition);
    if (brand) params.set('brand', brand);
    if (minPrice !== undefined) params.set('minPrice', minPrice.toString());
    if (maxPrice !== undefined) params.set('maxPrice', maxPrice.toString());
    params.set('sort', sort);
    params.set('page', page.toString());
    params.set('limit', '20');

    try {
      const res = await fetch(`http://localhost:8000/api/v1/search?${params}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setLoading(false);
    }
  }, [query, category, condition, brand, minPrice, maxPrice, sort, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const updateFilters = (newFilters: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value.toString());
      }
    });

    // Reset to page 1 when filters change
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    router.push(`/search?${params.toString()}`);
  };

  const handleSearch = (newQuery: string) => {
    const params = new URLSearchParams();
    params.set('q', newQuery);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-midnight text-white">
      {/* Header */}
      <nav className="border-b border-white/10 px-8 py-4 flex items-center gap-6 bg-midnight/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="font-mono text-xl font-bold tracking-tighter flex items-center gap-2">
          <span className="text-lime font-bold">//</span> PARALLEL
        </Link>
        <SearchBar initialQuery={query} onSearch={handleSearch} className="flex-1 max-w-2xl" />
      </nav>

      <CategoryNav />

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {query ? `Results for "${query}"` : 'All Items'}
            </h1>
            <p className="text-sm text-dim">
              {results?.pagination.total || 0} items found
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-lg text-sm"
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="bg-surface border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-lime/50"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className={`${showMobileFilters ? 'fixed inset-0 z-50 bg-midnight p-4 lg:relative lg:inset-auto lg:p-0 lg:bg-transparent' : 'hidden lg:block'}`}>
            {showMobileFilters && (
              <button
                onClick={() => setShowMobileFilters(false)}
                className="lg:hidden absolute top-4 right-4 p-2"
              >
                <X size={24} />
              </button>
            )}
            <FilterSidebar
              brands={results?.filters.brands || []}
              conditions={results?.filters.conditions || []}
              selectedBrand={brand}
              selectedCondition={condition}
              priceRange={minPrice !== undefined ? { min: minPrice, max: maxPrice || 999999 } : undefined}
              onFilterChange={(filters) => updateFilters(filters)}
              onClearFilters={clearAllFilters}
            />
          </div>

          {/* Results Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-surface border border-white/10 rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-square bg-white/5" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                      <div className="h-6 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results?.listings.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface border border-white/10 mb-4 text-dim">
                  //
                </div>
                <h3 className="text-xl font-bold mb-2">No results found</h3>
                <p className="text-dim text-sm mb-6">
                  Try adjusting your search or filters
                </p>
                <button
                  onClick={clearAllFilters}
                  className="text-lime hover:underline text-sm"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results?.listings.map((item) => (
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
                {results && results.pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => updateFilters({ page: page - 1 })}
                      disabled={page === 1}
                      className="px-4 py-2 bg-surface border border-white/10 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-lime/50 transition"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-dim">
                      Page {page} of {results.pagination.pages}
                    </span>
                    <button
                      onClick={() => updateFilters({ page: page + 1 })}
                      disabled={page >= results.pagination.pages}
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
      </div>
    </div>
  );
}
