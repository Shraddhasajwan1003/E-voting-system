import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { UserPlus, FileText, Camera, CheckCircle, AlertCircle, RefreshCw, MapPin, HeartHandshake, ShieldCheck } from 'lucide-react';
import Webcam from 'react-webcam';
import { SCHEDULED_LANGUAGES } from '../data/languages';
import { API_BASE_URL } from '../api';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    aadhaar_last4: '',
    address: '',
    city: '',
    state: '',
    date_of_birth: '',
    gender: 'Male',
    preferred_language: 'en',
    disability_type: '',
    needs_wheelchair: false,
    needs_braille_audio: false,
    password: '',
    confirmPassword: '',
  });

  const [isSeniorDetected, setIsSeniorDetected] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [epicNumber, setEpicNumber] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [priorityPassCode, setPriorityPassCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    setLoadingStates(true);
    fetch(`${API_BASE_URL}/api/auth/states`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setStates(data);
      })
      .catch((err) => {
        console.error('Error fetching states:', err);
      })
      .finally(() => setLoadingStates(false));
  }, []);

  useEffect(() => {
    if (formData.state) {
      setLoadingCities(true);
      fetch(`${API_BASE_URL}/api/auth/cities?state=${formData.state}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setCities(data);
        })
        .catch((err) => console.error('Error fetching cities:', err))
        .finally(() => setLoadingCities(false));
    } else {
      setCities([]);
    }
  }, [formData.state]);

  // Detect Senior Citizen from Date of Birth
  useEffect(() => {
    if (formData.date_of_birth) {
      const birth = new Date(formData.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      setIsSeniorDetected(age >= 60);
    } else {
      setIsSeniorDetected(false);
    }
  }, [formData.date_of_birth]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setCameraActive(false);
    }
  }, [webcamRef]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'state') {
      setFormData({ ...formData, state: value, city: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.aadhaar_last4.length !== 4) {
      return setError('Aadhaar must be exactly 4 digits');
    }

    if (!capturedImage) {
      return setError('Please complete face authentication setup');
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, face_data: capturedImage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setEpicNumber(data.epic_number);
      setTrackingId(data.tracking_id);
      setPriorityPassCode(data.priority_pass_code || '');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-emerald-100 dark:border-emerald-800/40 text-center"
      >
        <div className="inline-flex items-center justify-center p-5 bg-emerald-100 dark:bg-emerald-950/40 rounded-full mb-4 shadow-inner text-emerald-600">
          <CheckCircle className="w-14 h-14" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
          Registration Successful!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-xs mb-6">
          Your Form 6 application has been entered into the SIR 2026 electoral roll.
        </p>

        <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 space-y-3 text-left text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned EPIC Number</span>
            <p className="text-xl font-mono font-extrabold text-orange-600 dark:text-orange-400">{epicNumber}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">SIR 2026 Tracking ID</span>
            <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">{trackingId}</p>
          </div>
          {priorityPassCode && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold block">Senior / PwD Priority Pass</span>
              <p className="text-sm font-mono font-bold text-purple-700 dark:text-purple-300">{priorityPassCode}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-md text-xs"
        >
          Proceed to Voter Login
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-6 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center space-x-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-5">
        <div className="p-3 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-2xl">
          <FileText className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Form 6 — New Voter Registration
          </h2>
          <p className="text-xs text-slate-500">
            Application for inclusion of name in electoral roll under SIR 2026
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 text-red-600 text-xs p-3.5 rounded-xl mb-6 border border-red-200 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Full Name (As per Aadhaar)
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white"
              placeholder="Ramesh Kumar"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('email_address')}
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white"
              placeholder="ramesh@example.com"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              name="date_of_birth"
              required
              value={formData.date_of_birth}
              onChange={handleChange}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white"
            />
            {isSeniorDetected && (
              <span className="text-[10px] font-bold text-emerald-600 mt-0.5 block">
                ✓ Senior Citizen (60+) priority pass eligible
              </span>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl dark:text-white"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Third Gender">Third Gender / Other</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              name="mobile"
              required
              pattern="[0-9]{10}"
              value={formData.mobile}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Aadhaar (Last 4 Digits)
            </label>
            <input
              type="text"
              name="aadhaar_last4"
              required
              maxLength={4}
              pattern="[0-9]{4}"
              value={formData.aadhaar_last4}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white"
              placeholder="1234"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Residential Address
            </label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white"
              placeholder="House No, Street, Landmark"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">State</label>
            <select
              name="state"
              required
              value={formData.state}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl dark:text-white"
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">City</label>
            <select
              name="city"
              required
              disabled={!formData.state}
              value={formData.city}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl dark:text-white"
            >
              <option value="">Select City</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Preferred Language</label>
            <select
              name="preferred_language"
              value={formData.preferred_language}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl dark:text-white"
            >
              {SCHEDULED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.nativeName} ({l.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={6}
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 dark:text-white"
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Accessibility & Assistance Preferences */}
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-800/40 space-y-3">
          <div className="flex items-center space-x-2 text-purple-900 dark:text-purple-200 font-bold">
            <HeartHandshake className="w-4 h-4 text-purple-600" />
            <span>Senior Citizen (60+) & PwD Assistance (Optional)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="needs_wheelchair"
                checked={formData.needs_wheelchair}
                onChange={handleChange}
                className="rounded text-purple-600 w-4 h-4"
              />
              <span className="text-slate-700 dark:text-slate-300">Need Wheelchair / Ramp Assistance</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="needs_braille_audio"
                checked={formData.needs_braille_audio}
                onChange={handleChange}
                className="rounded text-purple-600 w-4 h-4"
              />
              <span className="text-slate-700 dark:text-slate-300">Need Audio Ballot / Braille Assistance</span>
            </label>
          </div>
        </div>

        {/* Live Facial Camera Capture */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-900/40 space-y-3">
          {!cameraActive && !capturedImage ? (
            <>
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Face Verification Photo Capture
              </h3>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Take a clear front-facing webcam photo to verify your identity before accessing the ballot booth on election day.
              </p>
              <button
                type="button"
                onClick={() => setCameraActive(true)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Start Camera
              </button>
            </>
          ) : cameraActive ? (
            <div className="space-y-3 max-w-xs mx-auto">
              {/* @ts-expect-error react-webcam type */}
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'user' }}
                className="w-full rounded-xl border-2 border-orange-500 shadow-md"
              />
              <div className="flex justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCameraActive(false)}
                  className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capture}
                  className="px-5 py-1.5 bg-orange-600 text-white rounded-lg font-bold text-xs"
                >
                  Capture Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-28 h-32 rounded-xl overflow-hidden border-2 border-emerald-500 mx-auto shadow-md">
                <img src={capturedImage!} alt="Captured face" className="w-full h-full object-cover" />
              </div>
              <p className="font-bold text-emerald-600 text-xs">✓ Face Photo Captured</p>
              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null);
                  setCameraActive(true);
                }}
                className="text-[11px] font-bold text-slate-500 hover:underline"
              >
                Retake Photo
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-md text-xs flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Submitting Form 6 Application...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Submit Registration (Form 6)</span>
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
