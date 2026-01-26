'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import SearchBar from '../../components/SearchBar';
import VerticalCategoryNav from '../../components/VerticalCategoryNav';
import { API_URL } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent?: { name: string; slug: string };
  children: { id: string; name: string; slug: string }[];
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
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'newest';

  const updateParams = useCallback((updates: { page?: number; sort?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.page) params.set('page', updates.page.toString());
    if (updates.sort) params.set('sort', updates.sort);
    router.push(`/category/${slug}?${params.toString()}`);
  }, [router, searchParams, slug]);

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/categories/${slug}?page=${page}&sort=${sort}`);
        const data = await res.json();
        setCategory(data.category);
        setListings(data.listings || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      } catch (e) {
        console.error('Failed to fetch category:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCategory();
  }, [slug, page, sort]);

  if (loading || !category) {
    return (
      <div className="min-h-screen bg-midnight text-white flex items-center justify-center">
        <div className="text-dim">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight text-white">
      {/* Header */}
      <nav className="border-b border-white/10 px-8 py-4 flex items-center gap-6 bg-midnight/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="font-mono text-xl font-bold tracking-tighter flex items-center gap-2">
          <span className="text-lime font-bold">//</span> PARALLEL
        </Link>
        <SearchBar className="flex-1 max-w-2xl" />
      </nav>

      <div className="flex">
        {/* Left Sidebar */}
        <div className="hidden lg:block w-64 border-r border-white/10 h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto bg-surface/50">
          <VerticalCategoryNav />
        </div>

        {/* Right Content */}
        <div className="flex-1 px-8 py-8">
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
    </div>
  );
}
