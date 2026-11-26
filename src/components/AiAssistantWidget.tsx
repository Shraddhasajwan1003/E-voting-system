import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { MessageSquare, Send, Mic, MicOff, Volume2, X, Maximize2, RefreshCw, Bot } from 'lucide-react';
import { API_BASE_URL } from '../api';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function AiAssistantWidget() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { speakText, isSpeaking, stopSpeaking } = useAccessibility();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Namaste! I am your Apna Mat Civic Guide AI. How may I assist you with the voter roll, SIR 2026 Form 6/7/8 petitions, constituency candidate manifestos, or your polling station today?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newMessages.slice(-6),
          language: i18n.language,
          constituency: user?.constituency || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'model', content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: 'I apologize, but I could not connect to the civic assistant service right now. Please ensure your query is related to SIR 2026, voter ID, or candidates.'
          }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: 'Network connection issue. For immediate assistance, please visit the SIR Services hub or browse constituency candidates.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((track) => track.stop());

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string)?.split(',')[1];
            if (!base64Audio) return;

            setIsLoading(true);
            try {
              const res = await fetch(`${API_BASE_URL}/api/ai/transcribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  base64Audio,
                  mimeType: 'audio/webm',
                  language: i18n.language
                })
              });
              if (res.ok) {
                const data = await res.json();
                if (data.text) {
                  handleSend(data.text);
                }
              }
            } catch (err) {
              console.warn('Transcription error:', err);
            } finally {
              setIsLoading(false);
            }
          };
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Microphone permission denied or unsupported:', err);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 w-[360px] sm:w-[420px] h-[540px] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight">Civic Guide AI Assistant</h3>
                <p className="text-[11px] text-orange-100 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span>Grounded in Real ECI & SIR Data</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Link
                to="/chat"
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Open Fullscreen Assistant"
                onClick={() => setIsOpen(false)}
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Strip */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/60 flex items-center space-x-2 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleSend('Check my SIR 2026 eligibility and schedule')}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-500 hover:text-orange-600 transition-colors shadow-2xs"
            >
              📋 SIR Status
            </button>
            <button
              onClick={() => handleSend('How do I submit Form 8 for address or name correction?')}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-500 hover:text-orange-600 transition-colors shadow-2xs"
            >
              ✏️ Form 8 Help
            </button>
            <button
              onClick={() => handleSend('Compare the candidate manifestos in my constituency')}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-500 hover:text-orange-600 transition-colors shadow-2xs"
            >
              ⚖️ Manifestos
            </button>
            <button
              onClick={() => handleSend('How does secret ballot VVPAT verification work?')}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-500 hover:text-orange-600 transition-colors shadow-2xs"
            >
              🛡️ VVPAT
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-orange-600 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/80 dark:border-slate-600/50'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                {m.role === 'model' && (
                  <button
                    onClick={() => speakText(m.content, i18n.language)}
                    className="mt-1 flex items-center space-x-1 text-[11px] text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen Aloud</span>
                  </button>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
                <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                <span>Civic Assistant is analyzing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about voter list, Form 8, candidates..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />

              <button
                type="button"
                onClick={handleMicToggle}
                className={`p-2.5 rounded-xl border transition-colors ${
                  isRecording
                    ? 'bg-red-600 text-white border-red-600 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:text-orange-600'
                }`}
                title={isRecording ? 'Stop Recording' : 'Voice Input (Microphone)'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 focus:outline-none ring-4 ring-orange-500/20"
        title="Open AI Civic Assistant & Voice Guide"
        aria-label="Open AI Civic Assistant & Voice Guide"
      >
        <MessageSquare className="w-5 h-5 text-white" />
        <span className="font-bold text-xs tracking-wide">Civic Guide AI</span>
      </button>
    </div>
  );
}
