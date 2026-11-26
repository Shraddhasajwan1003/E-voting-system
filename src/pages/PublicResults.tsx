import React, { useState, useEffect } from 'react';
import { Award, BarChart3, Download, Lock, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function PublicResults() {
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>('1');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/elections`)
      .then((r) => r.json())
      .then((elList) => {
        if (Array.isArray(elList) && elList.length > 0) {
          setElections(elList);
          setSelectedElectionId(String(elList[0].id));
        }
      })
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    if (selectedElectionId) {
      loadResults();
    }
  }, [selectedElectionId]);

  const loadResults = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/elections/results/${selectedElectionId}`);
      const resData = await res.json();
      if (!res.ok) {
        if (res.status === 403 && resData.locked) {
          setData({ locked: true, message: resData.message });
          return;
        }
        throw new Error(resData.error || 'Failed to load results');
      }
      setData(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const results = data?.results || [];
  const totalVotes = data?.total_votes || 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Official Constituency Tabulation</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Official Election Results & Vote Shares
          </h1>
          <p className="text-sm text-slate-500">
            Certified candidate vote tally and electoral turnout verified by the Election Commission.
          </p>
        </div>

        {elections.length > 0 && (
          <select
            value={selectedElectionId}
            onChange={(e) => setSelectedElectionId(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            {elections.map((el) => (
              <option key={el.id} value={el.id}>
                {el.title} ({el.status})
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
          <span>Loading official results...</span>
        </div>
      ) : data?.locked ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-slate-200 dark:border-slate-700 text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Results Under Official Embargo
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {data.message || 'Results have not been officially published yet by the Returning Officer.'}
          </p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
          {error}
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-white dark:bg-slate-800 rounded-2xl border">
          No votes tallied yet for this election.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Votes Cast</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">
                {data.total_votes?.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Verified Participations</span>
              <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
                {data.total_voters_participated?.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Leading Candidate</span>
              <p className="text-base font-bold text-slate-900 dark:text-white truncate mt-1">
                {results[0]?.name || 'N/A'}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Certification</span>
              <p className="text-xs font-bold text-emerald-600 flex items-center space-x-1 mt-2">
                <CheckCircle className="w-4 h-4" />
                <span>ECI Certified</span>
              </p>
            </div>
          </div>

          {/* Candidate Results Table & Bars */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Vote Share Breakdown
            </h3>

            <div className="space-y-4">
              {results.map((c: any, idx: number) => {
                const votes = c.votes || 0;
                const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0';
                const isLeading = idx === 0 && votes > 0;

                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        {isLeading && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-extrabold text-[10px] rounded-md">
                            LEADING
                          </span>
                        )}
                        <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                        <span className="text-slate-400">({c.party_name})</span>
                      </div>
                      <div className="flex items-center space-x-3 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">{votes.toLocaleString()} votes</span>
                        <span className="text-slate-500 font-semibold w-12 text-right">{percentage}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          c.is_nota
                            ? 'bg-slate-400'
                            : isLeading
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                            : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.max(Number(percentage), 1)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
