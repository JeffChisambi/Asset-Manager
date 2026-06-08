// src/components/ProductTable.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { 
  Search, Plus, Edit2, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, 
  X, Check, AlertCircle, Sparkles, Filter, Loader2, PackageOpen, FolderOpen
} from 'lucide-react';
import BulkImageUploadModal from '@/components/BulkImageUploadModal';

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string | null;
  brand: string | null;
  description: string | null;
  imageUrl?: string | null;
}

export default function ProductTable() {
  // Products and loading
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Pagination, search, sort, filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Selected products for bulk delete
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Dialog / Modal state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Unique categories list for filtering
  const [categories, setCategories] = useState<string[]>([]);

  // Load products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: {
          search: search || undefined,
          category: category || undefined,
          sortBy,
          sortOrder,
          page,
          limit,
        }
      });
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);

      // Extract categories list once in background if empty
      if (categories.length === 0) {
        // Fetch all products without pagination once to build category filter dropdown
        const allRes = await api.get('/products', { params: { limit: 1000 } });
        const allProds = allRes.data.products || [];
        const uniqueCats = Array.from(new Set(allProds.map((p: any) => p.category).filter(Boolean))) as string[];
        setCategories(uniqueCats);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, sortBy, sortOrder, page, categories.length]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle Search Input Change with simple debounce logic or on enter/button
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  // Delete product
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setSelectedIds(prev => prev.filter(x => x !== id));
      fetchProducts();
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) return;
    try {
      await api.post('/products/bulk-delete', { ids: selectedIds });
      setSelectedIds([]);
      fetchProducts();
    } catch (err) {
      alert('Failed to bulk delete products');
    }
  };

  // Handle Select All / Single Select
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(products.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  // Sort toggle
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Modal Submit
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSubmitting(true);

    try {
      // If there's a selected file, upload it first
      let uploadedImageUrl: string | undefined;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await api.post('/products/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedImageUrl = uploadRes.data.imageUrl;
      }
      const payload = {
        name: currentProduct.name,
        sku: currentProduct.sku,
        price: currentProduct.price ? Number(currentProduct.price) : 0,
        stock: currentProduct.stock ? Number(currentProduct.stock) : 0,
        category: currentProduct.category || null,
        brand: currentProduct.brand || null,
        description: currentProduct.description || null,
        imageUrl: uploadedImageUrl || currentProduct.imageUrl || null,
      };

      if (modalMode === 'create') {
        await api.post('/products', payload);
      } else {
        await api.put(`/products/${currentProduct.id}`, payload);
      }
      setShowAddEditModal(false);
      fetchProducts();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Something went wrong. Please check your inputs.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EEEEEE] shadow-sm">
        
        {/* Search & Filters */}
        <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute inset-y-0 left-3 my-auto h-5 w-5 text-[#9BA5B4]" />
            <input
              type="text"
              placeholder="Search products by SKU, Name, Brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F0F3F9] text-sm text-[#111111] rounded-xl border border-transparent focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute inset-y-0 left-3 my-auto h-4 w-4 text-[#9BA5B4]" />
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 py-2.5 bg-[#F0F3F9] text-sm text-[#111111] rounded-xl border border-transparent focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] transition-all appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button 
            type="submit"
            className="px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all"
          >
            Find
          </button>
        </form>

        {/* Global Operations */}
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 text-sm font-semibold transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedIds.length})
            </button>
          )}

          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#111111] border border-[#EEEEEE] rounded-xl hover:bg-[#F5F7FA] text-sm font-semibold transition-all shadow-sm"
          >
            <FolderOpen className="h-4 w-4 text-[#13B734]" />
            Bulk Image Upload
          </button>

          <button
            onClick={() => {
              setModalMode('create');
              setCurrentProduct({ name: '', sku: '', price: 0, stock: 0, category: '', brand: '', description: '' });
              setModalError(null);
              setPreviewUrl('');
              setSelectedFile(null);
              setShowAddEditModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#13B734] text-white rounded-xl hover:bg-[#109E2B] text-sm font-semibold transition-all shadow-md shadow-[#13B734]/15"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-[#EEEEEE] text-[#9BA5B4]">
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-[#EEEEEE] text-[#13B734] focus:ring-[#13B734] cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">
                  Product Details
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-[#111111] transition-colors" onClick={() => toggleSort('sku')}>
                  <div className="flex items-center gap-1.5">
                    SKU <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-[#111111] transition-colors" onClick={() => toggleSort('price')}>
                  <div className="flex items-center gap-1.5 justify-end">
                    Price <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-[#111111] transition-colors" onClick={() => toggleSort('stock')}>
                  <div className="flex items-center gap-1.5 justify-end">
                    Stock <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEEE]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-[#9BA5B4]">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin h-7 w-7 text-[#13B734]" />
                      <span className="text-sm">Fetching stock table...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-[#9BA5B4]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-[#F5F7FA] flex items-center justify-center text-[#9BA5B4]">
                        <PackageOpen className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">No products found</p>
                      <p className="text-xs">Add a single product or launch the Import Wizard.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const isOutOfStock = p.stock <= 0;
                  return (
                    <tr key={p.id} className={`hover:bg-[#F0FBF3]/10 transition-colors ${isSelected ? 'bg-[#F0FBF3]/10' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                          className="rounded border-[#EEEEEE] text-[#13B734] focus:ring-[#13B734] cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover border border-[#EEEEEE] bg-[#F5F7FA]" />
                          ) : (
                            <div className="h-12 w-12 rounded-xl border border-[#EEEEEE] bg-[#F5F7FA] flex items-center justify-center text-[#9BA5B4]">
                              <PackageOpen className="h-5 w-5" />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-[#111111] text-sm hover:text-[#13B734] transition-colors cursor-pointer truncate" onClick={() => {
                              setModalMode('edit');
                              setCurrentProduct(p);
                              setModalError(null);
                              setPreviewUrl(p.imageUrl || '');
                              setSelectedFile(null);
                              setShowAddEditModal(true);
                            }}>{p.name}</span>
                            <span className="text-xs text-[#9BA5B4] mt-0.5 truncate">{p.brand || 'No Brand'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-[#9BA5B4]">
                        {p.sku}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#111111]">
                        {p.category ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0FBF3] text-[#13B734]">
                            {p.category}
                          </span>
                        ) : (
                          <span className="text-[#9BA5B4]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#111111] text-right">
                        MWK {Number(p.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                            Out of stock
                          </span>
                        ) : (
                          <span className="font-semibold text-[#111111]">{p.stock}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setModalMode('edit');
                              setCurrentProduct(p);
                              setModalError(null);
                              setPreviewUrl(p.imageUrl || '');
                              setSelectedFile(null);
                              setShowAddEditModal(true);
                            }}
                            className="p-1.5 text-[#9BA5B4] hover:text-[#13B734] hover:bg-[#F0FBF3] rounded-lg transition-all"
                            title="Edit Product"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-[#9BA5B4] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && products.length > 0 && (
          <div className="bg-white px-6 py-4 border-t border-[#EEEEEE] flex items-center justify-between">
            <span className="text-xs text-[#9BA5B4]">
              Showing <span className="font-semibold text-[#111111]">{((page - 1) * limit) + 1}</span> to{' '}
              <span className="font-semibold text-[#111111]">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-semibold text-[#111111]">{total}</span> products
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-[#EEEEEE] hover:bg-[#F5F7FA] disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                        page === pNum
                          ? 'bg-[#13B734] text-white shadow-sm'
                          : 'border border-[#EEEEEE] hover:bg-[#F5F7FA] text-[#9BA5B4] hover:text-[#111111]'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-[#EEEEEE] hover:bg-[#F5F7FA] disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog (Modal Box) */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl border border-[#EEEEEE] shadow-xl w-full max-w-xl overflow-hidden animate-zoom-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEEEEE]">
              <div className="flex items-center gap-2 text-[#13B734]">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-lg font-bold text-[#111111]">
                  {modalMode === 'create' ? 'Add Footwear Product' : 'Edit Footwear Product'}
                </h3>
              </div>
              <button 
                onClick={() => setShowAddEditModal(false)}
                className="p-1.5 rounded-full hover:bg-[#F5F7FA] text-[#9BA5B4] hover:text-[#111111] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                
                {modalError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-xs text-red-600 border border-red-100">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name & Image */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                      Product Name <span className="text-[#13B734]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={currentProduct.name || ''}
                      onChange={(e) => setCurrentProduct(prev => ({ ...prev, name: e.target.value }))}
                      className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-2.5 px-3.5 text-sm text-[#111111] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] transition-all"
                      placeholder="e.g. Doorstep Runner 5"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#111111] uppercase tracking-wider mb-2">Product Image</label>
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setPreviewUrl(url);
                      } else {
                        setPreviewUrl('');
                      }
                    }} className="block w-full text-sm text-[#111111] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-[#13B734] file:text-white hover:file:bg-[#109E2B]" />
                    {previewUrl && (
                      <img src={previewUrl} alt="Preview" className="mt-2 h-24 object-cover rounded" />
                    )}
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                      SKU Code <span className="text-[#13B734]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={currentProduct.sku || ''}
                      onChange={(e) => setCurrentProduct(prev => ({ ...prev, sku: e.target.value }))}
                      className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-2.5 px-3.5 text-sm text-[#111111] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] transition-all"
                      placeholder="e.g. KT-RUN-5"
                    />
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={currentProduct.brand || ''}
                      onChange={(e) => setCurrentProduct(prev => ({ ...prev, brand: e.target.value }))}
                      className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-2.5 px-3.5 text-sm text-[#111111] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] transition-all"
                      placeholder="e.g. Doorstep"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                      Price (MWK) <span className="text-[#13B734]">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={currentProduct.price ?? ''}
                      onChange={(e) => setCurrentProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-2.5 px-3.5 text-sm text-[#111111] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] transition-all"
                      placeholder="120.00"
                    />
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                      Initial Stock Quantity <span className="text-[#13B734]">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={currentProduct.stock ?? ''}
                      onChange={(e) => setCurrentProduct(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                      className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-2.5 px-3.5 text-sm text-[#111111] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] transition-all"
                      placeholder="50"
                    />
                  </div>

                  {/* Category */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <input
                      type="text"
                      value={currentProduct.category || ''}
                      onChange={(e) => setCurrentProduct(prev => ({ ...prev, category: e.target.value }))}
                      className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-2.5 px-3.5 text-sm text-[#111111] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] transition-all"
                      placeholder="e.g. Running, Lifestyle, Basketball"
                    />
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                      Product Description
                    </label>
                    <textarea
                      value={currentProduct.description || ''}
                      onChange={(e) => setCurrentProduct(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="block w-full rounded-xl border border-[#EEEEEE] bg-[#F0F3F9] py-2.5 px-3.5 text-sm text-[#111111] focus:border-[#13B734] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#13B734] transition-all"
                      placeholder="Provide details about fit, comfort, materials..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#F5F7FA] border-t border-[#EEEEEE]">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 border border-[#EEEEEE] bg-white text-sm font-semibold rounded-xl hover:bg-[#F5F7FA] text-[#111111] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#13B734] text-white text-sm font-semibold rounded-xl hover:bg-[#109E2B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalSubmitting ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {modalMode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Image Upload Modal */}
      {showBulkModal && (
        <BulkImageUploadModal 
          onClose={() => setShowBulkModal(false)}
          onComplete={() => {
            setShowBulkModal(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
