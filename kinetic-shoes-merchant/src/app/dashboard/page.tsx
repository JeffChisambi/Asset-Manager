// src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { ShoppingBag, ArrowUpRight, Upload, History, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface SummaryStats {
  totalProducts: number;
  outOfStock: number;
  lastImportStatus: string | null;
  lastImportFilename: string | null;
  storeName: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<SummaryStats>({
    totalProducts: 0,
    outOfStock: 0,
    lastImportStatus: null,
    lastImportFilename: null,
    storeName: 'Loading Store...',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        // Fetch store info
        const storeRes = await api.get('/store');
        const storeName = storeRes.data?.name || 'My Store';

        // Fetch products list
        const prodRes = await api.get('/products');
        const products = Array.isArray(prodRes.data) ? prodRes.data : [];
        const totalProducts = products.length;
        const outOfStock = products.filter((p: any) => p.stock <= 0).length;

        // Fetch latest import log
        let lastImportStatus = null;
        let lastImportFilename = null;
        try {
          const logsRes = await api.get('/import/history');
          if (Array.isArray(logsRes.data) && logsRes.data.length > 0) {
            lastImportStatus = logsRes.data[0].status;
            lastImportFilename = logsRes.data[0].filename;
          }
        } catch (e) {
          console.warn('Could not fetch logs', e);
        }

        setStats({
          totalProducts,
          outOfStock,
          lastImportStatus,
          lastImportFilename,
          storeName,
        });
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-[#13B734]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-white">
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#13B734]/20 px-3 py-1 text-xs font-semibold text-[#13B734]">
            Store Live
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back to {stats.storeName}!
          </h1>
          <p className="max-w-md text-slate-400 text-sm">
            Manage your footwear inventory, import raw product sheets, and sync with the Doorstep mobile storefront.
          </p>
        </div>
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-[#13B734]/10 blur-3xl pointer-events-none" />
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEEEE] flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#9BA5B4]">Total Products</span>
            <div className="h-10 w-10 rounded-xl bg-[#F0FBF3] text-[#13B734] flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-[#111111]">{stats.totalProducts}</h3>
            <p className="text-xs text-[#9BA5B4] mt-1">Items in catalog</p>
          </div>
        </div>

        {/* Stock Alert */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEEEE] flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#9BA5B4]">Out of Stock</span>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stats.outOfStock > 0 ? 'bg-red-50 text-red-500' : 'bg-[#F0FBF3] text-[#13B734]'}`}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-[#111111]">{stats.outOfStock}</h3>
            <p className="text-xs text-[#9BA5B4] mt-1">Requires re-stocking</p>
          </div>
        </div>

        {/* Latest Import */}
        <div className="bg-white p-6 rounded-2xl border border-[#EEEEEE] flex flex-col justify-between hover:shadow-md transition-all duration-300 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#9BA5B4]">Latest Import Run</span>
            {stats.lastImportStatus === 'success' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#13B734] bg-[#F0FBF3] px-2.5 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Success
              </span>
            ) : stats.lastImportStatus ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                <XCircle className="h-3 w-3" /> Failed
              </span>
            ) : (
              <span className="text-xs text-[#9BA5B4]">No runs found</span>
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-[#111111] truncate">
              {stats.lastImportFilename || 'No imports yet'}
            </h3>
            <p className="text-xs text-[#9BA5B4] mt-1">
              {stats.lastImportStatus ? 'Check import history for details' : 'Go to Import Wizard to upload products'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action / Launchpad */}
      <div className="bg-white p-8 rounded-2xl border border-[#EEEEEE] space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#111111] tracking-tight">Launchpad Operations</h2>
          <p className="text-sm text-[#9BA5B4] mt-1">Instant actions to control your merchant stock operations.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dashboard/import"
            className="flex items-center justify-between p-4 rounded-xl border border-[#EEEEEE] hover:border-[#13B734]/30 hover:bg-[#F0FBF3]/20 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#F0FBF3] text-[#13B734] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#111111]">Import Sheet Wizard</p>
                <p className="text-xs text-[#9BA5B4]">Upload CSV or Excel templates</p>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-[#9BA5B4] group-hover:text-[#13B734] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </Link>

          <Link
            href="/dashboard/history"
            className="flex items-center justify-between p-4 rounded-xl border border-[#EEEEEE] hover:border-[#13B734]/30 hover:bg-[#F0FBF3]/20 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#F0FBF3] text-[#13B734] flex items-center justify-center group-hover:scale-105 transition-transform">
                <History className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#111111]">Audit Trail History</p>
                <p className="text-xs text-[#9BA5B4]">Inspect import results & row logs</p>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-[#9BA5B4] group-hover:text-[#13B734] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}
