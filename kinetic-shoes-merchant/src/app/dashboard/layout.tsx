// src/app/dashboard/layout.tsx
'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F5F7FA]">
        {/* Sidebar Nav */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header />

          {/* Main scrollable body */}
          <main className="flex-1 overflow-y-auto px-8 py-8 focus:outline-none">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
