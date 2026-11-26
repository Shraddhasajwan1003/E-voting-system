import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../api';

export type FontScale = 'normal' | 'large' | 'xlarge';

interface AccessibilityContextType {
  seniorMode: boolean;
  fontScale: FontScale;
  highContrast: boolean;
  reducedMotion: boolean;
  autoReadAloud: boolean;
  isSpeaking: boolean;
  toggleSeniorMode: () => void;
  setFontScale: (scale: FontScale) => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  toggleAutoReadAloud: () => void;
  speakText: (text: string, lang?: string) => Promise<void>;
  stopSpeaking: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seniorMode, setSeniorMode] = useState<boolean>(() => {
    return localStorage.getItem('apnamat_senior_mode') === 'true';
  });

  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    return (localStorage.getItem('apnamat_font_scale') as FontScale) || 'normal';
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('apnamat_high_contrast') === 'true';
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem('apnamat_reduced_motion') === 'true';
  });

  const [autoReadAloud, setAutoReadAloud] = useState<boolean>(() => {
    return localStorage.getItem('apnamat_auto_read_aloud') === 'true';
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Apply DOM classes immediately
  useEffect(() => {
    const root = document.documentElement;

    // Senior Mode
    if (seniorMode) {
      root.classList.add('senior-mode');
    } else {
      root.classList.remove('senior-mode');
    }
    localStorage.setItem('apnamat_senior_mode', String(seniorMode));

    // High Contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    localStorage.setItem('apnamat_high_contrast', String(highContrast));

    // Reduced Motion
    if (reducedMotion || seniorMode) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    localStorage.setItem('apnamat_reduced_motion', String(reducedMotion));

    // Font Scale
    root.classList.remove('font-scale-lg', 'font-scale-xl');
    if (fontScale === 'large' || seniorMode) {
      root.classList.add('font-scale-lg');
    } else if (fontScale === 'xlarge') {
      root.classList.add('font-scale-xl');
    }
    localStorage.setItem('apnamat_font_scale', fontScale);
    localStorage.setItem('apnamat_auto_read_aloud', String(autoReadAloud));
  }, [seniorMode, fontScale, highContrast, reducedMotion, autoReadAloud]);

  const toggleSeniorMode = () => {
    setSeniorMode((prev) => !prev);
  };

  const setFontScale = (scale: FontScale) => {
    setFontScaleState(scale);
  };

  const toggleHighContrast = () => {
    setHighContrast((prev) => !prev);
  };

  const toggleReducedMotion = () => {
    setReducedMotion((prev) => !prev);
  };

  const toggleAutoReadAloud = () => {
    setAutoReadAloud((prev) => !prev);
  };

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(
    async (text: string, lang: string = 'en') => {
      stopSpeaking();
      setIsSpeaking(true);

      // Attempt server TTS via gemini-3.8-flash-lite-tts
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language: lang })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.audioBase64) {
            const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
            audioRef.current = audio;
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => setIsSpeaking(false);
            await audio.play();
            return;
          }
        }
      } catch (err) {
        console.warn('Server TTS unavailable, using browser speech synthesis:', err);
      }

      // Browser Web Speech API fallback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang.startsWith('hi') ? 'hi-IN' : lang.startsWith('ta') ? 'ta-IN' : 'en-IN';
        utterance.rate = seniorMode ? 0.85 : 0.95; // Slower cadence for clarity
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    },
    [stopSpeaking, seniorMode]
  );

  return (
    <AccessibilityContext.Provider
      value={{
        seniorMode,
        fontScale,
        highContrast,
        reducedMotion,
        autoReadAloud,
        isSpeaking,
        toggleSeniorMode,
        setFontScale,
        toggleHighContrast,
        toggleReducedMotion,
        toggleAutoReadAloud,
        speakText,
        stopSpeaking
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
