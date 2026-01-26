'use client';

import React, { useEffect, useState, use } from 'react';
import {
  ArrowLeft, ExternalLink, ShieldCheck, Truck, CheckCircle, Share2, Trash2,
  Heart, Eye, Clock, ChevronRight, Star, Tag, Package, CreditCard, RefreshCw,
  MessageSquare, X, ChevronLeft, Users, Zap, BadgeCheck
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchBar from '../../components/SearchBar';
import VerticalCategoryNav from '../../components/VerticalCategoryNav';
import { API_URL } from '@/lib/api';

// Generate session ID for anonymous users
function getSessionId() {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem('parallel_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('parallel_session_id', sessionId);
  }
  return sessionId;
}

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: any;
  onSubmit: (amount: number, message: string) => Promise<void>;
}

function OfferModal({ isOpen, onClose, listing, onSubmit }: OfferModalProps) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const minOffer = listing.priceParallel * 0.5;
  const suggestedOffers = [
    Math.round(listing.priceParallel * 0.85),
    Math.round(listing.priceParallel * 0.90),
    Math.round(listing.priceParallel * 0.95)
  ];

  const handleSubmit = async () => {
    const offerAmount = parseFloat(amount);
    if (isNaN(offerAmount) || offerAmount < minOffer) {
      setError(`Minimum offer is $${minOffer.toFixed(0)}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit(offerAmount, message);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to submit offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-white/10 rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-dim hover:text-white transition">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1">Make an Offer</h2>
        <p className="text-dim text-sm mb-6">The seller may accept, decline, or counter your offer.</p>

        {/* Current Price */}
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <div className="text-sm text-dim mb-1">Listed Price</div>
          <div className="text-2xl font-bold font-mono text-lime">
            ${(listing.priceParallel + listing.shippingParallel).toFixed(0)}
          </div>
        </div>

        {/* Quick Offer Buttons */}
        <div className="flex gap-2 mb-4">
          {suggestedOffers.map((offer) => (
            <button
              key={offer}
              onClick={() => setAmount(offer.toString())}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                amount === offer.toString()
                  ? 'bg-lime/20 border-lime text-lime'
                  : 'bg-white/5 border-white/10 hover:border-white/30'
              }`}
            >
              ${offer}
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Your Offer</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dim">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={minOffer.toFixed(0)}
              className="w-full bg-midnight border border-white/10 rounded-lg pl-8 pr-4 py-3 focus:outline-none focus:border-lime/50 font-mono text-lg"
            />
          </div>
          <p className="text-xs text-dim mt-1">Minimum offer: ${minOffer.toFixed(0)}</p>
        </div>

        {/* Message */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note to the seller..."
            rows={2}
            className="w-full bg-midnight border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-lime/50 text-sm resize-none"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !amount}
          className="w-full bg-lime text-midnight font-bold py-3 rounded-xl hover:bg-lime/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Offer'}
        </button>
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: any }) {
  return (
    <Link
      href={`/listing/${item.id}`}
      className="group bg-surface border border-white/10 rounded-xl overflow-hidden hover:border-lime/50 transition flex-shrink-0 w-48"
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
      </div>
      <div className="p-3">
        <h3 className="font-medium text-xs truncate mb-1">{item.title}</h3>
        <div className="text-sm font-mono font-bold text-lime">
          ${(item.priceParallel + item.shippingParallel).toFixed(0)}
        </div>
      </div>
    </Link>
  );
}

export default function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const sessionId = getSessionId();
        const res = await fetch(`${API_URL}/api/v1/listings/${id}`, {
          headers: { 'x-session-id': sessionId }
        });
        if (res.ok) {
          const data = await res.json();
          setItem(data);
          setIsWatching(data.isWatching);
          setWatcherCount(data.watcherCount || 0);
        }
      } catch (e) {
        console.error("Failed to load item");
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const toggleWatchlist = async () => {
    const sessionId = getSessionId();
    try {
      if (isWatching) {
        await fetch(`${API_URL}/api/v1/watchlist/${id}`, {
          method: 'DELETE',
          headers: { 'x-session-id': sessionId }
        });
        setIsWatching(false);
        setWatcherCount(c => c - 1);
      } else {
        await fetch(`${API_URL}/api/v1/watchlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
          body: JSON.stringify({ listingId: id })
        });
        setIsWatching(true);
        setWatcherCount(c => c + 1);
      }
    } catch (e) {
      console.error('Failed to update watchlist');
    }
  };

  const submitOffer = async (amount: number, message: string) => {
    const res = await fetch(`${API_URL}/api/v1/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: id, amount, message })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error);
    setOfferSuccess(true);
    setTimeout(() => setOfferSuccess(false), 5000);
  };

  const deleteListing = async () => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await fetch(`${API_URL}/api/v1/listings/${id}`, { method: 'DELETE' });
      router.push('/');
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-midnight flex items-center justify-center text-lime font-mono animate-pulse">
      LOADING_DATA...
    </div>
  );

  if (!item) return (
    <div className="min-h-screen bg-midnight flex items-center justify-center text-dim font-mono">
      ERROR: 404_ITEM_NOT_FOUND
    </div>
  );

  const sourceTotal = item.priceSource + item.shippingSource;
  const parallelTotal = item.priceParallel + item.shippingParallel;
  const savingsPercent = Math.round((item.buyerSavings / sourceTotal) * 100);

  return (
    <main className="min-h-screen bg-midnight text-white font-sans selection:bg-lime selection:text-midnight">
      {/* Header */}
      <nav className="border-b border-white/10 px-8 py-4 flex items-center gap-6 bg-midnight/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="font-mono text-xl font-bold tracking-tighter flex items-center gap-2">
          <span className="text-lime font-bold">//</span> PARALLEL
        </Link>
        <SearchBar onSearch={handleSearch} className="flex-1 max-w-2xl" />
      </nav>

      <div className="flex">
        {/* Left Sidebar */}
        <div className="hidden lg:block w-64 border-r border-white/10 h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto bg-surface/50">
          <VerticalCategoryNav />
        </div>

        {/* Right Content */}
        <div className="flex-1 max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="px-6 py-4">
        <nav className="flex items-center gap-2 text-sm text-dim">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight size={14} />
          {item.category?.parent && (
            <>
              <Link href={`/category/${item.category.parent.slug}`} className="hover:text-white transition">
                {item.category.parent.name}
              </Link>
              <ChevronRight size={14} />
            </>
          )}
          {item.category && (
            <>
              <Link href={`/category/${item.category.slug}`} className="hover:text-white transition">
                {item.category.name}
              </Link>
              <ChevronRight size={14} />
            </>
          )}
          <span className="text-white truncate max-w-xs">{item.title}</span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Success Banner */}
        {offerSuccess && (
          <div className="mb-6 p-4 bg-lime/10 border border-lime/30 rounded-xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
            <CheckCircle className="text-lime" size={20} />
            <span>Your offer has been submitted! The seller will respond within 48 hours.</span>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Left: Gallery */}
          <div className="space-y-4">
            {/* Social Proof Badge */}
            <div className="flex items-center gap-4 text-sm">
              {item.viewCount > 5 && (
                <span className="bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Zap size={14} />
                  {item.viewCount} viewed in 24 hours
                </span>
              )}
              {watcherCount > 0 && (
                <span className="text-dim flex items-center gap-1.5">
                  <Users size={14} />
                  {watcherCount} watching
                </span>
              )}
            </div>

            {/* Main Image */}
            <div className="aspect-square bg-black rounded-2xl border border-white/10 overflow-hidden relative group">
              <img
                src={item.images?.[activeImage] || 'https://via.placeholder.com/600x600?text=No+Image'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-4 transition duration-500 group-hover:scale-105"
              />

              {/* Navigation arrows */}
              {item.images?.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage(i => i > 0 ? i - 1 : item.images.length - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setActiveImage(i => i < item.images.length - 1 ? i + 1 : 0)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {item.condition && (
                  <span className="bg-surface/90 backdrop-blur text-xs font-medium px-3 py-1 rounded capitalize">
                    {item.condition}
                  </span>
                )}
                <span className="bg-white/10 backdrop-blur px-3 py-1 rounded text-xs font-mono flex items-center gap-2">
                  {item.sourcePlatform}
                  <ExternalLink size={10} />
                </span>
              </div>

              {/* Favorite Button */}
              <button
                onClick={toggleWatchlist}
                className={`absolute top-4 right-4 w-10 h-10 rounded-full backdrop-blur flex items-center justify-center transition ${
                  isWatching ? 'bg-red-500 text-white' : 'bg-black/50 hover:bg-black/70'
                }`}
              >
                <Heart size={18} fill={isWatching ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {(item.images || []).map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-20 rounded-lg border bg-black shrink-0 overflow-hidden transition ${
                    activeImage === idx ? 'border-lime ring-2 ring-lime/20' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Details */}
          <div>
            {/* Brand & Title */}
            {item.brand && (
              <div className="text-sm text-lime font-bold uppercase tracking-wider mb-2">{item.brand}</div>
            )}
            <h1 className="text-2xl font-bold leading-tight mb-4">{item.title}</h1>

            {/* Seller Info */}
            {item.user && (
              <Link
                href={`/profile/${item.user.id}`}
                className="flex items-center gap-3 p-3 bg-surface border border-white/10 rounded-xl mb-6 hover:border-lime/30 transition group"
              >
                <img
                  src={item.user.avatar || 'https://via.placeholder.com/40'}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold truncate">{item.user.name}</span>
                    {item.user.isVerified && <BadgeCheck size={16} className="text-lime flex-shrink-0" />}
                  </div>
                  {item.sellerStats && (
                    <div className="text-xs text-dim flex items-center gap-2">
                      {item.sellerStats.positivePercent && (
                        <span className="text-lime">{item.sellerStats.positivePercent}% positive</span>
                      )}
                      <span>•</span>
                      <span>{item.sellerStats.totalListings} items</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="text-dim group-hover:text-white transition" />
              </Link>
            )}

            {/* Price Card */}
            <div className="bg-surface border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold font-mono text-lime">${parallelTotal.toFixed(2)}</span>
                <span className="text-lg text-dim line-through">${sourceTotal.toFixed(2)}</span>
                <span className="bg-lime/20 text-lime text-sm font-bold px-2 py-0.5 rounded">
                  {savingsPercent}% OFF
                </span>
              </div>
              <p className="text-sm text-dim mb-6">
                You save <span className="text-white font-medium">${item.buyerSavings.toFixed(2)}</span> vs {item.sourcePlatform}
              </p>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    const res = await fetch(`${API_URL}/api/v1/checkout/session`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ listingId: item.id })
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  }}
                  className="w-full bg-lime text-midnight font-bold py-4 rounded-xl text-lg hover:bg-lime/90 transition"
                >
                  Buy It Now
                </button>

                <button
                  onClick={() => setShowOfferModal(true)}
                  className="w-full bg-transparent border-2 border-lime text-lime font-bold py-3 rounded-xl hover:bg-lime/10 transition"
                >
                  Make Offer
                </button>

                <button
                  onClick={toggleWatchlist}
                  className={`w-full border font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 ${
                    isWatching
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'border-white/20 text-dim hover:border-white/40 hover:text-white'
                  }`}
                >
                  <Heart size={18} fill={isWatching ? 'currentColor' : 'none'} />
                  {isWatching ? 'Watching' : 'Add to Watchlist'}
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-surface border border-white/10 rounded-xl">
                <ShieldCheck size={20} className="text-lime" />
                <div>
                  <div className="text-sm font-medium">Buyer Protection</div>
                  <div className="text-xs text-dim">Money back guarantee</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface border border-white/10 rounded-xl">
                <RefreshCw size={20} className="text-lime" />
                <div>
                  <div className="text-sm font-medium">Easy Returns</div>
                  <div className="text-xs text-dim">30 day returns</div>
                </div>
              </div>
            </div>

            {/* Shipping & Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-surface border border-white/10 rounded-xl">
                <Truck size={20} className="text-dim mt-0.5" />
                <div>
                  <div className="font-medium">Shipping</div>
                  <div className="text-sm text-dim">
                    {item.shippingParallel > 0 ? (
                      <>
                        <span className="text-white font-mono">${item.shippingParallel.toFixed(2)}</span> via{' '}
                        {item.shippingParallel > 10 ? 'Priority Mail' : 'USPS Ground'} • 3-5 business days
                      </>
                    ) : (
                      <span className="text-lime font-medium">Free Shipping</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-surface border border-white/10 rounded-xl">
                <CreditCard size={20} className="text-dim mt-0.5" />
                <div>
                  <div className="font-medium">Payments</div>
                  <div className="text-sm text-dim">
                    Visa, Mastercard, PayPal, Apple Pay
                  </div>
                </div>
              </div>

              {item.description && (
                <div className="p-4 bg-surface border border-white/10 rounded-xl">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-dim leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>
                </div>
              )}
            </div>

            {/* Admin Actions */}
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-dim font-mono">ID: {item.id.slice(0, 8)}</span>
              <div className="flex gap-2">
                <button
                  onClick={deleteListing}
                  className="p-2 hover:bg-red-500/10 text-dim hover:text-red-500 rounded-lg transition"
                  title="Delete Listing"
                >
                  <Trash2 size={18} />
                </button>
                <button className="p-2 hover:bg-white/10 text-dim hover:text-white rounded-lg transition">
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Items */}
        {item.similarItems?.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Similar Items</h2>
              {item.category && (
                <Link href={`/category/${item.category.slug}`} className="text-sm text-lime hover:underline">
                  See all
                </Link>
              )}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
              {item.similarItems.map((similar: any) => (
                <ItemCard key={similar.id} item={similar} />
              ))}
            </div>
          </section>
        )}

        {/* Seller's Other Items */}
        {item.sellerOtherItems?.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">More from this Seller</h2>
              {item.user && (
                <Link href={`/profile/${item.user.id}`} className="text-sm text-lime hover:underline">
                  View all {item.sellerStats?.totalListings} items
                </Link>
              )}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
              {item.sellerOtherItems.map((sellerItem: any) => (
                <ItemCard key={sellerItem.id} item={sellerItem} />
              ))}
            </div>
          </section>
        )}

        {/* More from Category */}
        {item.categoryItems?.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">More in {item.category?.parent?.name || item.category?.name}</h2>
              {item.category?.parent && (
                <Link href={`/category/${item.category.parent.slug}`} className="text-sm text-lime hover:underline">
                  See all
                </Link>
              )}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
              {item.categoryItems.map((catItem: any) => (
                <ItemCard key={catItem.id} item={catItem} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  </div>

      {/* Offer Modal */}
      <OfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        listing={item}
        onSubmit={submitOffer}
      />
    </main>
  );
}
