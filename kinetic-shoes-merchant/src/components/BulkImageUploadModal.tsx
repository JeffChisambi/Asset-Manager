// src/components/BulkImageUploadModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, FolderOpen, Check, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';

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

interface MatchResult {
  file: File;
  product?: Product;
  previewUrl: string;
}

interface BulkImageUploadModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function BulkImageUploadModal({ onClose, onComplete }: BulkImageUploadModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [unmatched, setUnmatched] = useState<MatchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all products so we can map filenames to them
  useEffect(() => {
    async function fetchAllProducts() {
      try {
        const res = await api.get('/products', { params: { limit: 1000 } });
        setProducts(res.data.products || []);
      } catch (err) {
        console.error('Failed to load products for bulk upload:', err);
        setUploadError('Failed to load products. Please try again.');
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchAllProducts();
  }, []);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsProcessing(true);
    setUploadError(null);

    // Filter to only images
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    const newMatches: MatchResult[] = [];
    const newUnmatched: MatchResult[] = [];

    imageFiles.forEach(file => {
      // Remove extension for matching
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const lowerName = nameWithoutExt.toLowerCase();

      // Find best match by SKU or Name
      const match = products.find(p => 
        p.sku.toLowerCase() === lowerName || 
        p.name.toLowerCase() === lowerName
      );

      const result: MatchResult = {
        file,
        product: match,
        previewUrl: URL.createObjectURL(file),
      };

      if (match) {
        newMatches.push(result);
      } else {
        newUnmatched.push(result);
      }
    });

    setMatches(newMatches);
    setUnmatched(newUnmatched);
    setIsProcessing(false);
  };

  const handleUploadAndApply = async () => {
    if (matches.length === 0) return;
    
    setIsUploading(true);
    setUploadError(null);
    let successCount = 0;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (!match.product) continue;

      try {
        // 1. Upload the image
        const formData = new FormData();
        formData.append('file', match.file);
        const uploadRes = await api.post('/products/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadedImageUrl = uploadRes.data.imageUrl;

        // 2. Update the product
        await api.put(`/products/${match.product.id}`, {
          name: match.product.name,
          sku: match.product.sku,
          price: match.product.price,
          stock: match.product.stock,
          category: match.product.category,
          brand: match.product.brand,
          description: match.product.description,
          imageUrl: uploadedImageUrl,
        });

        successCount++;
        setUploadProgress(Math.round(((i + 1) / matches.length) * 100));
      } catch (err) {
        console.error(`Failed to process ${match.file.name}:`, err);
        // Continue with the next file even if one fails
      }
    }

    setIsUploading(false);
    
    if (successCount === matches.length) {
      onComplete();
    } else {
      setUploadError(`Completed with errors. Successfully updated ${successCount} out of ${matches.length} products.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl border border-[#EEEEEE] shadow-xl w-full max-w-3xl overflow-hidden animate-zoom-in flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEEEEE] shrink-0">
          <div className="flex items-center gap-2 text-[#13B734]">
            <FolderOpen className="h-5 w-5" />
            <h3 className="text-lg font-bold text-[#111111]">Bulk Image Upload</h3>
          </div>
          <button 
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-full hover:bg-[#F5F7FA] text-[#9BA5B4] hover:text-[#111111] transition-all disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#9BA5B4]">
              <Loader2 className="animate-spin h-8 w-8 text-[#13B734] mb-3" />
              <p>Loading product catalog...</p>
            </div>
          ) : (
            <>
              {/* Info Box */}
              <div className="bg-[#F0F3F9] rounded-xl p-4 text-sm text-[#111111]">
                <p>Select a folder containing your product images. The system will automatically map the images to your products if the image filename (without extension) matches the product's <strong>SKU</strong> or <strong>Name</strong>.</p>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-xs text-red-600 border border-red-100">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Folder Selection Area */}
              {matches.length === 0 && unmatched.length === 0 && !isProcessing && (
                <div 
                  className="border-2 border-dashed border-[#EEEEEE] rounded-2xl p-10 flex flex-col items-center justify-center bg-[#F5F7FA] hover:bg-[#F0F3F9] transition-colors cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="h-14 w-14 rounded-full bg-white shadow-sm flex items-center justify-center text-[#13B734] mb-4 group-hover:scale-105 transition-transform">
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-[#111111] mb-1">Select Image Folder</h4>
                  <p className="text-xs text-[#9BA5B4]">Only image files will be processed</p>
                  
                  {/* Note: TypeScript definitions for webkitdirectory are missing in standard React types, so we use a cast or ignore */}
                  {/* @ts-ignore */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    webkitdirectory="" 
                    directory="" 
                    multiple 
                    onChange={handleFolderSelect} 
                  />
                </div>
              )}

              {isProcessing && (
                <div className="flex flex-col items-center justify-center py-12 text-[#9BA5B4]">
                  <Loader2 className="animate-spin h-8 w-8 text-[#13B734] mb-3" />
                  <p>Processing images...</p>
                </div>
              )}

              {/* Results Area */}
              {(matches.length > 0 || unmatched.length > 0) && !isProcessing && (
                <div className="space-y-6">
                  {/* Matched Images */}
                  {matches.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-[#111111] mb-3 flex items-center gap-2">
                        <Check className="h-4 w-4 text-[#13B734]" /> 
                        Ready to Apply ({matches.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-1 border border-[#EEEEEE] rounded-xl bg-[#F5F7FA]">
                        {matches.map((m, i) => (
                          <div key={i} className="bg-white p-2 rounded-lg border border-[#EEEEEE] flex flex-col items-center text-center shadow-sm">
                            <img src={m.previewUrl} alt={m.file.name} className="h-16 w-16 object-cover rounded mb-2 border border-[#EEEEEE]" />
                            <p className="text-[10px] font-mono text-[#9BA5B4] truncate w-full" title={m.file.name}>{m.file.name}</p>
                            <p className="text-xs font-semibold text-[#111111] truncate w-full mt-1" title={m.product?.name}>{m.product?.name}</p>
                            <span className="text-[10px] text-[#13B734] bg-[#F0FBF3] px-1.5 py-0.5 rounded mt-1 truncate w-full">SKU: {m.product?.sku}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unmatched Images */}
                  {unmatched.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-[#111111] mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-[#9BA5B4]" /> 
                        Unmatched Images ({unmatched.length})
                      </h4>
                      <p className="text-xs text-[#9BA5B4] mb-3">These images didn't match any existing Product Name or SKU and will be ignored.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[200px] overflow-y-auto p-1">
                        {unmatched.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 border border-[#EEEEEE] rounded-lg opacity-70">
                            <img src={m.previewUrl} alt={m.file.name} className="h-10 w-10 object-cover rounded border border-[#EEEEEE]" />
                            <p className="text-xs font-mono text-[#9BA5B4] truncate flex-1" title={m.file.name}>{m.file.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#F5F7FA] border-t border-[#EEEEEE] shrink-0">
          <div className="flex-1 mr-4">
            {isUploading && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-[#9BA5B4]">
                  <span>Uploading images...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#EEEEEE] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#13B734] h-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setMatches([]);
                setUnmatched([]);
                setUploadError(null);
                setUploadProgress(0);
              }}
              disabled={isUploading || (matches.length === 0 && unmatched.length === 0)}
              className="px-4 py-2 border border-[#EEEEEE] bg-white text-sm font-semibold rounded-xl hover:bg-[#F5F7FA] text-[#111111] transition-all disabled:opacity-50"
            >
              Reset
            </button>
            <button
              onClick={handleUploadAndApply}
              disabled={isUploading || matches.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#13B734] text-white text-sm font-semibold rounded-xl hover:bg-[#109E2B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Applying...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  Upload & Apply ({matches.length})
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
