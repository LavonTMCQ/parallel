'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface FilterOption {
  name: string;
  count: number;
}

interface FilterSidebarProps {
  categories?: { name: string; slug: string; children?: { name: string; slug: string }[] }[];
  brands?: FilterOption[];
  conditions?: FilterOption[];
  selectedCategory?: string;
  selectedBrand?: string;
  selectedCondition?: string;
  priceRange?: { min: number; max: number };
  onFilterChange: (filters: {
    category?: string;
    brand?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
  }) => void;
  onClearFilters: () => void;
}

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

const PRICE_RANGES = [
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $500', min: 100, max: 500 },
  { label: '$500 - $1,000', min: 500, max: 1000 },
  { label: '$1,000 - $5,000', min: 1000, max: 5000 },
  { label: 'Over $5,000', min: 5000, max: 999999 },
];

export default function FilterSidebar({
  brands = [],
  conditions = [],
  selectedBrand,
  selectedCondition,
  priceRange,
  onFilterChange,
  onClearFilters,
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['condition', 'price', 'brand'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const hasActiveFilters = selectedBrand || selectedCondition || priceRange;

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-bold">Filters</span>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-lime hover:text-lime/80 transition flex items-center gap-1"
            >
              <X size={12} />
              Clear all
            </button>
          )}
        </div>

        {/* Condition */}
        <div className="border-b border-white/10">
          <button
            onClick={() => toggleSection('condition')}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-white/5 transition"
          >
            <span>Condition</span>
            {expandedSections.has('condition') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.has('condition') && (
            <div className="px-4 pb-4 space-y-2">
              {CONDITIONS.map((cond) => {
                const count = conditions.find(c => c.name === cond.value)?.count || 0;
                return (
                  <label
                    key={cond.value}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="condition"
                      checked={selectedCondition === cond.value}
                      onChange={() => onFilterChange({ condition: cond.value })}
                      className="w-4 h-4 accent-lime"
                    />
                    <span className="text-xs text-dim group-hover:text-white transition flex-1">
                      {cond.label}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] text-dim">{count}</span>
                    )}
                  </label>
                );
              })}
              {selectedCondition && (
                <button
                  onClick={() => onFilterChange({ condition: undefined })}
                  className="text-xs text-dim hover:text-lime transition mt-2"
                >
                  Clear condition
                </button>
              )}
            </div>
          )}
        </div>

        {/* Price Range */}
        <div className="border-b border-white/10">
          <button
            onClick={() => toggleSection('price')}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-white/5 transition"
          >
            <span>Price</span>
            {expandedSections.has('price') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.has('price') && (
            <div className="px-4 pb-4 space-y-2">
              {PRICE_RANGES.map((range) => (
                <label
                  key={range.label}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="price"
                    checked={priceRange?.min === range.min && priceRange?.max === range.max}
                    onChange={() => onFilterChange({ minPrice: range.min, maxPrice: range.max })}
                    className="w-4 h-4 accent-lime"
                  />
                  <span className="text-xs text-dim group-hover:text-white transition">
                    {range.label}
                  </span>
                </label>
              ))}
              {priceRange && (
                <button
                  onClick={() => onFilterChange({ minPrice: undefined, maxPrice: undefined })}
                  className="text-xs text-dim hover:text-lime transition mt-2"
                >
                  Clear price
                </button>
              )}
            </div>
          )}
        </div>

        {/* Brand */}
        {brands.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('brand')}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-white/5 transition"
            >
              <span>Brand</span>
              {expandedSections.has('brand') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSections.has('brand') && (
              <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
                {brands.slice(0, 10).map((brand) => (
                  <label
                    key={brand.name}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === brand.name}
                      onChange={() => onFilterChange({ brand: brand.name })}
                      className="w-4 h-4 accent-lime"
                    />
                    <span className="text-xs text-dim group-hover:text-white transition flex-1 truncate">
                      {brand.name}
                    </span>
                    <span className="text-[10px] text-dim">{brand.count}</span>
                  </label>
                ))}
                {selectedBrand && (
                  <button
                    onClick={() => onFilterChange({ brand: undefined })}
                    className="text-xs text-dim hover:text-lime transition mt-2"
                  >
                    Clear brand
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
