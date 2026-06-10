import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import MaterialViewer from './pages/MaterialViewer';
import MockTest from './pages/MockTest';
import TestHistory from './pages/TestHistory';
import Leaderboard from './pages/Leaderboard';
import Bookmarks from './pages/Bookmarks';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import AiMentor from './pages/AiMentor';

const Sidebar = () => {
  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span>🎓</span> Curos Scholar
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-link-icon">🏠</span> Dashboard
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-link-icon">📊</span> Test History
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-link-icon">🏆</span> Leaderboard
        </NavLink>
        <NavLink to="/bookmarks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-link-icon">🔖</span> Bookmarks
        </NavLink>
        <NavLink to="/ai-mentor" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-link-icon">🤖</span> AI Mentor
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-link-icon">👤</span> Profile
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <span>🚪</span> Sign Out
        </button>
      </div>
    </div>
  );
};

const MobileNav = () => {
  return (
    <div className="mobile-nav">
      <NavLink to="/" end className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
        <span className="mobile-nav-icon">🏠</span> Home
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
        <span className="mobile-nav-icon">📊</span> History
      </NavLink>
      <NavLink to="/ai-mentor" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
        <span className="mobile-nav-icon">🤖</span> AI
      </NavLink>
      <NavLink to="/leaderboard" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
        <span className="mobile-nav-icon">🏆</span> Rank
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
        <span className="mobile-nav-icon">👤</span> Profile
      </NavLink>
    </div>
  );
};

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === 'student') {
              setUser(currentUser);
            } else {
              await signOut(auth);
              alert("Access Denied: Please use the administrator panel to sign in.");
              setUser(null);
            }
          } else {
            // Setup default user if doc not found
            setUser(currentUser);
          }
        } catch (e) {
          console.error("Error verifying user role:", e);
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="center-indicator" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/test/:seriesId" element={<MockTest />} />
          <Route path="/course/:courseId" element={<Materials />} />
          <Route path="/view-material" element={<MaterialViewer />} />
          <Route path="/history" element={<TestHistory />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/ai-mentor" element={<AiMentor />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
