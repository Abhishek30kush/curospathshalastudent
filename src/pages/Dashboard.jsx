import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, setDoc, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Dashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [testSeries, setTestSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [targetExam, setTargetExam] = useState('IIT-JEE');
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [userAttempts, setUserAttempts] = useState({});

  const userId = auth.currentUser?.uid;
  const userEmail = auth.currentUser?.email;

  const initUser = async () => {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        const defaultData = {
          email: userEmail,
          firstName: '',
          lastName: '',
          name: '',
          dob: '',
          phone: '',
          targetExam: 'IIT-JEE',
          purchasedCourses: [],
          role: 'student',
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, defaultData);
        setUserName('Scholar');
        setTargetExam('IIT-JEE');
        setPurchasedCourses([]);
      } else {
        const data = userDoc.data();
        setUserName(data.firstName || data.name || 'Scholar');
        setTargetExam(data.targetExam || 'IIT-JEE');
        setPurchasedCourses(data.purchasedCourses || []);
      }
    } catch (e) {
      console.error("Error creating/getting user doc:", e);
    }
  };

  const fetchData = async () => {
    try {
      const [coursesSnap, seriesSnap, notifSnap] = await Promise.all([
        getDocs(collection(db, "courses")),
        getDocs(collection(db, "testSeries")),
        getDocs(collection(db, "notifications")),
      ]);

      setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTestSeries(seriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setNotifCount(notifSnap.size);

      // Fetch user test attempts
      if (userId) {
        const attemptsSnap = await getDocs(
          query(collection(db, "userTests"), where("userId", "==", userId))
        );
        const attemptsMap = {};
        attemptsSnap.docs.forEach(doc => {
          const data = doc.data();
          attemptsMap[data.testSeriesId] = data;
        });
        setUserAttempts(attemptsMap);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      initUser();
      fetchData();
    }
  }, [userId]);

  // Filter courses based on targetExam
  const filteredCourses = courses.filter(course => {
    if (course.category) {
      if (['Class 9', 'Class 10', 'Class 11', 'Class 12'].includes(targetExam)) {
        return course.category === targetExam;
      }
      const isJeeMatch = (targetExam === 'JEE' || targetExam === 'IIT-JEE') && (course.category === 'JEE' || course.category === 'IIT-JEE');
      return course.category === targetExam || isJeeMatch || course.category === 'Both';
    }
    
    const titleLower = (course.title || '').toLowerCase();
    const descLower = (course.description || '').toLowerCase();
    
    if (targetExam === 'JEE' || targetExam === 'IIT-JEE') {
      return !titleLower.includes('biology') && !titleLower.includes(' bio') && !descLower.includes('biology');
    } else if (targetExam === 'NEET') {
      return !titleLower.includes('math') && !titleLower.includes('mathematics') && !descLower.includes('math');
    } else {
      const classNum = targetExam.replace('Class ', '');
      return titleLower.includes(`class ${classNum}`) || titleLower.includes(`${classNum}th`);
    }
  });

  // Filter test series based on targetExam
  const filteredTestSeries = testSeries.filter(series => {
    if (['Class 9', 'Class 10', 'Class 11', 'Class 12'].includes(targetExam)) {
      return series.category === targetExam;
    }
    const isJeeMatch = (targetExam === 'JEE' || targetExam === 'IIT-JEE') && (series.category === 'JEE' || series.category === 'IIT-JEE');
    return series.category === targetExam || isJeeMatch;
  });

  const handleCoursePress = (course) => {
    const isPaid = course.price > 0;
    const isPurchased = purchasedCourses.includes(course.id);
    
    if (isPaid && !isPurchased) {
      const confirmBuy = window.confirm(
        `Premium Course 🔒\n\nUnlock this course for ₹${course.price} to access all study materials, notes, and video lectures.\n\nClick OK to proceed to payment.`
      );
      if (confirmBuy) {
        if (course.paymentLink) {
          window.open(course.paymentLink, '_blank');
        } else {
          alert('Please contact support or admin to buy this course.');
        }
      }
    } else {
      navigate(`/course/${course.id}`);
    }
  };

  const getCourseStyle = (title) => {
    const titleLower = (title || '').toLowerCase();
    if (titleLower.includes('physics')) {
      return { bg: '#e0f2fe', text: '#0369a1', emoji: '⚛️', color: '#0ea5e9' };
    } else if (titleLower.includes('chemistry')) {
      return { bg: '#fef3c7', text: '#b45309', emoji: '🧪', color: '#f59e0b' };
    } else if (titleLower.includes('math') || titleLower.includes('calculus') || titleLower.includes('algebra')) {
      return { bg: '#e0e7ff', text: '#4338ca', emoji: '📐', color: '#6366f1' };
    } else if (titleLower.includes('biology') || titleLower.includes('botany') || titleLower.includes('zoology')) {
      return { bg: '#d1fae5', text: '#047857', emoji: '🧬', color: '#10b981' };
    } else if (titleLower.includes('english')) {
      return { bg: '#fae8ff', text: '#86198f', emoji: '📖', color: '#d946ef' };
    } else if (titleLower.includes('history') || titleLower.includes('civics') || titleLower.includes('social') || titleLower.includes('geography')) {
      return { bg: '#ffedd5', text: '#c2410c', emoji: '🌍', color: '#f97316' };
    }
    return { bg: '#f1f5f9', text: '#475569', emoji: '📘', color: '#64748b' };
  };

  const quickActions = [
    { label: 'Study Material', icon: '📚', path: '/study-materials', bg: '#eef2ff', text: '#4f46e5' },
    { label: 'Test History', icon: '📊', path: '/history', bg: '#ecfdf5', text: '#059669' },
    { label: 'Leaderboard', icon: '🏆', path: '/leaderboard', bg: '#fffbeb', text: '#d97706' },
    { label: 'Bookmarks', icon: '🔖', path: '/bookmarks', bg: '#fff1f2', text: '#e11d48' },
    { label: 'Profile', icon: '👤', path: '/profile', bg: '#faf5ff', text: '#7c3aed' },
  ];

  if (loading) {
    return (
      <div className="center-indicator">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Banner Header */}
      <div className="portal-header">
        <div className="header-main-row">
          <div className="greeting-info">
            <h1 className="greeting-text">Hello, {userName}! 👋</h1>
            <p className="subgreeting-text">Let's learn something new today.</p>
          </div>
          <button className="notif-button" onClick={() => navigate('/notifications')}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            {notifCount > 0 && (
              <span className="notif-count-badge">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
        </div>

        <div className="header-badge-card">
          <div>
            <div className="badge-label">Target Class / Stream</div>
            <div className="badge-value">{targetExam === 'JEE' ? 'IIT-JEE' : targetExam}</div>
          </div>
          <div className="badge-status">Active</div>
        </div>
      </div>

      {/* Quick Actions Scroll Bar */}
      <div className="section-wrapper">
        <h2 className="section-title" style={{ marginBottom: '14px' }}>Quick Actions</h2>
        <div className="quick-actions-bar">
          {quickActions.map((action, idx) => (
            <div 
              key={idx} 
              className="quick-action-card" 
              style={{ backgroundColor: action.bg }}
              onClick={() => navigate(action.path)}
            >
              <div className="quick-icon-wrapper">
                <span>{action.icon}</span>
              </div>
              <span className="quick-card-label" style={{ color: action.text }}>{action.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Available Courses */}
      <div className="section-wrapper">
        <div className="section-head-row">
          <h2 className="section-title">Available Courses</h2>
          <span className="section-count">{filteredCourses.length} total</span>
        </div>
        <div className="course-grid">
          {filteredCourses.map(course => {
            const isPaid = course.price > 0;
            const isPurchased = purchasedCourses.includes(course.id);
            const courseStyle = getCourseStyle(course.title);
            return (
              <div 
                key={course.id} 
                className="course-card" 
                onClick={() => handleCoursePress(course)}
              >
                <div className="course-icon-bg" style={{ backgroundColor: courseStyle.bg }}>
                  {isPaid && !isPurchased ? (
                    <div className="lock-overlay">🔒</div>
                  ) : (
                    <span style={{ color: courseStyle.text }}>{courseStyle.emoji}</span>
                  )}
                </div>
                <div className="course-info">
                  <h3 className="course-title">{course.title}</h3>
                  <div className="price-badge-row">
                    {isPaid ? (
                      <span className={`price-badge ${isPurchased ? 'price-unlocked' : 'price-locked'}`}>
                        {isPurchased ? 'Unlocked' : `₹${course.price}`}
                      </span>
                    ) : (
                      <span className="price-badge price-free">Free</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredCourses.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px' }}>
              No courses available for your stream yet.
            </div>
          )}
        </div>
      </div>

      {/* Mock Test Series */}
      <div className="section-wrapper" style={{ marginTop: '20px' }}>
        <div className="section-head-row">
          <h2 className="section-title">Mock Test Series</h2>
          <span className="section-count">{filteredTestSeries.length} active</span>
        </div>
        <div className="test-list-grid">
          {filteredTestSeries.map(series => {
            const attempt = userAttempts[series.id];
            return (
              <div 
                key={series.id} 
                className="test-row-card"
                onClick={() => navigate(`/test/${series.id}`)}
              >
                <div className="test-row-header">
                  <span className={`test-category-badge ${(series.category === 'NEET') ? 'badge-neet' : 'badge-jee'}`}>
                    {series.category === 'JEE' ? 'IIT-JEE' : series.category}
                  </span>
                  <span className="test-action-trigger" style={attempt ? { color: 'var(--success)' } : {}}>
                    {attempt ? `Attempted (${attempt.score} pts) ↗` : 'Start →'}
                  </span>
                </div>
                <h3 className="test-row-title">{series.title}</h3>
                {series.description && <p className="test-row-desc">{series.description}</p>}
                
                <div className="test-row-footer">
                  <span className="test-footer-detail">⏱️ 180 Mins</span>
                  <span className="test-footer-detail">❓ MCQ Pattern</span>
                </div>
              </div>
            );
          })}
          {filteredTestSeries.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px' }}>
              No test series available for your stream yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
