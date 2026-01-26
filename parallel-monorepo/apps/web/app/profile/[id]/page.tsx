'use client';

import React, { useEffect, useState, use } from 'react';
import { CheckCircle, Star, Calendar, MapPin, Package, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

export default function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'LISTINGS' | 'REVIEWS'>('LISTINGS');

  useEffect(() => {
    fetch(`${API_URL}/api/v1/users/${id}`)
      .then(res => res.json())
      .then(setProfile)
      .catch(console.error);
  }, [id]);

  if (!profile) return <div className="min-h-screen bg-midnight text-white flex items-center justify-center">Loading Profile...</div>;

  return (
    <main className="min-h-screen bg-midnight text-white font-sans">
      {/* Cover Image (Abstract) */}
      <div className="h-48 bg-gradient-to-r from-lime/20 to-midnight border-b border-white/10"></div>

      <div className="max-w-5xl mx-auto px-6 -mt-20 relative">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-8">
          <div className="w-32 h-32 rounded-full border-4 border-midnight bg-surface overflow-hidden relative">
             <img src={profile.avatar || "https://via.placeholder.com/150"} className="w-full h-full object-cover" />
             {profile.isVerified && (
               <div className="absolute bottom-0 right-0 bg-lime text-midnight p-1 rounded-full border-4 border-midnight">
                 <CheckCircle size={16} />
               </div>
             )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {profile.name} 
              {profile.isVerified && <span className="bg-lime/10 text-lime text-xs px-2 py-1 rounded-full border border-lime/20 font-mono">VERIFIED SELLER</span>}
            </h1>
            <p className="text-dim mt-2 max-w-xl text-sm leading-relaxed">{profile.bio || "No bio yet."}</p>
            
            <div className="flex gap-6 mt-4 text-xs font-mono text-dim">
               <div className="flex items-center gap-2">
                 <Star size={14} className="text-lime" /> 5.0 Rating
               </div>
               <div className="flex items-center gap-2">
                 <Package size={14} /> {profile.listings.length} Active Listings
               </div>
               <div className="flex items-center gap-2">
                 <Calendar size={14} /> Joined 2026
               </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-8">
           <button 
             onClick={() => setActiveTab('LISTINGS')}
             className={`px-6 py-3 font-mono text-sm border-b-2 transition ${activeTab === 'LISTINGS' ? 'border-lime text-white' : 'border-transparent text-dim hover:text-white'}`}
           >
             Inventory
           </button>
           <button 
             onClick={() => setActiveTab('REVIEWS')}
             className={`px-6 py-3 font-mono text-sm border-b-2 transition ${activeTab === 'REVIEWS' ? 'border-lime text-white' : 'border-transparent text-dim hover:text-white'}`}
           >
             Reviews ({profile.reviewsReceived.length})
           </button>
        </div>

        {/* LISTINGS TAB */}
        {activeTab === 'LISTINGS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
            {profile.listings.map((item: any) => (
              <Link href={`/listing/${item.id}`} key={item.id} className="bg-surface border border-white/10 rounded-xl overflow-hidden hover:border-lime/50 transition group">
                 <div className="aspect-square bg-black relative">
                    <img src={item.images[0]} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                 </div>
                 <div className="p-4">
                    <h3 className="font-bold truncate">{item.title}</h3>
                    <div className="text-lime font-mono font-bold mt-1">${item.priceParallel.toFixed(0)}</div>
                 </div>
              </Link>
            ))}
          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'REVIEWS' && (
          <div className="space-y-4 max-w-2xl pb-20">
            {profile.reviewsReceived.map((review: any) => (
              <div key={review.id} className="bg-surface border border-white/10 p-6 rounded-xl">
                 <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                       <img src={review.author.avatar} className="w-full h-full object-cover" />
                    </div>
                    <div>
                       <div className="text-sm font-bold">{review.author.name}</div>
                       <div className="text-[10px] text-dim font-mono">VERIFIED BUYER</div>
                    </div>
                    <div className="ml-auto flex text-lime">
                       {[...Array(review.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                    </div>
                 </div>
                 <p className="text-dim text-sm leading-relaxed">"{review.comment}"</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
