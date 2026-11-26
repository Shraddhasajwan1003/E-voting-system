import React, { useState } from 'react';
import { Search, MapPin, CheckCircle, AlertCircle, RefreshCw, User, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function VoterSearch() {
  const [searchMode, setSearchMode] = useState<'epic' | 'details'>('epic');
  const [epicNumber, setEpicNumber] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [constituency, setConstituency] = useState('');

  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      let url = `${API_BASE_URL}/api/sir/search?`;
      if (searchMode === 'epic') {
        if (!epicNumber.trim()) {
          setError('Please enter an EPIC number');
          setLoading(false);
          return;
        }
        url += `epic_number=${encodeURIComponent(epicNumber.trim())}`;
      } else {
        if (!name.trim()) {
          setError('Please enter voter name');
          setLoading(false);
          return;
        }
        url += `name=${encodeURIComponent(name.trim())}`;
        if (state) url += `&state=${encodeURIComponent(state.trim())}`;
        if (city) url += `&city=${encodeURIComponent(city.trim())}`;
        if (constituency) url += `&constituency=${encodeURIComponent(constituency.trim())}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to search voter roll');
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-bold">
          <Search className="w-3.5 h-3.5" />
          <span>Official Electoral Roll Verification</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Search Your Name in Electoral Roll
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Verify your voter registration, serial number in the roll, designated polling booth, and SIR 2026 status.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center">
        <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex space-x-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            onClick={() => setSearchMode('epic')}
            className={`px-6 py-2 rounded-lg transition-all ${
              searchMode === 'epic'
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Search by EPIC Number
          </button>
          <button
            onClick={() => setSearchMode('details')}
            className={`px-6 py-2 rounded-lg transition-all ${
              searchMode === 'details'
                ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Search by Personal Details
          </button>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          {searchMode === 'epic' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Voter ID / EPIC Number
              </label>
              <input
                type="text"
                value={epicNumber}
                onChange={(e) => setEpicNumber(e.target.value)}
                placeholder="e.g. IND7281942"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none dark:text-white"
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name (As per Aadhaar/Roll)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Constituency (Optional)
                </label>
                <input
                  type="text"
                  value={constituency}
                  onChange={(e) => setConstituency(e.target.value)}
                  placeholder="e.g. New Delhi Central"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  City (Optional)
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. New Delhi"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  State (Optional)
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Delhi"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching Roll...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search Roll</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Search Results ({results.length})
            </h2>
            <span className="text-xs text-slate-500">Public Electoral Roll Extract</span>
          </div>

          {results.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No matching voter record found
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                If your name is missing, you can register as a new voter using <strong>Form 6</strong> or check with your Booth Level Officer.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((voter, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3 shadow-xs hover:border-orange-500 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">{voter.name}</h3>
                      <p className="text-xs font-mono text-orange-600 dark:text-orange-400 font-bold mt-0.5">
                        EPIC: {voter.epic_number}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold rounded-full">
                      {voter.sir_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Constituency</span>
                      <span className="font-semibold">{voter.constituency}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Part / Serial</span>
                      <span className="font-mono">{voter.part_number} · #{voter.serial_number}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Polling Station</span>
                    <p className="truncate font-medium">{voter.polling_station}</p>
                  </div>

                  {voter.has_priority_pass && (
                    <div className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 rounded-lg text-[11px] font-semibold flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>Senior / Accessibility Priority Pass Active</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
