import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Download, Printer, ShieldCheck, User, QrCode, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function EpicDownload() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [epicData, setEpicData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetch(`${API_BASE_URL}/api/users/epic-card`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Could not fetch E-EPIC card');
        return res.json();
      })
      .then((data) => setEpicData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
        <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
        <span>Generating secure digital E-EPIC card...</span>
      </div>
    );
  }

  if (error || !epicData) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border text-sm text-slate-600 dark:text-slate-300">
        <p className="text-red-500 font-bold mb-4">{error || 'E-EPIC Card unavailable'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Digital Identity Document</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Digital E-EPIC Voter Identity Card
          </h1>
          <p className="text-sm text-slate-500">
            Cryptographically signed electronic electoral photo identity card valid under Rule 49-B.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save E-EPIC PDF</span>
        </button>
      </div>

      {/* Realistic E-EPIC Card Canvas */}
      <div className="flex justify-center">
        <div
          id="epic-card"
          className="w-full max-w-2xl bg-gradient-to-br from-slate-50 via-white to-orange-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-3xl border-2 border-orange-500/40 shadow-2xl p-8 relative overflow-hidden"
        >
          {/* Header Strip with Ashoka Emblem & Tricolor */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-white to-green-600"></div>

          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center font-bold text-orange-600 text-2xl">
                🇮🇳
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  Election Commission of India
                </h2>
                <p className="text-[11px] text-slate-500 font-semibold tracking-wide">
                  ELECTOR PHOTO IDENTITY CARD · E-EPIC
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">EPIC NUMBER</span>
              <span className="text-base font-mono font-extrabold text-orange-600 dark:text-orange-400">
                {epicData.epic_number}
              </span>
            </div>
          </div>

          {/* Main Card Body */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            {/* Voter Photo */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-32 h-36 rounded-2xl border-2 border-slate-300 dark:border-slate-600 overflow-hidden bg-slate-100 dark:bg-slate-700 shadow-inner flex items-center justify-center">
                {epicData.photo ? (
                  <img
                    src={epicData.photo}
                    alt={epicData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-slate-400" />
                )}
              </div>
              <span className="text-[10px] font-mono font-semibold text-slate-400">
                Biometric Descriptor Verified
              </span>
            </div>

            {/* Voter Demographics */}
            <div className="md:col-span-2 space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Elector Name</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{epicData.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date of Birth / Age</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {epicData.dob ? new Date(epicData.dob).toLocaleDateString() : 'Declared on Aadhaar'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Gender</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{epicData.gender}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Parliamentary Constituency</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{epicData.constituency}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Part Number</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{epicData.part_number}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Serial Number</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{epicData.serial_number}</span>
                </div>
              </div>
            </div>

            {/* QR Verification Block */}
            <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <QrCode className="w-20 h-20 text-slate-900 dark:text-white" />
              <div className="text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  ECI SECURE QR
                </span>
                <span className="text-[9px] text-slate-400 font-mono">Scan to Verify</span>
              </div>
            </div>
          </div>

          {/* Polling Station Footer Strip */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Designated Polling Station</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{epicData.polling_station}</p>
              <p className="text-[11px] text-slate-500 truncate">{epicData.booth_address}</p>
            </div>

            <div className="flex flex-col md:items-end justify-center space-y-1">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full text-[11px] font-bold">
                SIR Status: {epicData.sir_status}
              </span>
              {epicData.priority_pass_code && (
                <span className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400">
                  Priority Pass: {epicData.priority_pass_code}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
