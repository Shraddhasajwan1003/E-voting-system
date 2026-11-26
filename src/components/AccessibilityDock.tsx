import React, { useState } from 'react';
import { useAccessibility, FontScale } from '../context/AccessibilityContext';
import { useTranslation } from 'react-i18next';
import { Eye, Volume2, VolumeX, Type, Shield, Sliders, ChevronUp, ChevronDown } from 'lucide-react';

export default function AccessibilityDock() {
  const {
    seniorMode,
    fontScale,
    highContrast,
    reducedMotion,
    isSpeaking,
    toggleSeniorMode,
    setFontScale,
    toggleHighContrast,
    toggleReducedMotion,
    speakText,
    stopSpeaking
  } = useAccessibility();

  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleReadPage = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const mainContent = document.querySelector('main')?.innerText || document.body.innerText;
      speakText(mainContent.substring(0, 800), i18n.language);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {isOpen && (
        <div className="mb-3 p-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-80 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Accessibility & Senior Mode</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Senior Mode Toggle */}
          <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/30 p-2.5 rounded-xl border border-orange-200 dark:border-orange-800/40">
            <div>
              <p className="font-bold text-xs text-orange-900 dark:text-orange-200">Senior Simplified Mode</p>
              <p className="text-[11px] text-orange-700 dark:text-orange-300">Large touch targets & high legibility</p>
            </div>
            <button
              onClick={toggleSeniorMode}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                seniorMode
                  ? 'bg-orange-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
              }`}
            >
              {seniorMode ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Font Scaling */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5 flex items-center">
              <Type className="w-3.5 h-3.5 mr-1" />
              Font Size Scaling
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['normal', 'large', 'xlarge'] as FontScale[]).map((scale) => (
                <button
                  key={scale}
                  onClick={() => setFontScale(scale)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    fontScale === scale
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                >
                  {scale === 'normal' ? '100% (A)' : scale === 'large' ? '125% (A+)' : '150% (A++)'}
                </button>
              ))}
            </div>
          </div>

          {/* Contrast & Motion */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
            <button
              onClick={toggleHighContrast}
              className={`p-2 text-xs font-semibold rounded-xl border flex items-center justify-center space-x-1 transition-all ${
                highContrast
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                  : 'bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>High Contrast</span>
            </button>

            <button
              onClick={toggleReducedMotion}
              className={`p-2 text-xs font-semibold rounded-xl border flex items-center justify-center space-x-1 transition-all ${
                reducedMotion
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                  : 'bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Reduce Motion</span>
            </button>
          </div>

          {/* Read Page Aloud */}
          <button
            onClick={handleReadPage}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-sm ${
              isSpeaking
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Stop Read-Aloud Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Read This Page Aloud</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Dock Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3.5 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl border border-slate-700 hover:border-orange-500 transition-all transform hover:-translate-y-0.5 focus:outline-none"
        title="Accessibility & Senior Citizen Settings"
        aria-label="Accessibility & Senior Citizen Settings"
      >
        <Eye className="w-4 h-4 text-orange-400" />
        <span className="text-xs font-bold tracking-wide">Accessibility</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
