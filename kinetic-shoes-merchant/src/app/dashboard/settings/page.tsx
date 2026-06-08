'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Settings, Save, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

interface StoreData {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  coverImageUrl: string;
  themeColor: string;
  merchantType: string;
}

export default function StoreSettingsPage() {
  const [store, setStore] = useState<StoreData>({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    logoUrl: '',
    coverImageUrl: '',
    themeColor: '#13B734',
    merchantType: 'basic_shop',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await api.get('/store');
        const data = res.data;
        setStore({
          name: data.name || '',
          description: data.description || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          logoUrl: data.logoUrl || '',
          coverImageUrl: data.coverImageUrl || '',
          themeColor: data.themeColor || '#13B734',
          merchantType: data.merchantType || 'basic_shop',
        });
        if (data.logoUrl) setLogoPreview(data.logoUrl);
        if (data.coverImageUrl) setCoverPreview(data.coverImageUrl);
      } catch (err: any) {
        if (err.response?.status !== 404) {
          setError('Failed to load store profile');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(url);
      } else {
        setCoverFile(file);
        setCoverPreview(url);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let finalLogoUrl = store.logoUrl;
      let finalCoverUrl = store.coverImageUrl;

      if (logoFile) {
        const fd = new FormData();
        fd.append('file', logoFile);
        const res = await api.post('/products/upload-image', fd);
        finalLogoUrl = res.data.imageUrl;
      }

      if (coverFile) {
        const fd = new FormData();
        fd.append('file', coverFile);
        const res = await api.post('/products/upload-image', fd);
        finalCoverUrl = res.data.imageUrl;
      }

      const payload = {
        ...store,
        logoUrl: finalLogoUrl,
        coverImageUrl: finalCoverUrl,
      };

      const hasStore = await api.get('/store').then(() => true).catch(() => false);
      if (hasStore) {
        await api.put('/store', payload);
      } else {
        await api.post('/store', payload);
      }

      setStore(payload);
      setSuccess('Store settings saved successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-[#13B734]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Store Settings</h1>
          <p className="text-sm text-[#9BA5B4] mt-1">Manage your storefront appearance and details.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-[#F0FBF3] text-[#13B734] p-4 rounded-xl border border-[#13B734]/20 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEEEE] space-y-6">
          <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-[#9BA5B4]" /> Appearance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Cover Photo */}
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-2">Cover Photo</label>
              <div className="relative h-32 w-full rounded-xl border-2 border-dashed border-[#EEEEEE] overflow-hidden group bg-[#F5F7FA]">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#9BA5B4]">
                    <Upload className="h-6 w-6 mb-2" />
                    <span className="text-xs">Upload Cover</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'cover')}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-2">Store Logo</label>
              <div className="relative h-24 w-24 rounded-full border-2 border-dashed border-[#EEEEEE] overflow-hidden group bg-[#F5F7FA]">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#9BA5B4]">
                    <Upload className="h-5 w-5 mb-1" />
                    <span className="text-[10px]">Logo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'logo')}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Theme Color */}
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-2">Theme Color</label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={store.themeColor}
                  onChange={(e) => setStore({ ...store, themeColor: e.target.value })}
                  className="h-10 w-20 rounded cursor-pointer border border-[#EEEEEE] p-1"
                />
                <span className="text-sm text-[#9BA5B4] font-mono uppercase">{store.themeColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEEEE] space-y-6">
          <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#9BA5B4]" /> General Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-2">Store Name</label>
              <input
                type="text"
                value={store.name}
                onChange={(e) => setStore({ ...store, name: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border border-[#EEEEEE] bg-[#F5F7FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13B734]/20 focus:border-[#13B734] transition-all"
                placeholder="e.g. Fresh Kicks"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-2">Store Type</label>
              <select
                value={store.merchantType}
                onChange={(e) => setStore({ ...store, merchantType: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#EEEEEE] bg-[#F5F7FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13B734]/20 focus:border-[#13B734] transition-all appearance-none"
              >
                <option value="basic_shop">Basic Shop</option>
                <option value="vendor">Vendor</option>
                <option value="super_store">Super Store</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#111111] mb-2">Description</label>
              <textarea
                value={store.description}
                onChange={(e) => setStore({ ...store, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[#EEEEEE] bg-[#F5F7FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13B734]/20 focus:border-[#13B734] transition-all"
                placeholder="Tell customers about your store..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-2">Phone</label>
              <input
                type="tel"
                value={store.phone}
                onChange={(e) => setStore({ ...store, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#EEEEEE] bg-[#F5F7FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13B734]/20 focus:border-[#13B734] transition-all"
                placeholder="e.g. +265 999..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#111111] mb-2">Email</label>
              <input
                type="email"
                value={store.email}
                onChange={(e) => setStore({ ...store, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#EEEEEE] bg-[#F5F7FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13B734]/20 focus:border-[#13B734] transition-all"
                placeholder="store@example.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#111111] mb-2">Address</label>
              <input
                type="text"
                value={store.address}
                onChange={(e) => setStore({ ...store, address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#EEEEEE] bg-[#F5F7FA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13B734]/20 focus:border-[#13B734] transition-all"
                placeholder="Physical location..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#13B734] hover:bg-[#10A02B] text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-[#13B734]/20"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
