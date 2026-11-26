import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Vote, User, LogOut, Moon, Sun, Globe, Search, ChevronDown, Check } from 'lucide-react';
import { SCHEDULED_LANGUAGES, getLanguageByCode } from '../data/languages';
import { setApplicationLanguage } from '../i18n';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [langOpen, setLangOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  const currentLang = getLanguageByCode(i18n.language);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close language popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const selectLanguage = async (code: string) => {
    setLangOpen(false);
    setLangSearch('');
    await setApplicationLanguage(code);
  };

  const filteredLanguages = SCHEDULED_LANGUAGES.filter((l) =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: t('candidates_nav') || 'Candidates', path: '/candidates' },
    { name: t('sir_nav') || 'SIR Services', path: '/sir' },
    { name: t('history_nav') || 'History', path: '/history' },
    { name: t('results_nav') || 'Results', path: '/results' }
  ];

  return (
    <nav
      className={`sticky top-0 z-40 transition-all duration-200 border-t-3 border-orange-600 ${
        scrolled
          ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md py-2'
          : 'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3'
      }`}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex justify-between items-center h-12">
          {/* Zone 1: Wordmark & Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="p-1.5 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl group-hover:scale-105 transition-transform">
              <Vote className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {t('app_name')}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold leading-none">
                ECI Official Portal
              </span>
            </div>
          </Link>

          {/* Zone 2: Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1 font-medium text-xs">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Zone 3: Utility Controls & Account */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Searchable 23-Language Selector */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-orange-500 transition-colors"
                title="Change Language (22 Eighth-Schedule Indian Languages + English)"
              >
                <Globe className="h-4 w-4 text-orange-500" />
                <span className="hidden sm:inline">{currentLang.nativeName}</span>
                <span className="sm:hidden uppercase">{currentLang.code}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Search Filter */}
                  <div className="relative mb-2 px-1">
                    <Search className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      placeholder="Search 23 Indian languages..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      autoFocus
                    />
                  </div>

                  {/* Language List */}
                  <div className="max-h-60 overflow-y-auto space-y-0.5 divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => selectLanguage(lang.code)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                          currentLang.code === lang.code
                            ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{lang.nativeName}</span>
                          <span className="text-[11px] text-slate-400">({lang.name})</span>
                        </div>
                        {currentLang.code === lang.code && <Check className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />}
                      </button>
                    ))}
                    {filteredLanguages.length === 0 && (
                      <p className="p-3 text-center text-xs text-slate-400">No language found</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            {/* Account Controls */}
            {user ? (
              <div className="flex items-center space-x-2">
                <Link
                  to={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg hover:border-orange-500 border border-transparent transition-colors text-xs font-semibold"
                >
                  <User className="h-3.5 w-3.5 text-orange-500" />
                  <span className="max-w-[100px] truncate">{user.name?.split(' ')[0]}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  title={t('logout') || 'Logout'}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-colors"
                >
                  {t('login') || 'Login'}
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all"
                >
                  {t('register_btn') || 'Register (Form 6)'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
