// src/components/HistoryView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  History, Calendar, FileSpreadsheet, CheckCircle2, 
  XCircle, AlertTriangle, AlertCircle, Eye, X, Loader2
} from 'lucide-react';

interface ImportLog {
  id: number;
  filename: string;
  status: 'success' | 'failed' | 'partial';
  totalRows: number;
  importedCount: number;
  failedCount: number;
  errors: string | null; // JSON string of row errors
  createdAt: string;
}

interface RowErrorDetail {
  sku?: string;
  message: string;
}

export default function HistoryView() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state for viewing details
  const [selectedLog, setSelectedLog] = useState<ImportLog | null>(null);
  const [selectedErrors, setSelectedErrors] = useState<RowErrorDetail[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/import/history');
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load import logs history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleViewErrors = (log: ImportLog) => {
    setSelectedLog(log);
    try {
      const parsedErrors = log.errors ? JSON.parse(log.errors) : [];
      setSelectedErrors(parsedErrors);
    } catch (e) {
      setSelectedErrors([]);
    }
    setShowErrorModal(true);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Logs Table / List */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-[#EEEEEE] text-[#9BA5B4]">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">File & Date</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Total Rows</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Imported</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Failed</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEEE] text-sm text-[#111111]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-[#9BA5B4]">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin h-7 w-7 text-[#13B734]" />
                      <span className="text-sm">Fetching audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-[#9BA5B4]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-[#F5F7FA] flex items-center justify-center text-[#9BA5B4]">
                        <History className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">No import records found</p>
                      <p className="text-xs">Your spreadsheet upload logs will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-[#F5F7FA]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-[#F5F7FA] text-[#9BA5B4] flex items-center justify-center rounded-xl">
                            <FileSpreadsheet className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-slate-800 break-all">{log.filename.replace(/^\d+-/, '')}</span>
                            <span className="text-xs text-[#9BA5B4] mt-1 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(log.createdAt)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.status === 'success' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F0FBF3] text-[#13B734] text-xs font-semibold rounded-full">
                            <CheckCircle2 className="h-4 w-4" />
                            Success
                          </span>
                        )}
                        {log.status === 'partial' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full">
                            <AlertTriangle className="h-4 w-4" />
                            Partial
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full">
                            <XCircle className="h-4 w-4" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-medium">{log.totalRows}</td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-[#13B734]">{log.importedCount}</td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-red-500">{log.failedCount}</td>
                      <td className="px-6 py-4 text-center">
                        {log.failedCount > 0 ? (
                          <button
                            onClick={() => handleViewErrors(log)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#EEEEEE] text-[#111111] hover:border-[#13B734] hover:text-[#13B734] hover:bg-[#F0FBF3]/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Failures
                          </button>
                        ) : (
                          <span className="text-xs text-[#9BA5B4]">Clean Sync</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Details Modal Box */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
          <div className="bg-white rounded-2xl border border-[#EEEEEE] shadow-xl w-full max-w-lg overflow-hidden animate-zoom-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEEEEE]">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-lg font-bold text-[#111111]">
                  Import Failure Log Details
                </h3>
              </div>
              <button 
                onClick={() => setShowErrorModal(false)}
                className="p-1.5 rounded-full hover:bg-[#F5F7FA] text-[#9BA5B4] hover:text-[#111111] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Error List */}
            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              <div className="text-left text-xs text-[#9BA5B4] mb-2">
                Showing the database constraints or file errors hit during import confirmation.
              </div>
              
              <div className="space-y-2">
                {selectedErrors.length === 0 ? (
                  <p className="text-sm text-[#9BA5B4] text-center py-4">No error details available.</p>
                ) : (
                  selectedErrors.map((err, i) => (
                    <div key={i} className="p-3 border border-red-50 rounded-xl bg-red-50/20 text-left text-xs space-y-1">
                      {err.sku && (
                        <div className="font-semibold text-slate-800">
                          SKU Code: <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{err.sku}</span>
                        </div>
                      )}
                      <div className="text-red-500 font-medium">Reason: {err.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-4 bg-[#F5F7FA] border-t border-[#EEEEEE]">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
