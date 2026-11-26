import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Bot, RefreshCw, Volume2, ShieldCheck, Scale } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { API_BASE_URL } from '../api';

interface CandidateComparisonModalProps {
  candidates: any[];
  onClose: () => void;
}

export default function CandidateComparisonModal({ candidates, onClose }: CandidateComparisonModalProps) {
  const { i18n } = useTranslation();
  const { speakText } = useAccessibility();

  const [question, setQuestion] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompareQuestion = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/compare-candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: candidates.map((c) => c.id),
          question: question.trim(),
          language: i18n.language
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.comparison);
      }
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-orange-600 to-orange-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Side-by-Side Candidate Comparison</h2>
              <p className="text-xs text-orange-100">ECI Neutral Evaluation & Sworn Affidavit Ledger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 text-xs font-semibold uppercase tracking-wider text-slate-400 w-1/4">Criteria</th>
                  {candidates.map((c) => (
                    <th key={c.id} className="p-3 text-sm font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-2">
                        <span className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs">
                          {c.party_symbol ? c.party_symbol.substring(0, 3) : 'IND'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                          <p className="text-xs text-slate-500 font-normal">{c.party_name}</p>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Constituency</td>
                  {candidates.map((c) => (
                    <td key={c.id} className="p-3 font-medium">{c.constituency}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Age & Occupation</td>
                  {candidates.map((c) => (
                    <td key={c.id} className="p-3">{c.age ? `${c.age} yrs · ` : ''}{c.occupation || 'Public Service'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Education</td>
                  {candidates.map((c) => (
                    <td key={c.id} className="p-3 font-medium">{c.education || 'Declared in affidavit'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Declared Assets</td>
                  {candidates.map((c) => (
                    <td key={c.id} className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {c.assets_declared || 'Under Verification'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-500 dark:text-slate-400">Criminal Cases</td>
                  {candidates.map((c) => (
                    <td key={c.id} className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        c.criminal_cases === 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                      }`}>
                        {c.criminal_cases === 0 ? '0 Cases Declared' : `${c.criminal_cases} Active Case(s)`}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-500 dark:text-slate-400 align-top">Manifesto Pledges</td>
                  {candidates.map((c) => {
                    const promises = Array.isArray(c.manifesto_json)
                      ? c.manifesto_json
                      : typeof c.manifesto_json === 'string'
                      ? JSON.parse(c.manifesto_json || '[]')
                      : [];
                    return (
                      <td key={c.id} className="p-3 align-top">
                        <ul className="space-y-1.5 list-disc list-inside">
                          {promises.map((p: string, idx: number) => (
                            <li key={idx} className="text-slate-600 dark:text-slate-300">{p}</li>
                          ))}
                        </ul>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* AI Analysis Box */}
          {aiAnalysis && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-2xl border border-orange-200 dark:border-orange-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <h4 className="font-bold text-sm text-orange-900 dark:text-orange-200">Neutral Comparative Analysis</h4>
                </div>
                <button
                  onClick={() => speakText(aiAnalysis, i18n.language)}
                  className="flex items-center space-x-1 text-xs text-orange-700 dark:text-orange-300 hover:text-orange-900 p-1"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Listen</span>
                </button>
              </div>
              <p className="text-xs text-orange-900 dark:text-orange-100 whitespace-pre-wrap leading-relaxed">
                {aiAnalysis}
              </p>
            </div>
          )}
        </div>

        {/* AI Neutral Question Input */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCompareQuestion()}
              placeholder="Ask AI to compare specific policy areas (e.g., healthcare, jobs, green energy)..."
              className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleCompareQuestion}
              disabled={!question.trim() || loading}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Analyze</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
