import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [phone, setPhone] = useState('');
  const [targetExam, setTargetExam] = useState('IIT-JEE');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateDob = (day, month, year) => {
    if (day && month && year) {
      setDob(`${year}-${month}-${day}`);
    } else {
      setDob('');
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp) {
      if (!firstName.trim() || !lastName.trim() || !dob.trim() || !phone.trim()) {
        setError('All fields are required for Sign Up');
        return;
      }

      const today = new Date();
      const birthDate = new Date(dob);
      if (birthDate.toDateString() === today.toDateString()) {
        setError("Date of Birth cannot be today's date");
        return;
      }
      if (birthDate > today) {
        setError("Date of Birth cannot be in the future");
        return;
      }

      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone.trim())) {
        setError('Contact number must be exactly 10 digits');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        sessionStorage.setItem('signing_up', 'true');
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, "users", cred.user.uid), {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          dob: dob.trim(),
          phone: phone.trim(),
          targetExam: targetExam,
          email: email.trim(),
          role: 'student',
          createdAt: new Date().toISOString()
        });
        sessionStorage.removeItem('signing_up');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      sessionStorage.removeItem('signing_up');
      console.error(err);
      let friendlyMessage = err.message;
      if (
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/invalid-credential'
      ) {
        friendlyMessage = 'Incorrect email or password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Invalid email address format';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already registered';
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">🎓</div>
        <h1 className="auth-title">Curos Pathshala</h1>
        <p className="auth-subtitle">
          {isSignUp ? 'Create your student account to get started' : 'Sign in to access your dashboard'}
        </p>

        {error && <div className="alert-error">⚠️ {error}</div>}

        <form onSubmit={handleAuth} style={{ width: '100%' }}>
          {isSignUp && (
            <>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <div className="dob-row">
                  <select
                    className="dob-select"
                    value={dobDay}
                    onChange={(e) => {
                      setDobDay(e.target.value);
                      updateDob(e.target.value, dobMonth, dobYear);
                    }}
                    required
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => {
                      const d = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
                      return <option key={d} value={d}>{i + 1}</option>;
                    })}
                  </select>
                  <select
                    className="dob-select"
                    value={dobMonth}
                    onChange={(e) => {
                      setDobMonth(e.target.value);
                      updateDob(dobDay, e.target.value, dobYear);
                    }}
                    required
                  >
                    <option value="">Month</option>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => {
                      const val = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
                      return <option key={val} value={val}>{m}</option>;
                    })}
                  </select>
                  <select
                    className="dob-select"
                    value={dobYear}
                    onChange={(e) => {
                      setDobYear(e.target.value);
                      updateDob(dobDay, dobMonth, e.target.value);
                    }}
                    required
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 36 }, (_, i) => {
                      const y = new Date().getFullYear() - 5 - i;
                      return <option key={y} value={`${y}`}>{y}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <input
                  type="tel"
                  className="form-input"
                  placeholder="📞 Contact Number (10 digits)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Choose Target Exam / Class</label>
                <div className="target-grid">
                  <div 
                    className={`target-option ${targetExam === 'IIT-JEE' ? 'active' : ''}`}
                    onClick={() => setTargetExam('IIT-JEE')}
                  >
                    IIT-JEE
                  </div>
                  <div 
                    className={`target-option ${targetExam === 'NEET' ? 'active' : ''}`}
                    onClick={() => setTargetExam('NEET')}
                  >
                    NEET
                  </div>
                </div>
                <div className="target-grid target-grid-4">
                  {['Class 9', 'Class 10', 'Class 11', 'Class 12'].map(cls => (
                    <div 
                      key={cls}
                      className={`target-option ${targetExam === cls ? 'active' : ''}`}
                      onClick={() => setTargetExam(cls)}
                    >
                      {cls}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <input
              type="email"
              className="form-input"
              placeholder="✉️ Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              className="form-input"
              placeholder={isSignUp ? "🔑 Create Password" : "🔑 Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button type="button" className="auth-switch" onClick={toggleMode}>
          {isSignUp ? 'Already have an account? Sign In' : 'New to Curos? Create an Account'}
        </button>
      </div>
    </div>
  );
}
