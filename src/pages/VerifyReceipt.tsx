import React, { useState } from 'react';
import { ShieldCheck, Search, CheckCircle, AlertCircle, RefreshCw, Lock, Hash, Calendar, MapPin } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function VerifyReceipt() {
  const [receiptCode, setReceiptCode] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptCode.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/elections/verify-receipt/${encodeURIComponent(receiptCode.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Receipt code not found');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 rounded-full text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verifiable Secret-Ballot Audit Protocol</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Verify Official VVPAT Ballot Receipt
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Cryptographically verify that your vote was tallied in the official constituency ledger without compromising your secret ballot choice.
        </p>
      </div>

      {/* Input Box */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              VVPAT Receipt Code
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={receiptCode}
                onChange={(e) => setReceiptCode(e.target.value)}
                placeholder="e.g. VVPAT-A8B2-9F1C"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none dark:text-white"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Verify Cryptographic Receipt</span>
          </button>
        </form>
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-emerald-500/40 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center space-x-3 text-emerald-600">
            <CheckCircle className="w-8 h-8 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Ballot Cryptographically Verified in Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Official ECI Voter Verifiable Paper Audit Trail (VVPAT) Certification
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Receipt Code</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{result.vvpat_receipt_code}</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Election Cycle</span>
              <span className="font-bold text-slate-900 dark:text-white">{result.election_title}</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Constituency</span>
              <span className="font-bold text-slate-900 dark:text-white">{result.constituency}</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Timestamp Recorded</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                {new Date(result.voted_at).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-4 bg-teal-50 dark:bg-teal-950/20 rounded-2xl border border-teal-200 dark:border-teal-800/40 flex items-start space-x-3 text-xs text-teal-900 dark:text-teal-200">
            <Lock className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Ballot Secrecy Guarantee:</strong> By constitutional design, this verification confirms that an authentic ballot from your booth was tallied in the constituency ledger without revealing which candidate you selected.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
