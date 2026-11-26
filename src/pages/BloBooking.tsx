import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PhoneCall, Calendar, Clock, MapPin, CheckCircle, AlertCircle, RefreshCw, Home, User } from 'lucide-react';
import { API_BASE_URL } from '../api';

export default function BloBooking() {
  const { user, token } = useAuth();
  const [blos, setBlos] = useState<any[]>([]);
  const [selectedBlo, setSelectedBlo] = useState<any | null>(null);

  // Booking Form State
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('10:00 AM - 11:00 AM');
  const [purpose, setPurpose] = useState('Form 8 Address Verification');
  const [isHomeVisit, setIsHomeVisit] = useState(false);
  const [notes, setNotes] = useState('');
  const [bookingStatus, setBookingStatus] = useState<{ success?: string; error?: string }>({});
  const [bookingLoading, setBookingLoading] = useState(false);

  // My Appointments
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlos();
    if (token) {
      loadAppointments();
    }
  }, [token, user]);

  const loadBlos = async () => {
    try {
      const url = user?.constituency
        ? `${API_BASE_URL}/api/sir/blos?constituency=${encodeURIComponent(user.constituency)}`
        : `${API_BASE_URL}/api/sir/blos`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBlos(data);
        if (data.length > 0) setSelectedBlo(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sir/blo-appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAppointments(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setBookingStatus({ error: 'Please login to book a BLO appointment' });
      return;
    }
    if (!selectedBlo) {
      setBookingStatus({ error: 'Please select a BLO' });
      return;
    }

    setBookingLoading(true);
    setBookingStatus({});

    try {
      const res = await fetch(`${API_BASE_URL}/api/sir/blo-appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          blo_id: selectedBlo.id,
          appointment_date: appointmentDate,
          time_slot: timeSlot,
          purpose,
          is_home_visit: isHomeVisit,
          notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment');

      setBookingStatus({ success: 'BLO appointment scheduled successfully!' });
      loadAppointments();
      setNotes('');
    } catch (err: any) {
      setBookingStatus({ error: err.message });
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold">
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Doorstep & Booth Civic Assistance</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Book a Consultation with Booth Level Officer (BLO)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Connect directly with your constituency BLO for electoral roll verification, Form 6/7/8 inquiries, or request Senior Citizen doorstep assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BLO List */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Designated BLO Officers</span>
            <span className="text-xs text-slate-500 font-normal">({blos.length} Available)</span>
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto text-orange-500 mb-2" />
              <span>Loading officers...</span>
            </div>
          ) : blos.length === 0 ? (
            <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border text-center text-xs text-slate-500">
              No designated BLO found for this constituency.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {blos.map((blo) => (
                <div
                  key={blo.id}
                  onClick={() => setSelectedBlo(blo)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedBlo?.id === blo.id
                      ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-500 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{blo.name}</h3>
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">{blo.constituency} · {blo.part_number}</p>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>

                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p className="flex items-center space-x-1 font-mono">
                      <PhoneCall className="w-3 h-3 text-slate-400" />
                      <span>{blo.phone}</span>
                    </p>
                    <p className="flex items-start space-x-1 text-[11px] leading-tight">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="truncate">{blo.office_address}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Schedule Appointment with {selectedBlo ? selectedBlo.name : 'BLO Officer'}
              </h2>
              <p className="text-xs text-slate-500">
                Choose telephonic, booth center, or Senior Citizen doorstep visit.
              </p>
            </div>

            {bookingStatus.success && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{bookingStatus.success}</span>
              </div>
            )}

            {bookingStatus.error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{bookingStatus.error}</span>
              </div>
            )}

            <form onSubmit={handleBook} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
                  >
                    <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM (Morning)</option>
                    <option value="11:30 AM - 12:30 PM">11:30 AM - 12:30 PM (Mid-day)</option>
                    <option value="02:30 PM - 03:30 PM">02:30 PM - 03:30 PM (Afternoon)</option>
                    <option value="04:30 PM - 05:30 PM">04:30 PM - 05:30 PM (Evening)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Consultation Purpose
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
                >
                  <option value="Form 8 Address Verification">Form 8 Address & Demographic Verification</option>
                  <option value="Form 6 New Voter Guidance">Form 6 First-time Voter Application Guidance</option>
                  <option value="EPIC Card Non-Delivery">EPIC Physical Card Non-Delivery / Query</option>
                  <option value="Senior Citizen Home Postal Ballot">Senior Citizen (60+) / PwD Home Postal Voting</option>
                  <option value="General Roll Inquiry">General Electoral Roll Inquiry</option>
                </select>
              </div>

              {/* Senior / PwD Home Visit Checkbox */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="homeVisit"
                  checked={isHomeVisit}
                  onChange={(e) => setIsHomeVisit(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <label htmlFor="homeVisit" className="text-xs text-purple-900 dark:text-purple-200 cursor-pointer">
                  <span className="font-bold block">Request Doorstep Home Visit (Senior Citizen / PwD)</span>
                  <span className="text-[11px] text-purple-700 dark:text-purple-300">
                    The Booth Level Officer will visit your registered residence with necessary verification registers.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mention landmark or specific assistance requirements..."
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {bookingLoading ? 'Scheduling...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>

          {/* User's Scheduled Appointments */}
          {token && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                My Scheduled Appointments ({appointments.length})
              </h3>

              {appointments.length === 0 ? (
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border text-center text-xs text-slate-400">
                  No appointments scheduled.
                </div>
              ) : (
                <div className="space-y-2">
                  {appointments.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{app.purpose}</p>
                        <p className="text-slate-500 mt-0.5">
                          With <strong>{app.blo_name}</strong> ({app.constituency})
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-1">
                          📅 {new Date(app.appointment_date).toLocaleDateString()} · ⏰ {app.time_slot}
                          {app.is_home_visit ? ' · 🏠 Home Visit' : ''}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full font-bold self-start sm:self-auto text-[11px]">
                        {app.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
