// src/components/ImportWizard.tsx
'use client';

import React, { useState, useRef } from 'react';
import api from '@/lib/api';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  ArrowRight, Loader2, Sparkles, RefreshCw, X, Table
} from 'lucide-react';

interface PreviewRow {
  rowNumber: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  brand: string;
  description: string;
}

interface RowError {
  row: number;
  sku?: string;
  name?: string;
  message: string;
}

export default function ImportWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filename, setFilename] = useState('');
  
  // Data parsed from server
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  
  // Import confirm states
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && isValidFileType(droppedFile)) {
      setFile(droppedFile);
      uploadAndValidate(droppedFile);
    } else {
      alert('Only CSV or Excel (.xlsx, .xls) files are supported.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      uploadAndValidate(selectedFile);
    }
  };

  const isValidFileType = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext === 'csv' || ext === 'xlsx' || ext === 'xls';
  };

  // Upload file to parse and validate
  const uploadAndValidate = async (selectedFile: File) => {
    setUploading(true);
    setGeneralError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setFilename(res.data.filename);
        setPreviewRows(res.data.previewRows || []);
        setErrors(res.data.errors || []);
        setStep(2);
      }
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.response?.data?.error || 'Failed to upload and parse the spreadsheet. Ensure columns map correctly.');
    } finally {
      setUploading(false);
    }
  };

  // Confirm import of valid rows
  const handleConfirmImport = async () => {
    setImporting(true);
    setGeneralError(null);

    // We can filter out the rows that have validation errors to prevent DB issues
    const errorRows = new Set(errors.map(e => e.row));
    const validProducts = previewRows.filter(r => !errorRows.has(r.rowNumber));

    if (validProducts.length === 0) {
      setGeneralError('No valid rows available to import. Please check validation errors.');
      setImporting(false);
      return;
    }

    try {
      const res = await api.post('/import/confirm', {
        filename,
        products: validProducts,
      });

      if (res.data.success) {
        setImportedCount(res.data.count);
        setStep(3);
      }
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.response?.data?.error || 'Failed to complete import process.');
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    setFile(null);
    setFilename('');
    setPreviewRows([]);
    setErrors([]);
    setImportedCount(0);
    setGeneralError(null);
    setStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const errorRowsCount = new Set(errors.map(e => e.row)).size;
  const validRowsCount = previewRows.length - errorRowsCount;

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      
      {/* Wizard Steps indicator */}
      <div className="flex items-center justify-center max-w-lg mx-auto select-none">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step >= 1 ? 'bg-[#13B734] text-white shadow-md shadow-[#13B734]/20' : 'bg-[#EEEEEE] text-[#9BA5B4]'
          }`}>1</div>
          <span className="text-xs font-bold text-[#111111]">Upload</span>
        </div>
        <div className={`flex-1 h-0.5 mx-4 transition-all ${step >= 2 ? 'bg-[#13B734]' : 'bg-[#EEEEEE]'}`} />
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step >= 2 ? 'bg-[#13B734] text-white shadow-md shadow-[#13B734]/20' : 'bg-[#EEEEEE] text-[#9BA5B4]'
          }`}>2</div>
          <span className="text-xs font-bold text-[#111111]">Validate</span>
        </div>
        <div className={`flex-1 h-0.5 mx-4 transition-all ${step >= 3 ? 'bg-[#13B734]' : 'bg-[#EEEEEE]'}`} />
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step === 3 ? 'bg-[#13B734] text-white shadow-md shadow-[#13B734]/20' : 'bg-[#EEEEEE] text-[#9BA5B4]'
          }`}>3</div>
          <span className="text-xs font-bold text-[#111111]">Success</span>
        </div>
      </div>

      {generalError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 max-w-xl mx-auto">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* STEP 1: File Upload */}
      {step === 1 && (
        <div className="max-w-xl mx-auto">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center text-center cursor-pointer transition-all duration-300 ${
              dragging 
                ? 'border-[#13B734] bg-[#F0FBF3]/40' 
                : 'border-[#EEEEEE] bg-white hover:border-[#13B734]/40 hover:bg-[#F0FBF3]/10'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, .xlsx, .xls"
              className="hidden"
            />
            {uploading ? (
              <div className="space-y-4">
                <Loader2 className="animate-spin h-10 w-10 text-[#13B734] mx-auto" />
                <p className="text-sm font-semibold text-[#111111]">Uploading & parsing sheet...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-[#F0FBF3] text-[#13B734] flex items-center justify-center mx-auto">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#111111]">Drag and drop your spreadsheet here</p>
                  <p className="text-xs text-[#9BA5B4] mt-1">Accepts CSV, XLSX or XLS formats</p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 border border-[#EEEEEE] bg-white text-xs font-bold rounded-xl text-[#111111] hover:bg-[#F5F7FA] transition-all"
                >
                  Select File
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Validation */}
      {step === 2 && (
        <div className="space-y-8 animate-fade-in">
          {/* File Summary Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EEEEEE] shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-[#F0FBF3] text-[#13B734] flex items-center justify-center rounded-xl">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-[#111111]">{file?.name}</p>
                <p className="text-xs text-[#9BA5B4]">Total rows detected: {previewRows.length}</p>
              </div>
            </div>

            {/* Validation Badges */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F0FBF3] text-[#13B734] rounded-full">
                <CheckCircle2 className="h-4 w-4" />
                {validRowsCount} Valid Rows
              </div>
              {errorRowsCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full">
                  <AlertTriangle className="h-4 w-4" />
                  {errorRowsCount} Rows with Errors
                </div>
              )}
            </div>
          </div>

          {/* Validation Logs (Show only if there are errors) */}
          {errors.length > 0 && (
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-sm font-bold">Sheet Validation Errors Log</h3>
              </div>
              <p className="text-xs text-[#9BA5B4]">We detected issues in the following rows. These rows will be skipped during confirmation.</p>
              
              <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-2">
                {errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs bg-white border border-red-50 p-2.5 rounded-lg text-left">
                    <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Row {err.row}</span>
                    {err.sku && <span className="font-mono text-[#9BA5B4]">SKU: {err.sku}</span>}
                    <span className="text-[#111111]">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Sheet Data */}
          <div className="bg-white border border-[#EEEEEE] rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-[#F5F7FA] px-6 py-4 border-b border-[#EEEEEE] flex items-center gap-2 text-left">
              <Table className="h-4 w-4 text-[#9BA5B4]" />
              <h3 className="text-xs font-bold text-[#9BA5B4] uppercase tracking-wider">Sheet Rows Preview</h3>
            </div>
            
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F7FA]/50 border-b border-[#EEEEEE] text-xs font-semibold text-[#9BA5B4]">
                    <th className="px-6 py-3 w-16 text-center">Row</th>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3 text-right">Price</th>
                    <th className="px-6 py-3 text-right">Stock</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEE] text-sm">
                  {previewRows.map((row) => {
                    const hasError = errors.some(e => e.row === row.rowNumber);
                    return (
                      <tr key={row.rowNumber} className={`hover:bg-[#F5F7FA]/40 transition-colors ${hasError ? 'bg-red-50/20' : ''}`}>
                        <td className="px-6 py-3 text-center font-bold text-[#9BA5B4]">{row.rowNumber}</td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#111111]">{row.name || '—'}</span>
                            <span className="text-xs text-[#9BA5B4] mt-0.5">{row.brand || 'No Brand'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-[#9BA5B4]">{row.sku || '—'}</td>
                        <td className="px-6 py-3">
                          {row.category ? (
                            <span className="px-2 py-0.5 rounded bg-[#F0FBF3] text-[#13B734] text-xs font-medium">
                              {row.category}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-3 font-semibold text-[#111111] text-right">
                          {row.price !== undefined ? `$${Number(row.price).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-6 py-3 font-semibold text-[#111111] text-right">
                          {row.stock !== undefined ? row.stock : '—'}
                        </td>
                        <td className="px-6 py-3">
                          {hasError ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                              <AlertTriangle className="h-3 w-3" /> Skip
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#13B734]">
                              <CheckCircle2 className="h-3 w-3" /> Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirm Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-[#EEEEEE]">
            <button
              onClick={resetWizard}
              className="flex items-center gap-2 px-5 py-2.5 border border-[#EEEEEE] bg-white text-sm font-semibold rounded-xl hover:bg-[#F5F7FA] text-[#111111] transition-all"
            >
              <X className="h-4 w-4" />
              Cancel Upload
            </button>

            <button
              onClick={handleConfirmImport}
              disabled={importing || validRowsCount === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#13B734] text-white text-sm font-semibold rounded-xl hover:bg-[#109E2B] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#13B734]/15"
            >
              {importing ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Importing stock...
                </>
              ) : (
                <>
                  Confirm Import ({validRowsCount} items)
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Success Screen */}
      {step === 3 && (
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-[#EEEEEE] shadow-sm text-center space-y-6 animate-zoom-in">
          <div className="h-16 w-16 rounded-full bg-[#F0FBF3] text-[#13B734] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#111111]">Import Completed!</h2>
            <p className="text-sm text-[#9BA5B4]">
              We successfully synced <span className="font-bold text-[#13B734]">{importedCount}</span> products into your store stock database.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
            <button
              onClick={resetWizard}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 border border-[#EEEEEE] bg-white text-sm font-semibold rounded-xl hover:bg-[#F5F7FA] text-[#111111] transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Upload Another
            </button>

            <a
              href="/dashboard/products"
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all"
            >
              View Products
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
