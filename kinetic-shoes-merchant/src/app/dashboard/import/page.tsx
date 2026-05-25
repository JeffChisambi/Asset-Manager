// src/app/dashboard/import/page.tsx
'use client';

import React from 'react';
import ImportWizard from '@/components/ImportWizard';

export default function ImportPage() {
  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col text-left">
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Spreadsheet Import Wizard</h1>
        <p className="text-sm text-[#9BA5B4]">Bulk upload stock items using a spreadsheet CSV, XLSX, or XLS template.</p>
      </div>

      <ImportWizard />
    </div>
  );
}
