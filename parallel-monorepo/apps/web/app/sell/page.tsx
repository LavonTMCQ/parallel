'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload, X, Image as ImageIcon, ChevronDown, ChevronRight, DollarSign,
  Tag, Package, FileText, Truck, Info, CheckCircle, AlertCircle, Camera,
  Plus, Trash2, GripVertical
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

const CONDITIONS = [
  { value: 'new', label: 'New', description: 'Brand new, unused, with original packaging' },
  { value: 'like-new', label: 'Like New', description: 'Used once or twice, no visible wear' },
  { value: 'good', label: 'Good', description: 'Light wear, fully functional' },
  { value: 'fair', label: 'Fair', description: 'Noticeable wear, but works properly' },
];

const SHIPPING_OPTIONS = [
  { value: 'standard', label: 'Standard Shipping', price: 8.99, days: '5-7 business days' },
  { value: 'priority', label: 'Priority Shipping', price: 12.99, days: '2-3 business days' },
  { value: 'express', label: 'Express Shipping', price: 24.99, days: '1-2 business days' },
  { value: 'free', label: 'Free Shipping', price: 0, days: 'You cover shipping costs' },
];

export default function SellPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [images, setImages] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [brand, setBrand] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [shippingOption, setShippingOption] = useState('standard');
  const [acceptsOffers, setAcceptsOffers] = useState(true);

  // Item specifics
  const [specifics, setSpecifics] = useState<{ key: string; value: string }[]>([]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/categories');
        const data = await res.json();
        setCategories(data);
      } catch (e) {
        console.error('Failed to fetch categories');
      }
    };
    fetchCategories();
  }, []);

  // Calculate pricing
  const shippingPrice = SHIPPING_OPTIONS.find(s => s.value === shippingOption)?.price || 0;
  const listPrice = parseFloat(price) || 0;
  const totalPrice = listPrice + (shippingOption === 'free' ? 0 : shippingPrice);
  const platformFee = listPrice * 0.05; // 5% platform fee
  const sellerEarnings = listPrice - platformFee;

  // Handle image URL input
  const addImageFromUrl = () => {
    const urls = imageUrls.split('\n').filter(url => url.trim());
    const newImages = [...images, ...urls].slice(0, 12); // Max 12 images
    setImages(newImages);
    setImageUrls('');
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Reorder images
  const moveImage = (from: number, to: number) => {
    const newImages = [...images];
    const [removed] = newImages.splice(from, 1);
    newImages.splice(to, 0, removed);
    setImages(newImages);
  };

  // Add item specific
  const addSpecific = () => {
    setSpecifics([...specifics, { key: '', value: '' }]);
  };

  // Update item specific
  const updateSpecific = (index: number, field: 'key' | 'value', value: string) => {
    const newSpecifics = [...specifics];
    newSpecifics[index][field] = value;
    setSpecifics(newSpecifics);
  };

  // Remove item specific
  const removeSpecific = (index: number) => {
    setSpecifics(specifics.filter((_, i) => i !== index));
  };

  // Validate step
  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return images.length > 0;
      case 2:
        return title.length >= 10 && categoryId !== '';
      case 3:
        return condition !== '' && parseFloat(price) > 0;
      default:
        return true;
    }
  };

  // Submit listing
  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/v1/listings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          categoryId: selectedSubcategory?.id || selectedCategory?.id || categoryId,
          brand: brand || null,
          condition,
          price: parseFloat(price),
          shippingOption,
          shippingPrice: shippingOption === 'free' ? 0 : shippingPrice,
          images,
          acceptsOffers,
          specifics: specifics.filter(s => s.key && s.value),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create listing');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/listing/${data.id}`);
      }, 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Step indicators
  const steps = [
    { num: 1, label: 'Photos', icon: Camera },
    { num: 2, label: 'Details', icon: FileText },
    { num: 3, label: 'Pricing', icon: DollarSign },
    { num: 4, label: 'Review', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-midnight text-white">
      {/* Header */}
      <nav className="border-b border-white/10 px-8 py-4 bg-midnight/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-bold tracking-tighter flex items-center gap-2">
            <span className="text-lime font-bold">//</span> PARALLEL
          </Link>
          <Link href="/" className="text-sm text-dim hover:text-white transition">
            Cancel
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-10">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <button
                onClick={() => s.num < step && setStep(s.num)}
                disabled={s.num > step}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  step === s.num
                    ? 'bg-lime text-midnight font-bold'
                    : step > s.num
                    ? 'text-lime cursor-pointer hover:bg-lime/10'
                    : 'text-dim cursor-not-allowed'
                }`}
              >
                <s.icon size={18} />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${step > s.num ? 'bg-lime' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Success State */}
        {success && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-lime/20 text-lime mb-6">
              <CheckCircle size={40} />
            </div>
            <h1 className="text-3xl font-bold mb-2">Listing Created!</h1>
            <p className="text-dim">Redirecting to your listing...</p>
          </div>
        )}

        {/* Step 1: Photos */}
        {!success && step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Add Photos</h1>
              <p className="text-dim">Add up to 12 photos. The first photo will be the cover image.</p>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative aspect-square rounded-xl border overflow-hidden group ${
                    idx === 0 ? 'border-lime' : 'border-white/10'
                  }`}
                >
                  <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    {idx > 0 && (
                      <button
                        onClick={() => moveImage(idx, 0)}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                        title="Make cover"
                      >
                        <ImageIcon size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => removeImage(idx)}
                      className="p-2 bg-red-500/80 rounded-lg hover:bg-red-500 transition"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {idx === 0 && (
                    <div className="absolute top-2 left-2 bg-lime text-midnight text-[10px] font-bold px-2 py-0.5 rounded">
                      COVER
                    </div>
                  )}
                </div>
              ))}

              {images.length < 12 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-lime/50 hover:bg-lime/5 transition">
                  <Upload size={24} className="text-dim mb-2" />
                  <span className="text-xs text-dim">Add Photo</span>
                </label>
              )}
            </div>

            {/* URL Input */}
            <div className="bg-surface border border-white/10 rounded-xl p-4">
              <label className="block text-sm font-medium mb-2">Add Image URLs</label>
              <textarea
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                placeholder="Paste image URLs here (one per line)..."
                rows={3}
                className="w-full bg-midnight border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-lime/50 resize-none"
              />
              <button
                onClick={addImageFromUrl}
                disabled={!imageUrls.trim()}
                className="mt-3 px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition disabled:opacity-50"
              >
                Add URLs
              </button>
            </div>

            {/* Navigation */}
            <div className="flex justify-end pt-6">
              <button
                onClick={() => setStep(2)}
                disabled={!validateStep(1)}
                className="px-8 py-3 bg-lime text-midnight font-bold rounded-xl hover:bg-lime/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {!success && step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Item Details</h1>
              <p className="text-dim">Tell buyers about your item.</p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Nike Air Jordan 1 Retro High OG Chicago Size 10"
                maxLength={80}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-lime/50"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-dim">Be specific - include brand, model, size, color</span>
                <span className="text-xs text-dim">{title.length}/80</span>
              </div>
            </div>

            {/* Category */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedCategory?.id || ''}
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === e.target.value);
                    setSelectedCategory(cat || null);
                    setSelectedSubcategory(null);
                    setCategoryId(e.target.value);
                  }}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-lime/50 appearance-none cursor-pointer"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {selectedCategory?.children && selectedCategory.children.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Subcategory</label>
                  <select
                    value={selectedSubcategory?.id || ''}
                    onChange={(e) => {
                      const sub = selectedCategory.children?.find(c => c.id === e.target.value);
                      setSelectedSubcategory(sub || null);
                      if (sub) setCategoryId(sub.id);
                    }}
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-lime/50 appearance-none cursor-pointer"
                  >
                    <option value="">Select subcategory</option>
                    {selectedCategory.children.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium mb-2">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Nike, Apple, Gucci"
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-lime/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your item in detail. Include any flaws, measurements, or special features..."
                rows={5}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-lime/50 resize-none"
              />
            </div>

            {/* Item Specifics */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Item Specifics</label>
                <button
                  onClick={addSpecific}
                  className="text-sm text-lime hover:text-lime/80 transition flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="space-y-3">
                {specifics.map((spec, idx) => (
                  <div key={idx} className="flex gap-3">
                    <input
                      type="text"
                      value={spec.key}
                      onChange={(e) => updateSpecific(idx, 'key', e.target.value)}
                      placeholder="e.g., Size, Color, Material"
                      className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-lime/50"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => updateSpecific(idx, 'value', e.target.value)}
                      placeholder="e.g., Large, Blue, Leather"
                      className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-lime/50"
                    />
                    <button
                      onClick={() => removeSpecific(idx)}
                      className="p-2 text-dim hover:text-red-400 transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                {specifics.length === 0 && (
                  <p className="text-sm text-dim">Add details like size, color, material to help buyers find your item</p>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-white/20 rounded-xl hover:border-white/40 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!validateStep(2)}
                className="px-8 py-3 bg-lime text-midnight font-bold rounded-xl hover:bg-lime/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Pricing */}
        {!success && step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Set Your Price</h1>
              <p className="text-dim">Price your item competitively to sell faster.</p>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Condition <span className="text-red-400">*</span>
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                {CONDITIONS.map((cond) => (
                  <button
                    key={cond.value}
                    onClick={() => setCondition(cond.value)}
                    className={`p-4 rounded-xl border text-left transition ${
                      condition === cond.value
                        ? 'bg-lime/10 border-lime'
                        : 'bg-surface border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="font-medium mb-1">{cond.label}</div>
                    <div className="text-xs text-dim">{cond.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Price <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dim">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className="w-full bg-surface border border-white/10 rounded-xl pl-8 pr-4 py-3 font-mono text-xl focus:outline-none focus:border-lime/50"
                />
              </div>
            </div>

            {/* Accepts Offers */}
            <label className="flex items-center gap-3 p-4 bg-surface border border-white/10 rounded-xl cursor-pointer hover:border-white/30 transition">
              <input
                type="checkbox"
                checked={acceptsOffers}
                onChange={(e) => setAcceptsOffers(e.target.checked)}
                className="w-5 h-5 accent-lime"
              />
              <div>
                <div className="font-medium">Accept Offers</div>
                <div className="text-xs text-dim">Let buyers send you offers on this item</div>
              </div>
            </label>

            {/* Shipping */}
            <div>
              <label className="block text-sm font-medium mb-3">Shipping</label>
              <div className="space-y-3">
                {SHIPPING_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                      shippingOption === opt.value
                        ? 'bg-lime/10 border-lime'
                        : 'bg-surface border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingOption === opt.value}
                        onChange={() => setShippingOption(opt.value)}
                        className="w-4 h-4 accent-lime"
                      />
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-dim">{opt.days}</div>
                      </div>
                    </div>
                    <div className="font-mono font-bold">
                      {opt.price === 0 ? 'FREE' : `$${opt.price.toFixed(2)}`}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Earnings Breakdown */}
            {listPrice > 0 && (
              <div className="bg-surface border border-white/10 rounded-xl p-5">
                <h3 className="font-medium mb-4">Earnings Breakdown</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dim">Item price</span>
                    <span className="font-mono">${listPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dim">Platform fee (5%)</span>
                    <span className="font-mono text-red-400">-${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between font-bold">
                    <span>You'll earn</span>
                    <span className="font-mono text-lime">${sellerEarnings.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-dim">Buyer pays</span>
                    <span className="font-mono font-bold text-lg">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-white/20 rounded-xl hover:border-white/40 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!validateStep(3)}
                className="px-8 py-3 bg-lime text-midnight font-bold rounded-xl hover:bg-lime/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review Listing
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {!success && step === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Review Your Listing</h1>
              <p className="text-dim">Make sure everything looks good before publishing.</p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Preview Card */}
            <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
              {/* Images */}
              <div className="aspect-video bg-black relative">
                {images[0] && (
                  <img src={images[0]} alt={title} className="w-full h-full object-contain" />
                )}
                <div className="absolute bottom-4 left-4 flex gap-2">
                  {images.slice(0, 5).map((img, idx) => (
                    <div key={idx} className="w-12 h-12 rounded-lg border border-white/20 overflow-hidden">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {images.length > 5 && (
                    <div className="w-12 h-12 rounded-lg bg-black/80 flex items-center justify-center text-sm">
                      +{images.length - 5}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Title & Brand */}
                {brand && (
                  <div className="text-sm text-lime font-bold uppercase tracking-wider mb-1">{brand}</div>
                )}
                <h2 className="text-xl font-bold mb-4">{title}</h2>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <div>
                    <span className="text-dim">Category: </span>
                    <span>{selectedSubcategory?.name || selectedCategory?.name || 'Not selected'}</span>
                  </div>
                  <div>
                    <span className="text-dim">Condition: </span>
                    <span className="capitalize">{condition || 'Not selected'}</span>
                  </div>
                  {specifics.filter(s => s.key && s.value).map((spec, idx) => (
                    <div key={idx}>
                      <span className="text-dim">{spec.key}: </span>
                      <span>{spec.value}</span>
                    </div>
                  ))}
                </div>

                {/* Description */}
                {description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2">Description</h3>
                    <p className="text-sm text-dim whitespace-pre-wrap">{description}</p>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-3 pt-4 border-t border-white/10">
                  <span className="text-3xl font-bold font-mono text-lime">${totalPrice.toFixed(2)}</span>
                  {shippingOption === 'free' && (
                    <span className="text-sm text-lime">Free Shipping</span>
                  )}
                  {acceptsOffers && (
                    <span className="text-sm text-dim">• Accepts Offers</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-6">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 border border-white/20 rounded-xl hover:border-white/40 transition"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-lime text-midnight font-bold rounded-xl hover:bg-lime/90 transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Publish Listing
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
