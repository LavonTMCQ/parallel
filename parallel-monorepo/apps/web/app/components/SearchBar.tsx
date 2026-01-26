'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, TrendingUp } from 'lucide-react';

interface SearchBarProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

const TRENDING_SEARCHES = [
  'Rolex Submariner',
  'Jordan 1',
  'MacBook Pro',
  'Pokemon Cards',
  'Gucci Bag',
];

export default function SearchBar({ initialQuery = '', onSearch, className = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query.trim());
      } else {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    if (onSearch) {
      onSearch(suggestion);
    } else {
      router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    }
    setShowSuggestions(false);
  };

  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className={`relative flex items-center bg-surface border rounded-xl transition-all duration-200 ${
          isFocused ? 'border-lime/50 ring-2 ring-lime/20' : 'border-white/10 hover:border-white/20'
        }`}>
          <Search size={18} className="absolute left-4 text-dim" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              // Delay hiding to allow click on suggestions
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder="Search for watches, sneakers, electronics..."
            className="w-full bg-transparent pl-12 pr-10 py-3 text-sm text-white placeholder:text-dim focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-4 text-dim hover:text-white transition"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && !query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs text-dim">
              <TrendingUp size={12} />
              <span>Trending Searches</span>
            </div>
          </div>
          <div className="py-2">
            {TRENDING_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => handleSuggestionClick(term)}
                className="w-full px-4 py-2 text-left text-sm text-dim hover:text-white hover:bg-white/5 transition"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
