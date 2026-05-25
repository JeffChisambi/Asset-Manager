// src/app/dashboard/products/page.tsx
'use client';

import React from 'react';
import ProductTable from '@/components/ProductTable';

export default function ProductsPage() {
  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col text-left">
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Footwear Inventory</h1>
        <p className="text-sm text-[#9BA5B4]">Inspect, create, edit, or delete items within your store catalog.</p>
      </div>

      <ProductTable />
    </div>
  );
}
