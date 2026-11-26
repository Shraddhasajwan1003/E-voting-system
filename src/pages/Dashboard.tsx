import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  MapPin,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  MessageSquare,
  Edit2,
  ShieldCheck,
  HeartHandshake,
  Calendar,
  Clock,
  Printer,
  ChevronRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function Dashboard() {
  const { user, token, login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Complaint Modal State
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintStatus, setComplaintStatus] = useState('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  // Edit Profile State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editMobile, setEditMobile] = useState(user?.mobile || '');
  const [profileStatus, setProfileStatus] = useState('');

  // VVPAT Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Senior / PwD Assistance State
  const [assistanceStatus, setAssistanceStatus] = useState('');
  const [requestingAssistance, setRequestingAssistance] = useState(false);

  // Summary State
  const [recentSirRequests, setRecentSirRequests] = useState<any[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [faceImage, setFaceImage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role === 'admin') {
      navigate('/admin');
    } else {
      setLoading(false);
      setEditName(user.name || '');
      setEditMobile(user.mobile || '');

      // Fetch user profile face
      fetch(`${API_BASE_URL}/api/users/face`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.face_data) setFaceImage(data.face_data);
        })
        .catch((e) => console.warn(e));

      // Fetch recent SIR requests
      fetch(`${API_BASE_URL}/api/sir/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setRecentSirRequests(data.slice(0, 2));
        })
        .catch((e) => console.warn(e));

      // Fetch recent appointments
      fetch(`${API_BASE_URL}/api/sir/blo-appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setRecentAppointments(data.slice(0, 2));
        })
        .catch((e) => console.warn(e));
    }
  }, [user, navigate, token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, mobile: editMobile })
      });
      const data = await res.json();
      if (res.ok) {
        setProfileStatus('Profile updated successfully!');
        login(token!, data.user);
        setTimeout(() => {
          setShowEditProfile(false);
          setProfileStatus('');
        }, 1200);
      } else {
        setProfileStatus(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setProfileStatus('An error occurred.');
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingComplaint(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ subject: complaintSubject, description: complaintDesc })
      });
      const data = await res.json();
      if (res.ok) {
        setComplaintStatus(`Complaint submitted! Auto-triaged under ${data.category || 'General'} (${data.priority || 'Medium'} priority).`);
        setTimeout(() => {
          setShowComplaintModal(false);
          setComplaintStatus('');
          setComplaintSubject('');
          setComplaintDesc('');
        }, 2500);
      } else {
        setComplaintStatus('Failed to submit complaint.');
      }
    } catch (err) {
      setComplaintStatus('An error occurred.');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  const handleFetchReceipt = async () => {
    setShowReceiptModal(true);
    setReceiptLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/receipt/latest`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setReceiptData(await res.json());
      } else {
        setReceiptData(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleRequestElderlyAssistance = async (type: 'home_voting' | 'priority_pass') => {
    setRequestingAssistance(true);
    setAssistanceStatus('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/sir/elderly-assistance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          request_home_voting: type === 'home_voting',
          request_priority_pass: type === 'priority_pass'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAssistanceStatus(type === 'home_voting' ? 'Home Postal Ballot requested!' : `Priority Pass issued: ${data.priority_pass_code}`);
        // Refresh profile
        fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then((r) => r.json())
          .then((fresh) => login(token!, fresh))
          .catch((e) => console.error(e));
      }
    } catch (err) {
      setAssistanceStatus('Failed to submit assistance request.');
    } finally {
      setRequestingAssistance(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="animate-spin h-8 w-8 text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Top Profile Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-700 gap-4">
          <div className="flex items-center space-x-5">
            {faceImage ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-orange-500 shadow-md flex-shrink-0">
                <img src={faceImage} alt="Profile" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 bg-orange-100 dark:bg-orange-950/40 rounded-2xl flex items-center justify-center text-orange-600 flex-shrink-0">
                <User className="w-10 h-10" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {user.name}
                </h1>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-md text-[10px] font-bold">
                  {user.sir_status || 'VERIFIED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                EPIC No:{' '}
                <span className="font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-md">
                  {user.epic_number}
                </span>
                {user.is_senior_citizen && (
                  <span className="ml-2 text-purple-600 font-bold">· 60+ Senior Citizen</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowEditProfile(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 text-xs font-bold transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
            <Link
              to="/epic"
              className="flex items-center space-x-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>E-EPIC Card</span>
            </Link>
          </div>
        </div>

        {/* Polling Station & Voting Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-orange-500" />
              <span>{t('voting_details')}</span>
            </h2>
            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('constituency')}</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{user.constituency}</p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700/60 pt-2 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Part Number</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{user.part_number || 'Part-42'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Serial Number</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">#{user.serial_number || 1}</p>
                </div>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700/60 pt-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('polling_station')}</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{user.polling_station || 'Booth Center'}</p>
                <p className="text-[11px] text-slate-500">{user.booth_address}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
              <span>{t('voting_status')}</span>
            </h2>
            <div className={`p-5 rounded-2xl border ${
              user.has_voted
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40'
            }`}>
              {user.has_voted ? (
                <div className="space-y-3 text-center">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base text-emerald-900 dark:text-emerald-300">
                    {t('vote_cast_success')}
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Your secret ballot has been recorded anonymously with cryptographic VVPAT assurance.
                  </p>
                  <button
                    onClick={handleFetchReceipt}
                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-50 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>View / Print VVPAT Receipt</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/40 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base text-orange-900 dark:text-orange-300">
                    {t('pending_vote')}
                  </h3>
                  <p className="text-xs text-orange-700 dark:text-orange-400">
                    {t('pending_vote_desc')}
                  </p>
                  <button
                    onClick={() => navigate('/vote')}
                    className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    {t('enter_voting_booth')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Senior Citizen & PwD Assistance Card */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800/40 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <HeartHandshake className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-base text-purple-900 dark:text-purple-200">
                Senior Citizen (60+) & PwD Assisted Franchise
              </h3>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Request home postal ballot dispatch or download a Priority Booth Pass for zero-wait assisted voting.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleRequestElderlyAssistance('priority_pass')}
              disabled={requestingAssistance}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              Get Priority Pass
            </button>
            <button
              onClick={() => handleRequestElderlyAssistance('home_voting')}
              disabled={requestingAssistance}
              className="px-4 py-2 bg-white dark:bg-slate-800 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 font-bold text-xs rounded-xl hover:bg-purple-50 transition-all disabled:opacity-50"
            >
              Request Home Postal Ballot
            </button>
          </div>
        </div>

        {assistanceStatus && (
          <p className="text-xs font-bold text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/50 p-2.5 rounded-xl border border-purple-300">
            ✓ {assistanceStatus}
          </p>
        )}

        {user.priority_pass_code && (
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-800 text-xs flex items-center justify-between">
            <span className="text-purple-700 dark:text-purple-300 font-semibold">Active Priority Pass Code:</span>
            <span className="font-mono font-bold text-purple-900 dark:text-purple-100">{user.priority_pass_code}</span>
          </div>
        )}
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/sir?tab=form8"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-orange-500 transition-all shadow-xs group"
        >
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Form 8 — Correction</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Update address, correct name spelling, or shift constituency in the roll.
          </p>
        </Link>

        <Link
          to="/blo"
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 transition-all shadow-xs group"
        >
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Book BLO Appointment</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Schedule a visit or call with your constituency Booth Level Officer.
          </p>
        </Link>

        <div
          onClick={() => setShowComplaintModal(true)}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-red-500 transition-all shadow-xs group cursor-pointer"
        >
          <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Raise Civic Grievance</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Report polling station, voter list, or accessibility issues with AI triage.
          </p>
        </div>
      </div>

      {/* VVPAT Receipt Slip Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-2 text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Official VVPAT Ballot Receipt</h3>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {receiptLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-500 mb-2" />
                <span>Fetching verified receipt...</span>
              </div>
            ) : receiptData ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">VVPAT Verification Code</span>
                  <p className="text-lg font-mono font-bold text-orange-600 dark:text-orange-400">
                    {receiptData.vvpat_receipt_code}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Election: <strong>{receiptData.election_title}</strong>
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Constituency: <strong>{receiptData.constituency}</strong>
                  </p>
                  <p className="text-slate-400 font-mono text-[11px]">
                    Timestamp: {new Date(receiptData.voted_at).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-[11px] leading-relaxed">
                  ✓ This receipt confirms your vote was counted in the official ledger. Verify anytime at <Link to="/verify-receipt" className="underline font-bold">/verify-receipt</Link>.
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt Slip</span>
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                No receipt found for this user account.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit Profile Details</h3>
            {profileStatus && (
              <p className="text-xs p-2.5 bg-orange-50 text-orange-700 rounded-xl">{profileStatus}</p>
            )}
            <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {showComplaintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Submit Grievance / Complaint</h3>
              <p className="text-xs text-slate-500">Automatically triaged and routed via server Gemini AI.</p>
            </div>
            {complaintStatus && (
              <p className="text-xs p-2.5 bg-emerald-50 text-emerald-800 rounded-xl">{complaintStatus}</p>
            )}
            <form onSubmit={handleSubmitComplaint} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={complaintSubject}
                  onChange={(e) => setComplaintSubject(e.target.value)}
                  placeholder="e.g. Polling station ramp missing or name typo"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={complaintDesc}
                  onChange={(e) => setComplaintDesc(e.target.value)}
                  placeholder="Provide complete details..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplaint}
                  className="px-5 py-2 bg-red-600 text-white font-bold rounded-xl"
                >
                  {isSubmittingComplaint ? 'Submitting...' : 'Submit Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
