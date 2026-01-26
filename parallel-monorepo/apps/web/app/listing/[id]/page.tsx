'use client';

import React, { useEffect, useState, use } from 'react';
import { ArrowLeft, ExternalLink, ShieldCheck, Truck, CheckCircle, Share2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/listings/${id}`);
        if (res.ok) {
          const data = await res.json();
          setItem(data);
        }
      } catch (e) {
        console.error("Failed to load item");
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const deleteListing = async () => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await fetch(`http://localhost:8000/api/v1/listings/${id}`, { method: 'DELETE' });
      router.push('/');
    } catch (e) {
      alert('Failed to delete');
    }
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

  return (
    <main className="min-h-screen bg-midnight text-white font-sans selection:bg-lime selection:text-midnight pb-20">
      {/* Nav */}
      <nav className="border-b border-white/10 px-8 py-4 bg-midnight/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-dim hover:text-white transition font-mono text-sm">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div className="font-mono font-bold tracking-tighter">
            <span className="text-lime">//</span> PARALLEL MARKET
          </div>
          <div className="flex gap-2">
            <button onClick={deleteListing} className="p-2 hover:bg-red-500/10 text-dim hover:text-red-500 rounded-full transition" title="Delete Listing">
              <Trash2 size={18} />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full text-dim transition">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-16">
        
        {/* Left: Gallery */}
        <div className="space-y-6">
          <div className="aspect-square bg-black rounded-2xl border border-white/10 overflow-hidden relative group">
            <img 
              src={item.images?.[activeImage] || 'https://via.placeholder.com/600x600?text=No+Image'} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-4 transition duration-500 group-hover:scale-105" 
            />
            {/* Platform Badge */}
            <div className="absolute top-4 left-4 bg-white/10 backdrop-blur px-3 py-1 rounded text-xs font-mono border border-white/10 flex items-center gap-2">
               <span>Imported from {item.sourcePlatform}</span>
               <ExternalLink size={10} />
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {(item.images || []).map((img: string, idx: number) => (
              <button 
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`w-20 h-20 rounded-lg border bg-black shrink-0 overflow-hidden transition ${activeImage === idx ? 'border-lime ring-2 ring-lime/20' : 'border-white/10 hover:border-white/30'}`}
              >
                <img src={img} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Details */}
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold leading-tight mb-4">{item.title}</h1>
            <div className="flex items-center gap-4 text-sm text-dim font-mono">
              <span className="bg-lime/10 text-lime px-2 py-1 rounded">ID: {item.id.slice(0,8)}</span>
              <span>Listed {new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="bg-surface border border-white/10 rounded-2xl p-8 mb-8 relative overflow-hidden">
            {item.user && (
              <Link href={`/profile/${item.user.id}`} className="absolute top-4 right-4 flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition group">
                 <img src={item.user.avatar || "https://via.placeholder.com/30"} className="w-6 h-6 rounded-full" />
                 <span className="text-xs font-bold">{item.user.name}</span>
                 {item.user.isVerified && <CheckCircle size={12} className="text-lime" />}
              </Link>
            )}
            
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <ShieldCheck size={100} />
            </div>
            
            <div className="relative z-10">
              <div className="text-dim text-sm font-mono mb-1 uppercase tracking-widest">Total Landed Cost</div>
              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-5xl font-bold font-mono text-lime">${parallelTotal.toFixed(2)}</span>
                <span className="text-xl text-dim line-through decoration-red-500/50">${sourceTotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-3 mb-8 bg-lime/5 border border-lime/20 rounded-lg p-3">
                 <CheckCircle className="text-lime" size={20} />
                 <span className="text-sm">You save <span className="font-bold text-white">${item.buyerSavings}</span> compared to {item.sourcePlatform}</span>
              </div>

              <button 
                onClick={async () => {
                  const res = await fetch('http://localhost:8000/api/v1/checkout/session', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ listingId: item.id })
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                }}
                className="w-full bg-lime text-midnight font-bold py-4 rounded-xl text-lg hover:bg-lime/90 transition shadow-[0_0_20px_rgba(163,230,53,0.2)]"
              >
                Buy Now
              </button>
              <p className="text-center text-xs text-dim mt-4 flex items-center justify-center gap-2">
                <ShieldCheck size={14} /> Parallel Escrow Protection
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-t border-white/10 pt-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Truck size={18} className="text-dim" /> Shipping
              </h3>
              <p className="text-dim text-sm">
                <span className="text-white font-mono block mb-1">
                  {item.shippingParallel > 10 ? 'Priority Mail' : 'USPS Ground Advantage'} — ${item.shippingParallel.toFixed(2)}
                </span>
                Delivery in 3-5 business days. Tracking provided by EasyPost.
              </p>
            </div>
            
            <div className="border-t border-white/10 pt-6">
              <h3 className="font-bold mb-4">Description</h3>
              <div className="text-dim text-sm leading-relaxed whitespace-pre-wrap">
                {item.description || "No description imported."}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
