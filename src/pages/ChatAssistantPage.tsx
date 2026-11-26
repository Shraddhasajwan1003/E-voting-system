import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Send, Mic, MicOff, Volume2, RefreshCw, VolumeX, Sparkles, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { API_BASE_URL } from '../api';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function ChatAssistantPage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { speakText, isSpeaking, stopSpeaking, seniorMode } = useAccessibility();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Namaste! Welcome to the Apna Mat Civic Guide AI. How may I assist you with your voter registration, SIR 2026 petitions, candidate manifestos, polling station information, or accessibility support today?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        if (seniorMode) {
          speakText(data.reply, i18n.language);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: 'I apologize, but I am unable to connect to the assistant service right now. Please check back shortly.'
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
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
        console.warn('Microphone permission error:', err);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 py-4 h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Civic Guide AI & Multilingual Voice Assistant
            </h1>
            <p className="text-xs text-slate-500">
              Interactive civic support in 23 Eighth-Schedule Indian languages with voice read-aloud.
            </p>
          </div>
        </div>

        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 animate-pulse"
          >
            <VolumeX className="w-4 h-4" />
            <span>Stop Audio</span>
          </button>
        )}
      </div>

      {/* Suggested Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto text-xs pb-1">
        <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Suggested:</span>
        <button
          onClick={() => handleSend('Check my SIR 2026 revision status and timeline')}
          className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 hover:border-orange-500 whitespace-nowrap"
        >
          📋 SIR 2026 Schedule
        </button>
        <button
          onClick={() => handleSend('How do I request Senior Citizen home postal voting?')}
          className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 hover:border-orange-500 whitespace-nowrap"
        >
          ♿ Senior / PwD Home Voting
        </button>
        <button
          onClick={() => handleSend('How do I submit Form 8 for residential address correction?')}
          className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 hover:border-orange-500 whitespace-nowrap"
        >
          ✏️ Form 8 Shifting
        </button>
        <button
          onClick={() => handleSend('How does secret ballot VVPAT verification work?')}
          className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 hover:border-orange-500 whitespace-nowrap"
        >
          🛡️ VVPAT Integrity
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 overflow-y-auto space-y-4 shadow-xs">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-orange-600 text-white rounded-br-none'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>

            {m.role === 'model' && (
              <button
                onClick={() => speakText(m.content, i18n.language)}
                className="mt-1 flex items-center space-x-1.5 text-xs text-slate-400 hover:text-orange-600 transition-colors p-1"
              >
                <Volume2 className="w-4 h-4 text-orange-500" />
                <span>Listen Aloud (TTS)</span>
              </button>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
            <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
            <span>Civic Assistant is formulating response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask any question about electoral rolls, candidates, or polling booths..."
          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        <button
          type="button"
          onClick={handleMicToggle}
          className={`p-3 rounded-xl border transition-colors ${
            isRecording
              ? 'bg-red-600 text-white border-red-600 animate-pulse'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:text-orange-600'
          }`}
          title={isRecording ? 'Stop Recording' : 'Voice Input (Microphone)'}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md flex items-center space-x-2 text-sm"
        >
          <Send className="w-4 h-4" />
          <span>Ask</span>
        </button>
      </div>
    </div>
  );
}
