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
  const [phone, setPhone] = useState('');
  const [targetExam, setTargetExam] = useState('IIT-JEE');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
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
                <input
                  type="date"
                  className="form-input"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
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
              placeholder="🔑 Password"
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
