import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function ElectoralRoll() {
  const [constituency, setConstituency] = useState('New Delhi Central');
  const [constituencyList, setConstituencyList] = useState<string[]>([]);
  const [rollData, setRollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch constituencies
    fetch(`${API_BASE_URL}/api/auth/constituencies?city=New Delhi`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setConstituencyList(data);
        } else {
          setConstituencyList(['New Delhi Central', 'Mumbai South', 'Bangalore Central', 'Lucknow', 'Chennai North']);
        }
      })
      .catch(() => {
        setConstituencyList(['New Delhi Central', 'Mumbai South', 'Bangalore Central', 'Lucknow', 'Chennai North']);
      });

    loadRoll('New Delhi Central');
  }, []);

  const loadRoll = async (selectedConst: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/sir/roll?constituency=${encodeURIComponent(selectedConst)}`);
      if (!res.ok) throw new Error('Failed to load electoral roll');
      const data = await res.json();
      setRollData(data);
    } catch (err: any) {
      setError(err.message || 'Error loading roll');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open(`${API_BASE_URL}/api/sir/roll?constituency=${encodeURIComponent(constituency)}&format=csv`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Open Electoral Roll Publication</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Constituency Electoral Roll
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Official voter list under Special Intensive Revision (SIR) 2026.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadCsv}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Official CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs rounded-xl flex items-center space-x-2 transition-all hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print Roll</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Constituency:</span>
          <select
            value={constituency}
            onChange={(e) => {
              setConstituency(e.target.value);
              loadRoll(e.target.value);
            }}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {constituencyList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Showing {rollData.length} registered electors
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
          <span>Loading official electoral roll...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 text-xs rounded-xl border border-red-200">
          {error}
        </div>
      ) : rollData.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          No voters currently registered in this constituency.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <th className="p-3 w-16 text-center">Sr No</th>
                  <th className="p-3">EPIC Number</th>
                  <th className="p-3">Electors Name</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3">Part No</th>
                  <th className="p-3">Polling Station</th>
                  <th className="p-3">SIR Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-300">
                {rollData.map((row) => (
                  <tr key={row.epic_number} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                    <td className="p-3 font-mono text-center text-slate-400">#{row.serial_number}</td>
                    <td className="p-3 font-mono font-bold text-orange-600 dark:text-orange-400">{row.epic_number}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {row.name}
                      {row.is_senior_citizen ? (
                        <span className="ml-2 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 rounded text-[10px] font-bold">60+ Senior</span>
                      ) : null}
                    </td>
                    <td className="p-3 capitalize">{row.gender || 'N/A'}</td>
                    <td className="p-3 font-mono">{row.part_number}</td>
                    <td className="p-3 max-w-xs truncate">{row.polling_station}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-full text-[10px] font-bold">
                        {row.sir_status || 'VERIFIED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
