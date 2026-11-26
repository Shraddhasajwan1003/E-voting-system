import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Search,
  Scale,
  Volume2,
  VolumeX,
  ShieldCheck,
  AlertTriangle,
  GraduationCap,
  Briefcase,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import CandidateComparisonModal from '../components/CandidateComparisonModal';
import { API_BASE_URL } from '../api';

export default function CandidatesDirectory() {
  const { t, i18n } = useTranslation();
  const { speakText, isSpeaking, stopSpeaking } = useAccessibility();

  const [candidates, setCandidates] = useState<any[]>([]);
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>('1');
  const [search, setSearch] = useState('');
  const [constituencyFilter, setConstituencyFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Expanded manifestos
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Comparison State
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  useEffect(() => {
    // Fetch elections
    fetch(`${API_BASE_URL}/api/elections`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setElections(data);
          setSelectedElectionId(String(data[0].id));
        }
      })
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    if (selectedElectionId) {
      loadCandidates();
    }
  }, [selectedElectionId, constituencyFilter]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/elections/${selectedElectionId}/candidates?`;
      if (constituencyFilter) url += `constituency=${encodeURIComponent(constituencyFilter)}&`;
      if (search) url += `search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      if (res.ok) {
        setCandidates(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCandidates();
  };

  const toggleSelectCandidate = (id: number) => {
    if (selectedCandidateIds.includes(id)) {
      setSelectedCandidateIds(selectedCandidateIds.filter((cid) => cid !== id));
    } else {
      if (selectedCandidateIds.length >= 3) {
        alert('You can compare at most 3 candidates simultaneously.');
        return;
      }
      setSelectedCandidateIds([...selectedCandidateIds, id]);
    }
  };

  const handleReadCandidate = (c: any) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const promises = Array.isArray(c.manifesto_json) ? c.manifesto_json.join('. ') : '';
      const text = `${c.name}, contesting from ${c.party_name}. Education: ${c.education || 'Declared'}. Assets declared: ${c.assets_declared || 'Under disclosure'}. Key promises: ${promises}`;
      speakText(text, i18n.language);
    }
  };

  const candidatesForComparison = candidates.filter((c) => selectedCandidateIds.includes(c.id));

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-full text-xs font-bold mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Public Candidate Affidavits & Manifestos</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Contesting Candidates Directory
          </h1>
          <p className="text-sm text-slate-500">
            Neutral, transparent scrutiny of candidates, educational qualifications, assets disclosures, and policy promises.
          </p>
        </div>

        {selectedCandidateIds.length > 0 && (
          <button
            onClick={() => setShowComparisonModal(true)}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all self-start md:self-auto"
          >
            <Scale className="w-4 h-4" />
            <span>Compare Selected ({selectedCandidateIds.length})</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate name or party..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <select
            value={constituencyFilter}
            onChange={(e) => setConstituencyFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
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

      {/* Candidate Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
          <span>Loading verified candidates...</span>
        </div>
      ) : candidates.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-white dark:bg-slate-800 rounded-2xl border">
          No candidates found matching the criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {candidates.map((c) => {
            const isSelected = selectedCandidateIds.includes(c.id);
            const isExpanded = expandedId === c.id;
            const promises = Array.isArray(c.manifesto_json)
              ? c.manifesto_json
              : typeof c.manifesto_json === 'string'
              ? JSON.parse(c.manifesto_json || '[]')
              : [];

            return (
              <div
                key={c.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 shadow-xs ${
                  isSelected
                    ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-orange-600 dark:text-orange-400 text-base shadow-inner">
                        {c.party_symbol ? c.party_symbol.substring(0, 3) : 'IND'}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                          {c.name}
                        </h3>
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                          {c.party_name}
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectCandidate(c.id)}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mt-1 cursor-pointer"
                      title="Select to compare"
                    />
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{c.education || 'Affidavit filed'}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {c.assets_declared || 'Declared'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{c.occupation || 'Public Service'}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.criminal_cases === 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                      }`}>
                        {c.criminal_cases === 0 ? '0 Cases' : `${c.criminal_cases} Criminal Case(s)`}
                      </span>
                    </div>
                  </div>

                  {/* Bio */}
                  {c.bio && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {c.bio}
                    </p>
                  )}

                  {/* Manifesto Accordion */}
                  {promises.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-orange-600 py-1"
                      >
                        <span>Policy Manifesto ({promises.length} Pledges)</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl animate-in fade-in duration-150">
                          {promises.map((p: string, idx: number) => (
                            <li key={idx} className="leading-snug">{p}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <button
                    onClick={() => handleReadCandidate(c)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-orange-500" />
                    <span>Read Aloud</span>
                  </button>

                  <button
                    onClick={() => toggleSelectCandidate(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Compare'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison Modal */}
      {showComparisonModal && candidatesForComparison.length > 0 && (
        <CandidateComparisonModal
          candidates={candidatesForComparison}
          onClose={() => setShowComparisonModal(false)}
        />
      )}
    </div>
  );
}
