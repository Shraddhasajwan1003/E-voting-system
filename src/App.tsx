/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Navbar from './components/Navbar';
import AccessibilityDock from './components/AccessibilityDock';
import AiAssistantWidget from './components/AiAssistantWidget';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VotingBooth from './pages/VotingBooth';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import VoterSearch from './pages/VoterSearch';
import ElectoralRoll from './pages/ElectoralRoll';
import SirPortal from './pages/SirPortal';
import BloBooking from './pages/BloBooking';
import EpicDownload from './pages/EpicDownload';
import CandidatesDirectory from './pages/CandidatesDirectory';
import ElectionHistory from './pages/ElectionHistory';
import PublicResults from './pages/PublicResults';
import VerifyReceipt from './pages/VerifyReceipt';
import ChatAssistantPage from './pages/ChatAssistantPage';
import IntroScreen from './components/IntroScreen';
import { AuthProvider } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';

export default function App() {
  const [showIntro, setShowIntro] = useState(false);

  return (
    <AuthProvider>
      <AccessibilityProvider>
        <Router>
          <AnimatePresence mode="wait">
            {showIntro ? (
              <IntroScreen onComplete={() => setShowIntro(false)} />
            ) : (
              <motion.div
                key="main-app"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 selection:bg-orange-500 selection:text-white relative overflow-hidden"
              >
                {/* Background decorative ambiance */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                  <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full bg-orange-500/5 blur-3xl"></div>
                  <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-emerald-500/5 blur-3xl"></div>
                </div>

                <div className="relative z-10 flex flex-col min-h-screen">
                  <Navbar />
                  <main className="flex-grow container mx-auto px-4 py-6 max-w-7xl">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/vote" element={<VotingBooth />} />
                      <Route path="/admin" element={<AdminDashboard />} />

                      {/* Civic & SIR Production Routes */}
                      <Route path="/search" element={<VoterSearch />} />
                      <Route path="/roll" element={<ElectoralRoll />} />
                      <Route path="/sir" element={<SirPortal />} />
                      <Route path="/blo" element={<BloBooking />} />
                      <Route path="/epic" element={<EpicDownload />} />
                      <Route path="/candidates" element={<CandidatesDirectory />} />
                      <Route path="/history" element={<ElectionHistory />} />
                      <Route path="/results" element={<PublicResults />} />
                      <Route path="/verify-receipt" element={<VerifyReceipt />} />
                      <Route path="/chat" element={<ChatAssistantPage />} />
                    </Routes>
                  </main>

                  {/* Accessibility Dock & AI Assistant Widgets */}
                  <AccessibilityDock />
                  <AiAssistantWidget />

                  <footer className="bg-slate-900 text-slate-400 py-6 text-center border-t border-slate-800 text-xs">
                    <p>&copy; 2026 Election Commission of India. All rights reserved · Apna Mat Civic Technology Initiative</p>
                  </footer>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Router>
      </AccessibilityProvider>
    </AuthProvider>
  );
}
