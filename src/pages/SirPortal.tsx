import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Send,
  ArrowRight,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function SirPortal() {
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Parse tab from URL query params (e.g. /sir?tab=form8)
  const queryParams = new URLSearchParams(location.search);
  const defaultTab = (queryParams.get('tab') as 'track' | 'form8' | 'form7' | 'my_requests') || 'track';

  const [activeTab, setActiveTab] = useState<'track' | 'form8' | 'form7' | 'my_requests'>(defaultTab);

  // Track Status State
  const [searchTrackingId, setSearchTrackingId] = useState('');
  const [trackedRequest, setTrackedRequest] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Form 8 State
  const [f8Subtype, setF8Subtype] = useState('ADDRESS_SHIFT');
  const [f8Name, setF8Name] = useState(user?.name || '');
  const [f8Address, setF8Address] = useState(user?.address || '');
  const [f8City, setF8City] = useState(user?.city || '');
  const [f8State, setF8State] = useState(user?.state || '');
  const [f8Constituency, setF8Constituency] = useState(user?.constituency || '');
  const [f8DocNote, setF8DocNote] = useState('');
  const [f8Status, setF8Status] = useState<{ success?: string; error?: string; tracking_id?: string }>({});
  const [f8Loading, setF8Loading] = useState(false);

  // Form 7 State
  const [f7TargetEpic, setF7TargetEpic] = useState('');
  const [f7Reason, setF7Reason] = useState('DEATH_REMOVAL');
  const [f7Remarks, setF7Remarks] = useState('');
  const [f7Status, setF7Status] = useState<{ success?: string; error?: string; tracking_id?: string }>({});
  const [f7Loading, setF7Loading] = useState(false);

  // My Requests State
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'my_requests' && token) {
      loadMyRequests();
    }
  }, [activeTab, token]);

  const loadMyRequests = async () => {
    setMyRequestsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sir/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMyRequests(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMyRequestsLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTrackingId.trim()) return;
    setTrackingLoading(true);
    setTrackingError('');
    setTrackedRequest(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/sir/status/${encodeURIComponent(searchTrackingId.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tracking record not found');
      setTrackedRequest(data);
    } catch (err: any) {
      setTrackingError(err.message);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleSubmitForm8 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }
    setF8Loading(true);
    setF8Status({});

    try {
      const res = await fetch(`${API_BASE_URL}/api/sir/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          form_type: 'FORM_8',
          request_subtype: f8Subtype,
          new_data: {
            name: f8Name,
            address: f8Address,
            city: f8City,
            state: f8State,
            constituency: f8Constituency
          },
          supporting_doc_note: f8DocNote
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit Form 8');
      setF8Status({ success: 'Form 8 submitted successfully!', tracking_id: data.tracking_id });
    } catch (err: any) {
      setF8Status({ error: err.message });
    } finally {
      setF8Loading(false);
    }
  };

  const handleSubmitForm7 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }
    setF7Loading(true);
    setF7Status({});

    try {
      const res = await fetch(`${API_BASE_URL}/api/sir/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          form_type: 'FORM_7',
          request_subtype: f7Reason,
          new_data: {
            target_epic_number: f7TargetEpic,
            reason: f7Reason,
            remarks: f7Remarks
          },
          supporting_doc_note: f7Remarks
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit Form 7');
      setF7Status({ success: 'Form 7 objection submitted successfully!', tracking_id: data.tracking_id });
    } catch (err: any) {
      setF7Status({ error: err.message });
    } finally {
      setF7Loading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Portal Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-bold">
          <FileText className="w-3.5 h-3.5" />
          <span>Special Intensive Revision (SIR) 2026</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Electoral Roll Revision & Petitions Portal
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Submit Form 8 for demographic corrections, Form 7 for objections/deletions, and track application verification live.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-4 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('track')}
          className={`py-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'track'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Track Status</span>
        </button>

        <button
          onClick={() => setActiveTab('form8')}
          className={`py-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'form8'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Form 8 (Correction / Shifting)</span>
        </button>

        <button
          onClick={() => setActiveTab('form7')}
          className={`py-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'form7'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Form 7 (Objection / Deletion)</span>
        </button>

        {user && (
          <button
            onClick={() => setActiveTab('my_requests')}
            className={`py-3 px-2 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'my_requests'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>My Revision Requests</span>
          </button>
        )}
      </div>

      {/* Tab 1: Track Status */}
      {activeTab === 'track' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchTrackingId}
                onChange={(e) => setSearchTrackingId(e.target.value)}
                placeholder="Enter Tracking ID (e.g. SIR2026-XXXX) or EPIC Number..."
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none dark:text-white"
                required
              />
              <button
                type="submit"
                disabled={trackingLoading}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {trackingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Track Petition</span>
              </button>
            </form>

            {trackingError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>{trackingError}</span>
              </div>
            )}
          </div>

          {trackedRequest && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 gap-2">
                <div>
                  <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider block">
                    {trackedRequest.form_type} · {trackedRequest.request_subtype}
                  </span>
                  <h3 className="text-xl font-mono font-extrabold text-slate-900 dark:text-white">
                    {trackedRequest.tracking_id}
                  </h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  trackedRequest.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : trackedRequest.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                }`}>
                  Status: {trackedRequest.status}
                </span>
              </div>

              {/* Progress Stepper */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {['SUBMITTED', 'BLO_ASSIGNED', 'FIELD_VERIFIED', 'APPROVED'].map((step, idx) => {
                  const isCurrent = trackedRequest.status === step;
                  const isDone = ['APPROVED', 'FIELD_VERIFIED', 'BLO_ASSIGNED', 'SUBMITTED'].indexOf(trackedRequest.status) >= ['APPROVED', 'FIELD_VERIFIED', 'BLO_ASSIGNED', 'SUBMITTED'].indexOf(step);
                  return (
                    <div key={step} className="space-y-2">
                      <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-xs ${
                        isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <p className={`text-[11px] font-bold ${isCurrent ? 'text-orange-600' : 'text-slate-500'}`}>
                        {step.replace('_', ' ')}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 block font-semibold">Assigned Booth Level Officer</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {trackedRequest.blo_name || 'Designated Constituency BLO'}
                  </p>
                  {trackedRequest.blo_phone && (
                    <p className="text-slate-500 font-mono">{trackedRequest.blo_phone}</p>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Admin Remarks / Notes</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                    {trackedRequest.admin_remarks || 'Application under standard ECI verification.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Form 8 Correction */}
      {activeTab === 'form8' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Form 8 — Application for Demographic Correction / Residence Shifting
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Apply for correction of name, residential address, or transfer to another constituency under SIR 2026.
            </p>
          </div>

          {f8Status.success && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 space-y-1 text-xs">
              <p className="font-bold flex items-center">
                <CheckCircle className="w-4 h-4 mr-1.5" />
                {f8Status.success}
              </p>
              <p className="font-mono">Tracking ID: <strong>{f8Status.tracking_id}</strong> (Save this for verification)</p>
            </div>
          )}

          {f8Status.error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
              {f8Status.error}
            </div>
          )}

          <form onSubmit={handleSubmitForm8} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Correction Subtype
              </label>
              <select
                value={f8Subtype}
                onChange={(e) => setF8Subtype(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
              >
                <option value="ADDRESS_SHIFT">Shifting of Residence (Within or Outside Constituency)</option>
                <option value="NAME_CORRECTION">Correction of Name Spelling</option>
                <option value="PHOTO_UPDATE">Replacement of Voter Photograph</option>
                <option value="EPIC_REPLACEMENT">Replacement E-EPIC without Alteration</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Updated Full Name
                </label>
                <input
                  type="text"
                  value={f8Name}
                  onChange={(e) => setF8Name(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Updated Constituency
                </label>
                <input
                  type="text"
                  value={f8Constituency}
                  onChange={(e) => setF8Constituency(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Residential Address
                </label>
                <textarea
                  rows={2}
                  value={f8Address}
                  onChange={(e) => setF8Address(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={f8City}
                  onChange={(e) => setF8City(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">State</label>
                <input
                  type="text"
                  value={f8State}
                  onChange={(e) => setF8State(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supporting Document Details (e.g. Electricity Bill, Rent Agreement, Aadhaar)
              </label>
              <input
                type="text"
                value={f8DocNote}
                onChange={(e) => setF8DocNote(e.target.value)}
                placeholder="Mention document type & reference ID"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={f8Loading}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {f8Loading ? 'Submitting Petition...' : 'Submit Form 8 Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Form 7 Objection */}
      {activeTab === 'form7' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Form 7 — Application for Objection to Inadvertent or Invalid Inclusion
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              File a formal objection against an erroneous voter entry or request removal of a deceased / permanently shifted voter.
            </p>
          </div>

          {f7Status.success && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 space-y-1 text-xs">
              <p className="font-bold flex items-center">
                <CheckCircle className="w-4 h-4 mr-1.5" />
                {f7Status.success}
              </p>
              <p className="font-mono">Tracking ID: <strong>{f7Status.tracking_id}</strong></p>
            </div>
          )}

          {f7Status.error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
              {f7Status.error}
            </div>
          )}

          <form onSubmit={handleSubmitForm7} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Voter EPIC Number for Objection
              </label>
              <input
                type="text"
                value={f7TargetEpic}
                onChange={(e) => setF7TargetEpic(e.target.value)}
                placeholder="e.g. IND1234567"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono uppercase dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Objection / Deletion
              </label>
              <select
                value={f7Reason}
                onChange={(e) => setF7Reason(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
              >
                <option value="DEATH_REMOVAL">Deceased Elector</option>
                <option value="SHIFTED_PERMANENTLY">Permanently Shifted from Constituency</option>
                <option value="DUPLICATE_ENTRY">Duplicate / Multiple Entries in Roll</option>
                <option value="NON_CITIZEN">Disqualified / Underage Elector</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Remarks & Factual Ground for Objection
              </label>
              <textarea
                rows={3}
                value={f7Remarks}
                onChange={(e) => setF7Remarks(e.target.value)}
                placeholder="Provide factual details or death certificate number..."
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={f7Loading}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {f7Loading ? 'Submitting Form 7...' : 'Submit Form 7 Objection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: My Revision Requests */}
      {activeTab === 'my_requests' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            My Submitted Revision Petitions ({myRequests.length})
          </h2>

          {myRequestsLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-500 mb-2" />
              <span>Loading petitions...</span>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 text-xs">
              You have not submitted any Form 6/7/8 petitions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold text-[10px]">
                        {req.form_type}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {req.tracking_id}
                      </span>
                      <span className="text-[11px] text-slate-400">· {new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Subtype: <strong>{req.request_subtype}</strong>
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : req.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {req.status}
                    </span>
                    <button
                      onClick={() => {
                        setSearchTrackingId(req.tracking_id);
                        setActiveTab('track');
                        setTrackedRequest(req);
                      }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      View Timeline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
