import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Helper to generate consistent gradient background based on name hash
const getAvatarColor = (name = 'Anonymous') => {
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-violet-500 to-fuchsia-600',
    'from-pink-500 to-rose-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-600',
    'from-blue-500 to-sky-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', phone: '', targetExam: 'IIT-JEE' });
  const [saving, setSaving] = useState(false);
  const [testStats, setTestStats] = useState({ total: 0, avgScore: 0, bestScore: 0 });

  const userId = auth.currentUser?.uid;
  const userEmail = auth.currentUser?.email;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          const parts = (data.name || '').trim().split(/\s+/);
          const fName = data.firstName || parts[0] || '';
          const lName = data.lastName || parts.slice(1).join(' ') || '';
          setForm({
            firstName: fName,
            lastName: lName,
            dob: data.dob || '',
            phone: data.phone || '',
            targetExam: data.targetExam || 'IIT-JEE'
          });
        } else {
          const newProfile = {
            firstName: '', lastName: '', name: '',
            email: userEmail, dob: '', phone: '',
            targetExam: 'IIT-JEE', role: 'student',
            createdAt: new Date().toISOString()
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
          setForm({ firstName: '', lastName: '', dob: '', phone: '', targetExam: 'IIT-JEE' });
        }

        // Fetch test stats
        const q = query(collection(db, "userTests"), where("userId", "==", userId));
        const snap = await getDocs(q);
        const tests = snap.docs.map(d => d.data());
        if (tests.length > 0) {
          const totalScore = tests.reduce((sum, t) => sum + (t.score || 0), 0);
          setTestStats({
            total: tests.length,
            avgScore: Math.round(totalScore / tests.length),
            bestScore: Math.max(...tests.map(t => t.score || 0)),
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId, userEmail]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dob.trim() || !form.phone.trim()) {
      alert('Please fill in all fields (First Name, Last Name, DOB, Phone)');
      return;
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(form.phone.trim())) {
      alert('Contact number must be exactly 10 digits');
      return;
    }
    setSaving(true);
    try {
      const mergedName = `${form.firstName.trim()} ${form.lastName.trim()}`;
      const updatedData = {
        ...profile,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        name: mergedName,
        dob: form.dob.trim(),
        phone: form.phone.trim(),
        targetExam: form.targetExam,
      };
      await setDoc(doc(db, "users", userId), updatedData, { merge: true });
      setProfile(updatedData);
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      signOut(auth);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading profile...</span>
      </div>
    );
  }

  const displayName = profile?.firstName || profile?.lastName
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
    : (profile?.name || 'Student');

  const avatarGradient = getAvatarColor(displayName);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto dark:text-slate-100 min-h-screen">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="group p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Account Profile</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Manage your stream, details and performance summary.</p>
        </div>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Avatar & Key Stats (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            {/* Avatar Circle */}
            <div className="relative mt-4 mb-5 group">
              <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-md scale-110"></div>
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-extrabold text-3xl shadow-md border-4 border-white dark:border-slate-900 group-hover:scale-105 transition-transform duration-200`}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Profile Info */}
            <h2 className="text-xl font-extrabold text-slate-850 dark:text-slate-50 truncate max-w-full leading-snug">
              {displayName}
            </h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 font-bold truncate max-w-full mt-1.5 opacity-90">
              {userEmail}
            </p>
            
            <span className="inline-flex items-center gap-1 mt-4 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/80 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 rounded-lg uppercase tracking-wider border border-slate-200/20 dark:border-slate-700/20">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'recently'}
            </span>

            {/* Test Stats Panel */}
            <div className="w-full flex flex-col gap-3 mt-8">
              {/* Total Tests */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200/40 dark:border-slate-850/60">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Tests</span>
                </div>
                <span className="text-lg font-black text-slate-850 dark:text-slate-100">{testStats.total}</span>
              </div>

              {/* Avg Score (With correct spacing between score and pts suffix) */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200/40 dark:border-slate-850/60">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg Score</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{testStats.avgScore}</span>
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">pts</span>
                </div>
              </div>

              {/* Best Score */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-200/40 dark:border-slate-850/60">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Best Score</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{testStats.bestScore}</span>
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">pts</span>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 w-full flex items-center justify-center gap-2 border border-rose-200/50 dark:border-rose-950/30 bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-100/60 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-extrabold py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider active:scale-98 transition-all cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out Account
            </button>
          </div>
        </div>

        {/* Right Column: Profile Form Details (8 cols) */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700"></div>

            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
              <h2 className="text-lg font-extrabold text-slate-850 dark:text-slate-50">Profile Details</h2>
              <button
                onClick={() => setEditing(!editing)}
                className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
                  editing 
                    ? 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/10'
                }`}
              >
                {editing ? (
                  <>✕ Cancel</>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit Details
                  </>
                )}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="flex flex-col gap-5">
                {/* Names */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">First Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="e.g. Rahul"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Last Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="e.g. Kumar"
                      required
                    />
                  </div>
                </div>

                {/* DOB & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Date of Birth</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-xs font-bold text-slate-800 dark:text-slate-200 transition-all"
                      value={form.dob}
                      onChange={(e) => setForm({ ...form, dob: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-450 transition-all"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      maxLength={10}
                      placeholder="10-digit contact number"
                      required
                    />
                  </div>
                </div>

                {/* Target Exam stream toggle */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Target Stream / Exam</label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {['IIT-JEE', 'NEET'].map(opt => (
                      <div
                        key={opt}
                        className={`py-3 text-center rounded-2xl border text-xs font-bold cursor-pointer transition-all active:scale-98 ${
                          form.targetExam === opt 
                            ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-600/15' 
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                        onClick={() => setForm({ ...form, targetExam: opt })}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {['Class 9', 'Class 10', 'Class 11', 'Class 12'].map(cls => (
                      <div
                        key={cls}
                        className={`py-2.5 text-center rounded-xl border text-[11px] font-bold cursor-pointer transition-all active:scale-98 ${
                          form.targetExam === cls 
                            ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-600/15' 
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                        onClick={() => setForm({ ...form, targetExam: cls })}
                      >
                        {cls}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button 
                  type="submit" 
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-2xl hover:shadow-lg shadow-indigo-500/10 transition active:scale-98 mt-2 cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-6">
                {[
                  { 
                    label: 'First Name', 
                    value: profile?.firstName || 'Not set',
                    icon: (
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )
                  },
                  { 
                    label: 'Last Name', 
                    value: profile?.lastName || 'Not set',
                    icon: (
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )
                  },
                  { 
                    label: 'Date of Birth', 
                    value: profile?.dob ? new Date(profile.dob).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set',
                    icon: (
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )
                  },
                  { 
                    label: 'Contact Number', 
                    value: profile?.phone || 'Not set',
                    icon: (
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    )
                  },
                  { 
                    label: 'Target Class / Stream', 
                    value: profile?.targetExam === 'JEE' ? 'IIT-JEE' : (profile?.targetExam || 'IIT-JEE'),
                    icon: (
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    )
                  },
                  { 
                    label: 'Registered Email', 
                    value: userEmail,
                    icon: (
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )
                  },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0 last:pb-0">
                    <span className="p-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/30 dark:border-slate-800/40 rounded-xl flex-shrink-0">
                      {icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {label}
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 word-break-break-word">
                        {value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
