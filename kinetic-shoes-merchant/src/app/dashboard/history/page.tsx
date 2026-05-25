// src/app/dashboard/history/page.tsx
'use client';

import React from 'react';
import HistoryView from '@/components/HistoryView';

export default function HistoryPage() {
  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col text-left">
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Audit Trail Logs</h1>
        <p className="text-sm text-[#9BA5B4]">Inspect chronological results, counts, and failure details of spreadsheet imports.</p>
      </div>

      <HistoryView />
    </div>
  );
}
