import React, { useState, useEffect } from 'react';
import { History, Trophy, Award, TrendingUp, Filter, RefreshCw, Calendar, MapPin } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function ElectionHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [constituency, setConstituency] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [selectedYear, constituency]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/elections/history?`;
      if (selectedYear) url += `year=${selectedYear}&`;
      if (constituency) url += `constituency=${encodeURIComponent(constituency)}&`;

      const res = await fetch(url);
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 rounded-full text-xs font-bold mb-1">
          <History className="w-3.5 h-3.5" />
          <span>General Parliamentary Historical Archive</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Constituency Election History & Turnout Archive
        </h1>
        <p className="text-sm text-slate-500">
          Multi-cycle parliamentary election archives (2014–2024) highlighting victory margins and civic issues.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="">All Election Cycles</option>
            <option value="2024">2024 (18th Lok Sabha)</option>
            <option value="2019">2019 (17th Lok Sabha)</option>
            <option value="2014">2014 (16th Lok Sabha)</option>
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Constituency:</span>
          <select
            value={constituency}
            onChange={(e) => setConstituency(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="">All Constituencies</option>
            <option value="New Delhi Central">New Delhi Central</option>
            <option value="Mumbai South">Mumbai South</option>
            <option value="Bangalore Central">Bangalore Central</option>
            <option value="Lucknow">Lucknow</option>
            <option value="Chennai North">Chennai North</option>
          </select>
        </div>
      </div>

      {/* History Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
          <span>Loading historical archives...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-white dark:bg-slate-800 rounded-2xl border">
          No historical records found for this selection.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {history.map((record) => {
            const margin = record.winner_votes - record.runner_up_votes;
            return (
              <div
                key={record.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      {record.year} · {record.election_title}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {record.constituency}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Voter Turnout</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {record.turnout_percent}%
                    </span>
                  </div>
                </div>

                {/* Winner & Runner Up Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Winner */}
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                    <div className="flex items-center space-x-1 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Winner</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">{record.winner_name}</p>
                    <p className="text-[11px] text-slate-500">{record.winner_party}</p>
                    <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400 pt-1">
                      {record.winner_votes.toLocaleString()} votes
                    </p>
                  </div>

                  {/* Runner Up */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 block">Runner Up</span>
                    <p className="font-bold text-slate-900 dark:text-white">{record.runner_up_name}</p>
                    <p className="text-[11px] text-slate-500">{record.runner_up_party}</p>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-300 pt-1">
                      {record.runner_up_votes.toLocaleString()} votes
                    </p>
                  </div>
                </div>

                {/* Margin Strip */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Winning Margin:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    +{margin.toLocaleString()} votes
                  </span>
                </div>

                {/* Key Issues */}
                {record.key_issues && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Key Constituency Issues</span>
                    <p>{record.key_issues}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
