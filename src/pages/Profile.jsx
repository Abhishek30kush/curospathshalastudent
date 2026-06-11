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
  const [subjectAccuracy, setSubjectAccuracy] = useState({});

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
            firstName: '',
            lastName: '',
            name: '',
            email: userEmail,
            dob: '',
            phone: '',
            targetExam: 'IIT-JEE',
            role: 'student',
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

          // Subject Breakdown Analysis
          const subjectScores = {};
          tests.forEach(t => {
            if (t.subjectBreakdown) {
              Object.keys(t.subjectBreakdown).forEach(sub => {
                if (!subjectScores[sub]) {
                  subjectScores[sub] = { score: 0, max: 0 };
                }
                subjectScores[sub].score += t.subjectBreakdown[sub].score || 0;
                subjectScores[sub].max += t.subjectBreakdown[sub].max || 0;
              });
            }
          });

          const accuracyMap = {};
          Object.keys(subjectScores).forEach(sub => {
            const max = subjectScores[sub].max;
            const score = Math.max(0, subjectScores[sub].score);
            accuracyMap[sub] = max > 0 ? Math.round((score / max) * 100) : 0;
          });
          setSubjectAccuracy(accuracyMap);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      fetchProfile();
    }
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
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          &larr; Back
        </button>
        <h1 className="section-title" style={{ margin: 0 }}>My Profile</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '28px' }} className="test-simulator-layout">
        {/* Left Side: Avatar & Stats Card */}
        <div>
          <div className="auth-card" style={{ padding: '30px', width: '100%', marginBottom: '20px' }}>
            <div style={{ 
              width: '84px', 
              height: '84px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-light)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: '900', 
              color: 'var(--primary)',
              fontSize: '32px',
              border: '3px solid var(--primary)',
              marginBottom: '16px'
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <h2 className="modal-main-title" style={{ textAlign: 'center' }}>{displayName}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{userEmail}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'recently'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="standing-row" style={{ padding: '16px' }}>
              <span className="standing-student-name" style={{ color: 'var(--text-muted)' }}>Tests Attempted</span>
              <span className="standing-score-val" style={{ fontSize: '18px' }}>{testStats.total}</span>
            </div>
            <div className="standing-row" style={{ padding: '16px' }}>
              <span className="standing-student-name" style={{ color: 'var(--text-muted)' }}>Average Score</span>
              <span className="standing-score-val" style={{ fontSize: '18px' }}>{testStats.avgScore} pts</span>
            </div>
            <div className="standing-row" style={{ padding: '16px' }}>
              <span className="standing-student-name" style={{ color: 'var(--text-muted)' }}>Personal Best</span>
              <span className="standing-score-val" style={{ fontSize: '18px' }}>{testStats.bestScore} pts</span>
            </div>
          </div>

          {Object.keys(subjectAccuracy).length > 0 && (
            <div className="test-question-box" style={{ padding: '24px', marginTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px' }}>📊 Subject Accuracy Analysis</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {Object.keys(subjectAccuracy).map(sub => {
                  const pct = subjectAccuracy[sub];
                  const barColor = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <div key={sub}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-main)' }}>{sub}</span>
                        <span style={{ color: barColor }}>{pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button 
            type="button" 
            className="auth-btn" 
            style={{ marginTop: '24px', backgroundColor: 'var(--danger)', boxShadow: 'none' }}
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>

        {/* Right Side: Form details */}
        <div className="test-question-box" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 className="section-title" style={{ fontSize: '18px' }}>Profile Details</h2>
            <button 
              onClick={() => setEditing(!editing)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {editing ? 'Cancel' : 'Edit Details'}
            </button>
          </div>

          {editing ? (
            <form onSubmit={handleSave} style={{ width: '100%' }}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

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
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Class / Stream</label>
                <div className="target-grid">
                  <div 
                    className={`target-option ${form.targetExam === 'IIT-JEE' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, targetExam: 'IIT-JEE' })}
                  >
                    IIT-JEE
                  </div>
                  <div 
                    className={`target-option ${form.targetExam === 'NEET' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, targetExam: 'NEET' })}
                  >
                    NEET
                  </div>
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
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <div className="form-label">First Name</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px' }}>
                  {profile?.firstName || 'Not set'}
                </div>
              </div>
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <div className="form-label">Last Name</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px' }}>
                  {profile?.lastName || 'Not set'}
                </div>
              </div>
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <div className="form-label">Date of Birth</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px' }}>
                  {profile?.dob || 'Not set'}
                </div>
              </div>
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <div className="form-label">Contact Number</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px' }}>
                  {profile?.phone || 'Not set'}
                </div>
              </div>
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <div className="form-label">Target Class / Stream</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px' }}>
                  {profile?.targetExam === 'JEE' ? 'IIT-JEE' : (profile?.targetExam || 'IIT-JEE')}
                </div>
              </div>
              <div>
                <div className="form-label">Registered Email</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px' }}>
                  {userEmail}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
