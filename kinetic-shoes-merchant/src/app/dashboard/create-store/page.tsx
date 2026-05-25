// src/app/dashboard/create-store/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Store, ArrowRight, AlertCircle } from 'lucide-react';

export default function CreateStorePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [merchantType, setMerchantType] = useState('basic_shop');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/store', {
        name,
        description: description || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        logoUrl: logoUrl || null,
        merchantType,
      });
      // Redirect to main dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to setup store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 bg-white p-8 rounded-2xl border border-[#EEEEEE] shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0FBF3] text-[#13B734]">
          <Store className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Onboard Your Store</h1>
          <p className="text-sm text-[#9BA5B4]">Tell us about your brand to setup your merchant dashboard.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Store Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">
              Store Name <span className="text-[#13B734]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-3 px-4 text-[#111111] placeholder-[#9BA5B4] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] sm:text-sm transition-all"
              placeholder="e.g. Doorstep Market"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-3 px-4 text-[#111111] placeholder-[#9BA5B4] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] sm:text-sm transition-all"
              placeholder="Tell customers about your store..."
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-3 px-4 text-[#111111] placeholder-[#9BA5B4] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] sm:text-sm transition-all"
              placeholder="store@company.com"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-3 px-4 text-[#111111] placeholder-[#9BA5B4] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] sm:text-sm transition-all"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Logo URL */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">
              Logo Image URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-3 px-4 text-[#111111] placeholder-[#9BA5B4] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] sm:text-sm transition-all"
              placeholder="https://example.com/logo.png"
            />
          </div>

          {/* Merchant Type */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">
              Store Type
            </label>
            <select
              value={merchantType}
              onChange={(e) => setMerchantType(e.target.value)}
              className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-3 px-4 text-[#111111] placeholder-[#9BA5B4] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] sm:text-sm transition-all"
            >
              <option value="basic_shop">Basic Shop</option>
              <option value="vendor">Vendor</option>
              <option value="super_store">Super Store</option>
            </select>
          </div>

          {/* Physical Address */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">
              Store Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-3 px-4 text-[#111111] placeholder-[#9BA5B4] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] sm:text-sm transition-all"
              placeholder="123 Main St, New York, NY 10001"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#EEEEEE]">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[#13B734] px-6 py-3 text-sm font-semibold text-white hover:bg-[#109E2B] focus:outline-none focus:ring-2 focus:ring-[#13B734] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up store...' : 'Create Store'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
