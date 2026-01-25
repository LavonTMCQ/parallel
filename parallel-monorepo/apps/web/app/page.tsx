'use client';

import React, { useEffect, useState } from 'react';
import { Package, ExternalLink, RefreshCw, Tag, Trash2, ShoppingBag, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'SELLER' | 'BUYER'>('SELLER');

  const fetchListings = async () => {
    if (listings.length === 0) setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/listings');
      const data = await res.json();
      setListings(data);
    } catch (e) {
      console.error("Failed to fetch listings");
    } finally {
      setLoading(false);
    }
  };

  const deleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    setListings(prev => prev.filter(l => l.id !== id));
    try {
      await fetch(`http://localhost:8000/api/v1/listings/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Delete failed");
      fetchListings();
    }
  };

  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-midnight text-white font-sans selection:bg-lime selection:text-midnight">
      {/* Header */}
      <nav className="border-b border-white/10 px-8 py-4 flex justify-between items-center bg-midnight/80 backdrop-blur-md sticky top-0 z-50">
        <div className="font-mono text-2xl font-bold tracking-tighter flex items-center gap-2">
          <span className="text-lime font-bold">//</span> PARALLEL
        </div>
        
        {/* Role Switcher */}
        <div className="bg-surface border border-white/10 p-1 rounded-lg flex gap-1">
           <button 
             onClick={() => setViewMode('SELLER')}
             className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${viewMode === 'SELLER' ? 'bg-white/10 text-white' : 'text-dim hover:text-white'}`}
           >
             <List size={14} /> Seller Dashboard
           </button>
           <button 
             onClick={() => setViewMode('BUYER')}
             className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${viewMode === 'BUYER' ? 'bg-lime text-midnight' : 'text-dim hover:text-white'}`}
           >
             <LayoutGrid size={14} /> Shop Market
           </button>
        </div>

        <button onClick={fetchListings} className="p-2 hover:bg-white/5 rounded-full transition text-dim hover:text-lime">
           <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-12">
        
        {/* SELLER VIEW */}
        {viewMode === 'SELLER' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h1 className="text-4xl font-bold mb-2">Seller Dashboard</h1>
                <p className="text-dim">Real-time sync from eBay & Poshmark.</p>
              </div>
              <button 
                onClick={async () => {
                  const res = await fetch('http://localhost:8000/api/v1/onboarding/link', { method: 'POST' });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                }}
                className="bg-lime text-midnight px-4 py-2 rounded font-bold hover:bg-lime/90 transition text-sm ml-4"
              >
                Connect Wallet
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-surface border border-white/10 p-6 rounded-xl">
                <div className="text-xs font-mono text-dim mb-2 uppercase tracking-widest">Active Listings</div>
                <div className="text-3xl font-bold font-mono text-white">{listings.length}</div>
              </div>
              <div className="bg-surface border border-white/10 p-6 rounded-xl">
                <div className="text-xs font-mono text-dim mb-2 uppercase tracking-widest">Est. Revenue</div>
                <div className="text-3xl font-bold font-mono text-lime">
                  ${listings.reduce((acc, curr) => acc + curr.priceParallel, 0).toFixed(2)}
                </div>
              </div>
              <div className="bg-surface border border-white/10 p-6 rounded-xl">
                <div className="text-xs font-mono text-dim mb-2 uppercase tracking-widest">Avg. Savings</div>
                <div className="text-3xl font-bold font-mono text-dim">5.0%</div>
              </div>
              <div className="bg-surface border border-white/10 p-6 rounded-xl">
                <div className="text-xs font-mono text-dim mb-2 uppercase tracking-widest">Platform Fee</div>
                <div className="text-3xl font-bold font-mono text-lime">10%</div>
              </div>
            </div>

            <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                 <h2 className="font-bold flex items-center gap-2">
                   <Package size={18} className="text-lime" />
                   Recent Mirror Imports
                 </h2>
              </div>
              
              {listings.length === 0 && !loading ? (
                 <div className="p-20 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-midnight border border-white/10 mb-4 text-dim font-mono">
                       //
                    </div>
                    <h3 className="text-xl font-bold mb-1 text-white">No items mirrored yet</h3>
                    <p className="text-dim text-sm mb-6 max-w-xs mx-auto">
                      Use the Parallel Chrome Extension on eBay to sync your first item.
                    </p>
                 </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs font-mono text-dim uppercase">
                        <th className="px-6 py-4 font-medium">Item</th>
                        <th className="px-6 py-4 font-medium">Source</th>
                        <th className="px-6 py-4 font-medium">Price (eBay)</th>
                        <th className="px-6 py-4 font-medium">Parallel Price</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {listings.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition group cursor-pointer" onClick={() => window.location.href = `/listing/${item.id}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <img src={item.images?.[0]} referrerPolicy="no-referrer" className="w-10 h-10 rounded object-cover bg-black border border-white/10" />
                              <div className="max-w-xs">
                                <div className="text-sm font-bold truncate">{item.title}</div>
                                <div className="text-[10px] text-dim font-mono flex items-center gap-1 mt-1 uppercase">
                                   ID: {item.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <a href={item.sourceUrl} target="_blank" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-[10px] font-mono hover:bg-white/10 transition">
                              {item.sourcePlatform.toUpperCase()} <ExternalLink size={10} />
                            </a>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-dim">
                            ${(item.priceSource + item.shippingSource).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-lime font-bold">
                            ${(item.priceParallel + item.shippingParallel).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-lime/10 text-lime text-[10px] font-bold border border-lime/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-lime"></span>
                              LIVE
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteListing(item.id); }}
                              className="p-2 hover:bg-red-500/10 text-dim hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100"
                              title="Delete Listing"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BUYER VIEW */}
        {viewMode === 'BUYER' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">The Marketplace</h1>
                <p className="text-dim">Discover authenticated items at total landed cost.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {listings.map((item) => (
                 <Link href={`/listing/${item.id}`} key={item.id} className="group bg-surface border border-white/10 rounded-xl overflow-hidden hover:border-lime/50 transition duration-300">
                    <div className="aspect-square bg-black relative overflow-hidden">
                       <img 
                         src={item.images?.[0]} 
                         referrerPolicy="no-referrer"
                         className="w-full h-full object-cover transition duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100" 
                       />
                       <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded">
                          -{Math.round((item.buyerSavings / (item.priceSource + item.shippingSource)) * 100)}%
                       </div>
                    </div>
                    <div className="p-4">
                       <h3 className="font-bold text-sm truncate mb-1">{item.title}</h3>
                       <div className="flex justify-between items-end">
                          <div>
                             <div className="text-xs text-dim line-through">${(item.priceSource + item.shippingSource).toFixed(0)}</div>
                             <div className="text-lg font-mono font-bold text-lime">${(item.priceParallel + item.shippingParallel).toFixed(0)}</div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-lime group-hover:text-midnight transition">
                             <ShoppingBag size={14} />
                          </div>
                       </div>
                    </div>
                 </Link>
               ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
