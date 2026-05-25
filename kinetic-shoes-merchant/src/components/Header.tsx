// src/components/Header.tsx
'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Bell } from 'lucide-react';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between px-8 bg-white border-b border-[#EEEEEE] select-none">
      <div className="flex items-center">
        <h2 className="text-xl font-bold text-[#111111] tracking-tight">Merchant Portal</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Icon */}
        <button className="relative p-2 text-[#9BA5B4] hover:text-[#111111] hover:bg-[#F5F7FA] rounded-full transition-all">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#13B734]" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-[#EEEEEE]" />

        {/* User Profile Badge */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0FBF3] text-[#13B734]">
              <User className="h-5 w-5" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-semibold text-[#111111] leading-none">Merchant</span>
              <span className="text-xs text-[#9BA5B4] mt-0.5">{user.email}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
