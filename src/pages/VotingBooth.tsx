import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Camera,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Volume2,
  Lock,
  Printer,
  ChevronRight,
  Vote,
  Sparkles
} from 'lucide-react';
import Webcam from 'react-webcam';
import { useAccessibility } from '../context/AccessibilityContext';
import { API_BASE_URL } from '../api';

interface Candidate {
  id: number;
  name: string;
  party_name: string;
  party_symbol: string;
  constituency: string;
  is_nota?: number;
  manifesto_json?: any;
}

export default function VotingBooth() {
  const { user, token, updateUser } = useAuth();
  const { t, i18n } = useTranslation();
  const { speakText, isSpeaking, stopSpeaking } = useAccessibility();
  const navigate = useNavigate();

  const [elections, setElections] = useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<number>(1);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Dual Auth & Face, 2: EVM Ballot, 3: Success with VVPAT
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth Inputs
  const [identifier, setIdentifier] = useState(user?.epic_number || user?.email || '');
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Live Camera Face Verification
  const [cameraActive, setCameraActive] = useState(false);
  const [liveFaceData, setLiveFaceData] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  // VVPAT Result
  const [vvpatResult, setVvpatResult] = useState<{
    vvpat_receipt_code: string;
    ballot_hash: string;
    voted_at: string;
  } | null>(null);

  useEffect(() => {
    if (!user || user.role === 'admin') {
      navigate('/login');
      return;
    }

    if (user.has_voted) {
      navigate('/dashboard');
      return;
    }

    // Load active elections and candidates
    const initBooth = async () => {
      try {
        const elRes = await fetch(`${API_BASE_URL}/api/elections`);
        const elData = await elRes.json();
        const activeList = Array.isArray(elData) ? elData.filter((e) => e.status === 'ACTIVE') : [];
        setElections(activeList);

        const currentElId = activeList.length > 0 ? activeList[0].id : 1;
        setSelectedElectionId(currentElId);

        const candRes = await fetch(`${API_BASE_URL}/api/candidates?election_id=${currentElId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const candData = await candRes.json();
        if (!candRes.ok) throw new Error(candData.error || 'Failed to fetch ballot candidates');
        setCandidates(candData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initBooth();
  }, [user, token, navigate]);

  const captureFace = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setLiveFaceData(imageSrc);
      setCameraActive(false);
    }
  }, [webcamRef]);

  const handleVoterAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-voter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          identifier,
          aadhaar_last4: aadhaarLast4,
          password,
          live_face_data: liveFaceData
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Dual biometric verification failed');

      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVoteSubmit = async () => {
    if (!selectedCandidate) return;
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_id: selectedCandidate.id,
          election_id: selectedElectionId
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to record vote');

      setVvpatResult({
        vvpat_receipt_code: data.vvpat_receipt_code,
        ballot_hash: data.ballot_hash,
        voted_at: data.voted_at
      });

      updateUser({ ...user!, has_voted: true });
      setShowConfirmModal(false);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const readCandidateAloud = (c: Candidate) => {
    const text = c.is_nota
      ? 'None of the above. Select this option if you choose not to vote for any of the contesting candidates.'
      : `Candidate: ${c.name}. Party: ${c.party_name}. Symbol: ${c.party_symbol}.`;
    speakText(text, i18n.language);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="animate-spin h-8 w-8 text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* EVM Header */}
        <div className="bg-gradient-to-r from-orange-600 via-orange-700 to-green-700 text-white p-6 text-center relative overflow-hidden">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Lock className="w-5 h-5 text-orange-200" />
            <span className="text-xs uppercase tracking-wider font-bold text-orange-100">
              ECI Secure Electronic Ballot Booth · Rule 49-A
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Secure Electronic Voting Machine (EVM)
          </h1>
          <p className="text-xs text-orange-100 mt-1">
            Parliamentary Constituency: <span className="font-bold underline">{user?.constituency}</span>
          </p>
        </div>

        <div className="p-6 md:p-8 min-h-[400px]">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 text-xs p-3.5 rounded-xl mb-6 border border-red-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Dual Authentication & Face Verification */}
          {step === 1 && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Step 1: Multi-Factor Voter Verification
                </h2>
                <p className="text-xs text-slate-500">
                  Verify your credentials and capture a live face photo before the ballot unlocks.
                </p>
              </div>

              <form onSubmit={handleVoterAuth} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    EPIC Number or Registered Email
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 font-mono dark:text-white"
                    placeholder="Enter EPIC or Email"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Aadhaar Last 4 Digits
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    value={aadhaarLast4}
                    onChange={(e) => setAadhaarLast4(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 font-mono dark:text-white"
                    placeholder="e.g. 1234"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white"
                    placeholder="Enter password"
                  />
                </div>

                {/* Optional Live Camera Verification */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Live Webcam Face Verification (Optional/Recommended)
                  </span>

                  {!cameraActive && !liveFaceData ? (
                    <button
                      type="button"
                      onClick={() => setCameraActive(true)}
                      className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
                    >
                      Start Camera Verification
                    </button>
                  ) : cameraActive ? (
                    <div className="space-y-2 max-w-xs mx-auto">
                      {/* @ts-expect-error react-webcam type */}
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: 'user' }}
                        className="w-full rounded-xl border border-orange-500 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={captureFace}
                        className="px-4 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold"
                      >
                        Capture & Confirm
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-emerald-600 font-bold text-xs">✓ Live Face Photo Captured</p>
                      <button
                        type="button"
                        onClick={() => {
                          setLiveFaceData(null);
                          setCameraActive(true);
                        }}
                        className="text-[11px] text-slate-500 hover:underline"
                      >
                        Retake
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials & Biometrics...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authenticate & Access Ballot</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Accessible Electronic Ballot */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Identity Verified · Secret Ballot Mode Active</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-mono">1 Person · 1 Secret Vote</span>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Select your candidate and press "Vote" on the EVM button below:
                </p>

                {candidates.map((c) => {
                  const isSelected = selectedCandidate?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCandidate(c)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 shadow-md ring-2 ring-orange-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 text-sm font-mono shadow-inner">
                          {c.party_symbol ? c.party_symbol.substring(0, 3) : 'IND'}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {c.name}
                          </h3>
                          <p className="text-xs text-slate-500">{c.party_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            readCandidateAloud(c);
                          }}
                          className="p-2 text-slate-400 hover:text-orange-600 rounded-lg transition-colors"
                          title="Listen to candidate details"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-orange-600 bg-orange-600' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {selectedCandidate ? `Selected: ${selectedCandidate.name}` : 'No candidate selected yet'}
                </span>

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!selectedCandidate}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
                >
                  <Vote className="w-4 h-4" />
                  <span>Cast Secret Ballot</span>
                </button>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {showConfirmModal && selectedCandidate && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-700 shadow-2xl text-center space-y-4">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                  <Vote className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Confirm Final Vote Submission
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    You have selected:
                  </p>
                  <p className="text-base font-extrabold text-orange-600 dark:text-orange-400 mt-2">
                    {selectedCandidate.name}
                  </p>
                  <p className="text-xs text-slate-500">{selectedCandidate.party_name}</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] text-slate-500 leading-snug">
                  Once confirmed, your secret ballot is recorded and a cryptographic VVPAT receipt will be issued. This cannot be undone.
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleVoteSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs disabled:opacity-50"
                  >
                    {isSubmitting ? 'Recording...' : 'Confirm Vote'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Success Screen with VVPAT Slip */}
          {step === 3 && vvpatResult && (
            <div className="text-center space-y-6 py-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Vote Cast Successfully!
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Thank you for exercising your constitutional franchise in the General Election.
                </p>
              </div>

              {/* VVPAT Slip Box */}
              <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border-2 border-emerald-500/40 max-w-md mx-auto text-left space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Official VVPAT Slip</span>
                  <span className="text-[10px] font-bold text-emerald-600">CERTIFIED TALLIED</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">VVPAT Verification Code</span>
                  <p className="text-lg font-mono font-extrabold text-orange-600 dark:text-orange-400">
                    {vvpatResult.vvpat_receipt_code}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cryptographic Ballot Hash</span>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                    {vvpatResult.ballot_hash}
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 pt-1">
                  Timestamp: {new Date(vvpatResult.voted_at).toLocaleString()}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print VVPAT Slip</span>
                </button>

                <Link
                  to="/verify-receipt"
                  className="w-full sm:w-auto px-6 py-2.5 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700 rounded-xl text-xs font-bold"
                >
                  Verify Receipt at /verify-receipt
                </Link>

                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
