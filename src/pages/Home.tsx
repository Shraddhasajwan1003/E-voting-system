import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Download,
  PhoneCall,
  FileText,
  AlertCircle,
  MessageSquare,
  Users,
  History,
  ShieldCheck,
  CheckCircle,
  Calendar,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function Home() {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activeElections, setActiveElections] = useState<any[]>([]);

  useEffect(() => {
    // Fetch live announcements and active elections
    fetch(`${API_BASE_URL}/api/elections/announcements/all`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data.slice(0, 3));
      })
      .catch((e) => console.warn('Announcements fetch error:', e));

    fetch(`${API_BASE_URL}/api/elections`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActiveElections(data.filter((el) => el.status === 'ACTIVE'));
        }
      })
      .catch((e) => console.warn('Elections fetch error:', e));
  }, []);

  const coreServices = [
    {
      title: t('search_voter') || 'Search Electoral Roll',
      desc: 'Verify your name, polling station part, and serial number in the voter list.',
      icon: <Search className="w-6 h-6 text-orange-600" />,
      link: '/search',
      badge: 'Public'
    },
    {
      title: t('download_epic') || 'Digital E-EPIC Card',
      desc: 'Download your official digital Voter ID with secure QR code verification.',
      icon: <Download className="w-6 h-6 text-emerald-600" />,
      link: '/epic',
      badge: 'Authenticated'
    },
    {
      title: t('candidates_nav') || 'Candidates & Manifestos',
      desc: 'Explore candidate profiles, declared affidavits, education, and side-by-side policy comparisons.',
      icon: <Users className="w-6 h-6 text-blue-600" />,
      link: '/candidates',
      badge: 'Civic Data'
    },
    {
      title: t('book_blo') || 'Book BLO Appointment',
      desc: 'Schedule a call or doorstep visit with your Booth Level Officer for roll assistance.',
      icon: <PhoneCall className="w-6 h-6 text-purple-600" />,
      link: '/blo',
      badge: 'SIR 2026'
    },
    {
      title: t('download_roll') || 'Constituency Electoral Roll',
      desc: 'View and download the complete electoral roll for your constituency in CSV/PDF format.',
      icon: <FileText className="w-6 h-6 text-amber-600" />,
      link: '/roll',
      badge: 'Open Roll'
    },
    {
      title: t('verify_receipt_nav') || 'Verify VVPAT Receipt',
      desc: 'Check that your secret ballot was tallied in the official ledger using your cryptographic slip code.',
      icon: <ShieldCheck className="w-6 h-6 text-teal-600" />,
      link: '/verify-receipt',
      badge: 'Verifiable'
    },
    {
      title: t('history_nav') || 'Past Election History',
      desc: 'Browse multi-cycle election archives (2014–2024), winner margins, and turnout analytics.',
      icon: <History className="w-6 h-6 text-indigo-600" />,
      link: '/history',
      badge: 'Archive'
    },
    {
      title: t('register_complaint') || 'Grievance Redressal',
      desc: 'Submit election or voter list complaints with automated AI priority triage.',
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      link: '/dashboard?action=complaint',
      badge: '24/7 Redressal'
    },
    {
      title: t('chatbot') || 'Civic Guide AI & Voice',
      desc: 'Multilingual voice assistant answering questions regarding election rules in 23 Indian languages.',
      icon: <MessageSquare className="w-6 h-6 text-orange-500" />,
      link: '/chat',
      badge: 'AI Assistant'
    }
  ];

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Live Announcement Strip */}
      {announcements.length > 0 && (
        <div className="bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-3 overflow-hidden">
            <span className="px-2.5 py-1 bg-orange-600 text-white text-[11px] font-extrabold uppercase rounded-md tracking-wider flex-shrink-0 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Notice</span>
            </span>
            <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="font-bold">{announcements[0]?.title}:</span>{' '}
              <span className="text-slate-600 dark:text-slate-400">{announcements[0]?.content}</span>
            </div>
          </div>
          <Link
            to="/sir"
            className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center space-x-1 flex-shrink-0 ml-4"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Civic Hero */}
      <section className="text-center py-16 px-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 via-white dark:via-slate-800 to-green-600"></div>

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Election Commission of India · General Parliamentary Election 2026</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {t('home_title')}
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl mx-auto">
            {t('home_subtitle')}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center space-x-2"
            >
              <span>{t('register_btn')}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl border border-slate-300 dark:border-slate-600 hover:border-orange-500 transition-all text-sm flex items-center justify-center space-x-2"
            >
              <span>{t('login_btn')}</span>
            </Link>

            <Link
              to="/candidates"
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all text-sm flex items-center justify-center space-x-1.5"
            >
              <Users className="w-4 h-4" />
              <span>View Candidates</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Active Elections Banner */}
      {activeElections.length > 0 && (
        <section className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Live Active Election
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeElections[0].title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {activeElections[0].description}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/vote"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Enter Voting Booth
              </Link>
              <Link
                to="/candidates"
                className="px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:border-emerald-500 font-bold text-xs rounded-xl transition-all"
              >
                Manifestos
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Civic Services Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('services_title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Official Election Commission services for citizens, electors, and candidates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coreServices.map((service, idx) => (
            <Link
              key={idx}
              to={service.link}
              className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 transition-all hover:shadow-md group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/60 rounded-xl group-hover:scale-110 transition-transform">
                    {service.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                    {service.badge}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {service.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {service.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-orange-600 transition-colors">
                <span>Access Service</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Special Intensive Revision (SIR) 2026 Notice Box */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 md:p-10 border border-slate-700 shadow-lg relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold border border-orange-500/30">
            <Info className="w-3.5 h-3.5" />
            <span>Constitutional Mandate · ECI Notification</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight">
            {t('sir_title')}
          </h2>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-3xl mx-auto">
            {t('sir_desc')}
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/sir"
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center space-x-2"
            >
              <span>{t('check_revision')}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              to="/sir?tab=form8"
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-all"
            >
              File Form 8 (Correction)
            </Link>

            <Link
              to="/blo"
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-all"
            >
              Find My BLO
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
