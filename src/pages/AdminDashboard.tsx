import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Vote,
  FileText,
  Download,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  Bot,
  Calendar,
  PhoneCall,
  Bell,
  Lock,
  Unlock,
  HeartHandshake
} from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'elections' | 'candidates' | 'voters' | 'sir_queue' | 'complaints' | 'announcements_audit'
  >('overview');

  const [stats, setStats] = useState<any | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [elections, setElections] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [voters, setVoters] = useState<any[]>([]);
  const [sirRequests, setSirRequests] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [bloOfficers, setBloOfficers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  // Candidate Form Modal
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);
  const [candName, setCandName] = useState('');
  const [candParty, setCandParty] = useState('');
  const [candSymbol, setCandSymbol] = useState('');
  const [candConstituency, setCandConstituency] = useState('New Delhi Central');
  const [candAge, setCandAge] = useState('');
  const [candEducation, setCandEducation] = useState('');
  const [candAssets, setCandAssets] = useState('');
  const [candCases, setCandCases] = useState('0');
  const [candBio, setCandBio] = useState('');
  const [candManifesto, setCandManifesto] = useState('');

  // Complaint Reply State
  const [replyingComplaintId, setReplyingComplaintId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  // Announcement Form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('NOTICE');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchAdminData();
  }, [user, navigate, token]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [
        statsRes,
        resultsRes,
        electionsRes,
        candidatesRes,
        votersRes,
        sirRes,
        complaintsRes,
        blosRes,
        annRes,
        auditRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/stats`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/results`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/elections`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/candidates`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/voters`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/sir-requests`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/complaints`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/blo-officers`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/announcements`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/audit-logs`, { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (resultsRes.ok) setResults(await resultsRes.json());
      if (electionsRes.ok) setElections(await electionsRes.json());
      if (candidatesRes.ok) setCandidates(await candidatesRes.json());
      if (votersRes.ok) setVoters(await votersRes.json());
      if (sirRes.ok) setSirRequests(await sirRes.json());
      if (complaintsRes.ok) setComplaints(await complaintsRes.json());
      if (blosRes.ok) setBloOfficers(await blosRes.json());
      if (annRes.ok) setAnnouncements(await annRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateAiBriefing = async () => {
    setGeneratingBriefing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/admin-briefing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAiBriefing(data.briefing);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingBriefing(false);
    }
  };

  const handleTogglePublishResults = async (electionId: number, currentStatus: boolean) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/elections/${electionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ results_published: !currentStatus })
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    const manifestoList = candManifesto
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: candName,
      party_name: candParty,
      party_symbol: candSymbol,
      constituency: candConstituency,
      age: candAge ? parseInt(candAge) : null,
      education: candEducation,
      assets_declared: candAssets,
      criminal_cases: parseInt(candCases) || 0,
      bio: candBio,
      manifesto_json: manifestoList
    };

    try {
      if (editingCandidate) {
        await fetch(`${API_BASE_URL}/api/admin/candidates/${editingCandidate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch(`${API_BASE_URL}/api/admin/candidates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }
      setShowCandidateModal(false);
      resetCandidateForm();
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const resetCandidateForm = () => {
    setEditingCandidate(null);
    setCandName('');
    setCandParty('');
    setCandSymbol('');
    setCandConstituency('New Delhi Central');
    setCandAge('');
    setCandEducation('');
    setCandAssets('');
    setCandCases('0');
    setCandBio('');
    setCandManifesto('');
  };

  const handleDeleteCandidate = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/admin/candidates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewSir = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    const remarks = window.prompt(`Enter administrative remarks for ${status}:`, 'Verified by Returning Officer');
    if (remarks === null) return;

    try {
      await fetch(`${API_BASE_URL}/api/admin/sir-requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, admin_remarks: remarks })
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReplyComplaint = async (id: number) => {
    if (!replyText.trim()) return;
    try {
      await fetch(`${API_BASE_URL}/api/admin/complaints/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'resolved', admin_reply: replyText.trim() })
      });
      setReplyingComplaintId(null);
      setReplyText('');
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    try {
      await fetch(`${API_BASE_URL}/api/admin/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          category: annCategory,
          is_pinned: 1
        })
      });
      setAnnTitle('');
      setAnnContent('');
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = (type: 'voters' | 'results' | 'sir' | 'audit') => {
    window.open(`${API_BASE_URL}/api/admin/export/${type}?token=${token}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-4">
      {/* Admin Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-full text-xs font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authorized Returning Officer / ECI Command Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Election Commission Command Center
          </h1>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('voters')}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roll</span>
          </button>
          <button
            onClick={() => handleExport('results')}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Results</span>
          </button>
          <button
            onClick={() => handleExport('sir')}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export SIR</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-3 text-xs font-bold overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview & Briefing', icon: <Bot className="w-4 h-4" /> },
          { id: 'elections', label: 'Elections Manager', icon: <Vote className="w-4 h-4" /> },
          { id: 'candidates', label: 'Candidates & Manifestos', icon: <Users className="w-4 h-4" /> },
          { id: 'voters', label: 'Voters & Senior Queue', icon: <HeartHandshake className="w-4 h-4" /> },
          { id: 'sir_queue', label: 'SIR & BLO Approvals', icon: <FileText className="w-4 h-4" /> },
          { id: 'complaints', label: 'AI Complaint Triage', icon: <AlertTriangle className="w-4 h-4" /> },
          { id: 'announcements_audit', label: 'Notices & Audit Log', icon: <Bell className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2 px-3 rounded-xl transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & AI BRIEFING */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Total Registered</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">
                {stats?.totalVoters?.toLocaleString() || 0}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Votes Tallied</span>
              <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
                {stats?.totalVotes?.toLocaleString() || 0}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Turnout</span>
              <p className="text-2xl font-extrabold text-orange-600 font-mono mt-1">
                {stats?.turnoutPercentage || 0}%
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Pending SIR</span>
              <p className="text-2xl font-extrabold text-purple-600 font-mono mt-1">
                {stats?.pendingSir || 0}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Open Complaints</span>
              <p className="text-2xl font-extrabold text-red-600 font-mono mt-1">
                {stats?.pendingComplaints || 0}
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Senior (60+) / PwD</span>
              <p className="text-2xl font-extrabold text-indigo-600 font-mono mt-1">
                {stats?.seniorVoters || 0}
              </p>
            </div>
          </div>

          {/* AI Briefing Banner */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-3xl border border-orange-200 dark:border-orange-800/40 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-orange-600 text-white rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Executive Election Commission AI Briefing
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time synthesis of voter turnout, pending SIR petitions, and operational hotspots.
                  </p>
                </div>
              </div>

              <button
                onClick={generateAiBriefing}
                disabled={generatingBriefing}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {generatingBriefing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate Executive Briefing</span>
              </button>
            </div>

            {aiBriefing && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-orange-200 text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                {aiBriefing}
              </div>
            )}
          </div>

          {/* Live Constituency Results with Publish Toggle */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Live Constituency Results & Public Access
              </h3>
              {elections.length > 0 && (
                <button
                  onClick={() => handleTogglePublishResults(elections[0].id, elections[0].results_published)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    elections[0].results_published
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {elections[0].results_published ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{elections[0].results_published ? 'Results Published (Live to Public)' : 'Results Embargoed (Click to Publish)'}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-bold uppercase border-b">
                    <th className="p-3">Candidate</th>
                    <th className="p-3">Party</th>
                    <th className="p-3">Constituency</th>
                    <th className="p-3">Votes Tallied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {results.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{r.name}</td>
                      <td className="p-3 text-slate-500">{r.party_name}</td>
                      <td className="p-3 text-slate-500">{r.constituency}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">{r.votes?.toLocaleString() || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ELECTIONS MANAGER */}
      {activeTab === 'elections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Electoral Cycles ({elections.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {elections.map((el) => (
              <div
                key={el.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-orange-600 uppercase tracking-wider block">
                      {el.election_type}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{el.title}</h3>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                    {el.status}
                  </span>
                </div>

                <p className="text-xs text-slate-500">{el.description}</p>

                <div className="text-[11px] text-slate-400 font-mono space-y-0.5 pt-2 border-t border-slate-100">
                  <p>Start: {new Date(el.start_time).toLocaleString()}</p>
                  <p>End: {new Date(el.end_time).toLocaleString()}</p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleTogglePublishResults(el.id, el.results_published)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                  >
                    {el.results_published ? 'Unpublish Results' : 'Publish Results'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CANDIDATES MANAGER */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Contesting Candidates ({candidates.length})
            </h2>
            <button
              onClick={() => {
                resetCandidateForm();
                setShowCandidateModal(true);
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Contesting Candidate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h3>
                    <p className="text-xs text-orange-600 font-semibold">{c.party_name}</p>
                    <p className="text-[11px] text-slate-400">{c.constituency}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                    {c.party_symbol}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 pt-2 border-t">
                  <p>Education: <strong>{c.education || 'Declared'}</strong></p>
                  <p>Assets: <strong>{c.assets_declared || 'Disclosed'}</strong></p>
                  <p>Criminal Cases: <strong>{c.criminal_cases || 0}</strong></p>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setEditingCandidate(c);
                      setCandName(c.name);
                      setCandParty(c.party_name);
                      setCandSymbol(c.party_symbol);
                      setCandConstituency(c.constituency);
                      setCandAge(c.age ? String(c.age) : '');
                      setCandEducation(c.education || '');
                      setCandAssets(c.assets_declared || '');
                      setCandCases(String(c.criminal_cases || 0));
                      setCandBio(c.bio || '');
                      setCandManifesto(Array.isArray(c.manifesto_json) ? c.manifesto_json.join('\n') : '');
                      setShowCandidateModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCandidate(c.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: VOTERS & SENIOR QUEUE */}
      {activeTab === 'voters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Voter Directory & Senior Assistance Queue ({voters.length})
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-bold uppercase border-b">
                    <th className="p-3">EPIC</th>
                    <th className="p-3">Name & Contact</th>
                    <th className="p-3">Constituency & Part</th>
                    <th className="p-3">Senior / PwD Flag</th>
                    <th className="p-3">Voted Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {voters.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-orange-600">{v.epic_number}</td>
                      <td className="p-3">
                        <p className="font-bold text-slate-900 dark:text-white">{v.name}</p>
                        <p className="text-slate-400 text-[11px]">{v.email} · {v.mobile}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold">{v.constituency}</p>
                        <p className="text-slate-400 text-[11px]">{v.part_number} · #{v.serial_number}</p>
                      </td>
                      <td className="p-3">
                        {v.is_senior_citizen ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                            Senior (60+)
                          </span>
                        ) : (
                          <span className="text-slate-400">Standard</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.has_voted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {v.has_voted ? 'Tallied' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SIR REVISION QUEUE & BLO APPROVALS */}
      {activeTab === 'sir_queue' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Special Intensive Revision (SIR) Approval Queue ({sirRequests.length})
          </h2>

          <div className="space-y-3">
            {sirRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 font-bold text-[10px] rounded">
                      {req.form_type}
                    </span>
                    <span className="font-mono font-bold text-xs">{req.tracking_id}</span>
                    <span className="text-slate-400 text-[11px]">· {req.voter_name}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Subtype: <strong>{req.request_subtype}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Assigned BLO: {req.blo_name || 'Designated BLO'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    req.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : req.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {req.status}
                  </span>

                  {req.status !== 'APPROVED' && (
                    <button
                      onClick={() => handleReviewSir(req.id, 'APPROVED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      Approve & Mutate Roll
                    </button>
                  )}
                  {req.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleReviewSir(req.id, 'REJECTED')}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: AI COMPLAINT TRIAGE */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Grievances with Automated AI Priority Triage ({complaints.length})
          </h2>

          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded uppercase">
                        {c.category || 'GENERAL'}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        c.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.priority || 'MEDIUM'}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{c.subject}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">From: {c.user_name} ({c.user_email})</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl">
                  {c.description}
                </p>

                {/* AI Triage Suggestion */}
                {c.ai_suggested_reply && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-200 text-xs text-orange-900 space-y-2">
                    <p className="font-bold flex items-center space-x-1 text-orange-700">
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI Suggested Administrative Reply:</span>
                    </p>
                    <p className="italic">{c.ai_suggested_reply}</p>
                    <button
                      onClick={() => {
                        setReplyingComplaintId(c.id);
                        setReplyText(c.ai_suggested_reply);
                      }}
                      className="px-3 py-1 bg-orange-600 text-white rounded-lg font-bold text-[11px]"
                    >
                      Use AI Draft Reply
                    </button>
                  </div>
                )}

                {replyingComplaintId === c.id && (
                  <div className="space-y-2 pt-2">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setReplyingComplaintId(null)}
                        className="px-3 py-1 bg-slate-100 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReplyComplaint(c.id)}
                        className="px-4 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                      >
                        Send & Resolve
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: ANNOUNCEMENTS & AUDIT LOGS */}
      {activeTab === 'announcements_audit' && (
        <div className="space-y-6">
          {/* Post Notice */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Post Official Public Notice</h3>
            <form onSubmit={handleAddAnnouncement} className="space-y-3 text-xs">
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Notice headline..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                required
              />
              <textarea
                rows={2}
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Full notice content..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                required
              />
              <div className="flex justify-end">
                <button type="submit" className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl">
                  Publish Notice
                </button>
              </div>
            </form>
          </div>

          {/* Audit Logs */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Immutable Security Audit Log (Last 150 events)
            </h3>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-mono space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-600">{log.action}</span>
                    <span className="text-slate-400 text-[10px]">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Actor: {log.actor_role} · Target: {log.target_type} ({log.target_id || 'N/A'})
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {editingCandidate ? 'Edit Candidate Affidavit' : 'Add Contesting Candidate'}
            </h3>
            <form onSubmit={handleSaveCandidate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Name</label>
                <input
                  type="text"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Party Name</label>
                  <input
                    type="text"
                    value={candParty}
                    onChange={(e) => setCandParty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Symbol</label>
                  <input
                    type="text"
                    value={candSymbol}
                    onChange={(e) => setCandSymbol(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Constituency</label>
                <input
                  type="text"
                  value={candConstituency}
                  onChange={(e) => setCandConstituency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1">Age</label>
                  <input
                    type="number"
                    value={candAge}
                    onChange={(e) => setCandAge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold mb-1">Education</label>
                  <input
                    type="text"
                    value={candEducation}
                    onChange={(e) => setCandEducation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Assets Declared</label>
                  <input
                    type="text"
                    value={candAssets}
                    onChange={(e) => setCandAssets(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Criminal Cases</label>
                  <input
                    type="number"
                    value={candCases}
                    onChange={(e) => setCandCases(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Biography</label>
                <textarea
                  rows={2}
                  value={candBio}
                  onChange={(e) => setCandBio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Manifesto Pledges (One per line)</label>
                <textarea
                  rows={3}
                  value={candManifesto}
                  onChange={(e) => setCandManifesto(e.target.value)}
                  placeholder="Universal health clinics&#10;Solar energy subsidies&#10;Clean water access"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl">
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
