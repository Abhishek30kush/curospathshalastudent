import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

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
      <div className="center-indicator">
        <div className="spinner"></div>
      </div>
    );
  }

  const displayName = profile?.firstName || profile?.lastName
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
    : (profile?.name || 'Student');

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', flexShrink: 0 }}
        >
          ← Back
        </button>
        <h1 className="section-title" style={{ margin: 0 }}>My Profile</h1>
      </div>

      {/* Responsive 2-col grid (stacks on mobile) */}
      <div className="profile-grid">

        {/* ── Left Column: Avatar + Stats ── */}
        <div className="profile-avatar-card">
          {/* Avatar circle */}
          <div className="profile-avatar-circle">
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* Name & email block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px', wordBreak: 'break-word' }}>
              {displayName}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{userEmail}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'recently'}
            </p>

            {/* Stats row (shown inside name block on tablet) */}
            <div className="profile-stats-col">
              <div className="profile-stat-row">
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tests</span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>{testStats.total}</span>
              </div>
              <div className="profile-stat-row">
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Score</span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary)' }}>{testStats.avgScore} pts</span>
              </div>
              <div className="profile-stat-row">
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Best</span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--success)' }}>{testStats.bestScore} pts</span>
              </div>
            </div>

            {/* Sign out */}
            <button
              type="button"
              className="auth-btn"
              style={{ marginTop: '16px', backgroundColor: 'var(--danger)', boxShadow: 'none' }}
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* ── Right Column: Profile Form ── */}
        <div className="profile-form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="section-title" style={{ fontSize: '18px', margin: 0 }}>Profile Details</h2>
            <button
              onClick={() => setEditing(!editing)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}
            >
              {editing ? 'Cancel' : '✏️ Edit Details'}
            </button>
          </div>

          {editing ? (
            <form onSubmit={handleSave} style={{ width: '100%' }}>
              {/* Name row */}
              <div className="profile-field-row">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="First name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              {/* DOB + Phone row */}
              <div className="profile-field-row">
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    maxLength={10}
                    placeholder="10-digit number"
                    required
                  />
                </div>
              </div>

              {/* Target exam */}
              <div className="form-group">
                <label className="form-label">Target Class / Stream</label>
                <div className="target-grid" style={{ marginBottom: '10px' }}>
                  {['IIT-JEE', 'NEET'].map(opt => (
                    <div
                      key={opt}
                      className={`target-option ${form.targetExam === opt ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, targetExam: opt })}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
                <div className="target-grid target-grid-4">
                  {['Class 9', 'Class 10', 'Class 11', 'Class 12'].map(cls => (
                    <div
                      key={cls}
                      className={`target-option ${form.targetExam === cls ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, targetExam: cls })}
                    >
                      {cls}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { label: 'First Name', value: profile?.firstName || 'Not set' },
                { label: 'Last Name', value: profile?.lastName || 'Not set' },
                { label: 'Date of Birth', value: profile?.dob || 'Not set' },
                { label: 'Contact Number', value: profile?.phone || 'Not set' },
                { label: 'Target Class / Stream', value: profile?.targetExam === 'JEE' ? 'IIT-JEE' : (profile?.targetExam || 'IIT-JEE') },
                { label: 'Registered Email', value: userEmail },
              ].map(({ label, value }) => (
                <div key={label} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
                  <div className="form-label">{label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px', wordBreak: 'break-word' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
