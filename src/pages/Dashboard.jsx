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

  // Streak and DPP states
  const [streakCount, setStreakCount] = useState(0);
  const [lastDppDate, setLastDppDate] = useState('');
  const [dppQuestion, setDppQuestion] = useState(null);
  const [selectedDppOption, setSelectedDppOption] = useState('');
  const [dppAnswerSubmitted, setDppAnswerSubmitted] = useState(false);
  const [dppAnswerFeedback, setDppAnswerFeedback] = useState('');

  const userId = auth.currentUser?.uid;
  const userEmail = auth.currentUser?.email;

  const initUser = async () => {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

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
          streakCount: 1,
          lastActiveDate: todayStr,
          lastDppDate: '',
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, defaultData);
        setUserName('Scholar');
        setTargetExam('IIT-JEE');
        setPurchasedCourses([]);
        setStreakCount(1);
        setLastDppDate('');
      } else {
        const data = userDoc.data();
        setUserName(data.firstName || data.name || 'Scholar');
        setTargetExam(data.targetExam || 'IIT-JEE');
        setPurchasedCourses(data.purchasedCourses || []);

        // Streak tracking logic
        let currentStreak = data.streakCount || 0;
        const lastActive = data.lastActiveDate || '';
        if (lastActive !== todayStr) {
          if (lastActive === yesterdayStr) {
            currentStreak += 1;
          } else {
            currentStreak = 1;
          }
          await setDoc(userRef, { lastActiveDate: todayStr, streakCount: currentStreak }, { merge: true });
        }
        setStreakCount(currentStreak);
        setLastDppDate(data.lastDppDate || '');
      }
    } catch (e) {
      console.error("Error creating/getting user doc:", e);
    }
  };

  const fetchData = async () => {
    try {
      const [coursesSnap, seriesSnap, notifSnap, qSnap] = await Promise.all([
        getDocs(collection(db, "courses")),
        getDocs(collection(db, "testSeries")),
        getDocs(collection(db, "notifications")),
        getDocs(collection(db, "questions")),
      ]);

      setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTestSeries(seriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => s.status !== 'draft'));
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

      // Pick DPP Question of the Day (deterministic by date)
      const allQ = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (allQ.length > 0) {
        const d = new Date();
        const dateHash = d.getFullYear() + d.getMonth() + d.getDate();
        const selectedDpp = allQ[dateHash % allQ.length];
        setDppQuestion(selectedDpp);
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
      return { bg: 'var(--course-physics-bg)', text: 'var(--course-physics-text)', emoji: '⚛️', color: '#0ea5e9' };
    } else if (titleLower.includes('chemistry')) {
      return { bg: 'var(--course-chemistry-bg)', text: 'var(--course-chemistry-text)', emoji: '🧪', color: '#f59e0b' };
    } else if (titleLower.includes('math') || titleLower.includes('calculus') || titleLower.includes('algebra')) {
      return { bg: 'var(--course-math-bg)', text: 'var(--course-math-text)', emoji: '📐', color: '#6366f1' };
    } else if (titleLower.includes('biology') || titleLower.includes('botany') || titleLower.includes('zoology')) {
      return { bg: 'var(--course-biology-bg)', text: 'var(--course-biology-text)', emoji: '🧬', color: '#10b981' };
    } else if (titleLower.includes('english')) {
      return { bg: 'var(--course-english-bg)', text: 'var(--course-english-text)', emoji: '📖', color: '#d946ef' };
    } else if (titleLower.includes('history') || titleLower.includes('civics') || titleLower.includes('social') || titleLower.includes('geography')) {
      return { bg: 'var(--course-history-bg)', text: 'var(--course-history-text)', emoji: '🌍', color: '#f97316' };
    }
    return { bg: 'var(--course-default-bg)', text: 'var(--course-default-text)', emoji: '📘', color: '#64748b' };
  };

  const quickActions = [
    { label: 'Study Material', icon: '📚', path: '/study-materials', bg: 'var(--qa-study-bg)', text: 'var(--qa-study-text)' },
    { label: 'Papers & Bundles', icon: '📄', path: '/papers', bg: 'var(--qa-forum-bg)', text: 'var(--qa-forum-text)' },
    { label: 'Test History', icon: '📊', path: '/history', bg: 'var(--qa-history-bg)', text: 'var(--qa-history-text)' },
    { label: 'Leaderboard', icon: '🏆', path: '/leaderboard', bg: 'var(--qa-leaderboard-bg)', text: 'var(--qa-leaderboard-text)' },
    { label: 'Flashcards', icon: '🎴', path: '/flashcards', bg: 'var(--qa-bookmarks-bg)', text: 'var(--qa-bookmarks-text)' },
    { label: 'Bookmarks', icon: '🔖', path: '/bookmarks', bg: 'var(--qa-bookmarks-bg)', text: 'var(--qa-bookmarks-text)' },
    { label: 'Profile', icon: '👤', path: '/profile', bg: 'var(--qa-profile-bg)', text: 'var(--qa-profile-text)' },
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

      {/* Streak & DPP Section */}
      <div className="section-wrapper" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
        {/* Streak Card */}
        <div style={{
          flex: 1, minWidth: '200px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          borderRadius: '16px', padding: '20px', color: '#fff',
          display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <span style={{ fontSize: '40px' }}>🔥</span>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1 }}>{streakCount}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, opacity: 0.9 }}>Day Streak</div>
            <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>Keep it up!</div>
          </div>
        </div>

        {/* DPP Card */}
        {dppQuestion && (
          <div style={{
            flex: 2, minWidth: '280px',
            background: 'var(--card-bg, #fff)',
            border: '1.5px solid var(--border-color, #e2e8f0)',
            borderRadius: '16px', padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-muted)' }}>📅 DPP — Question of the Day</span>
              {dppAnswerSubmitted && (
                <span style={{
                  fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px',
                  background: dppAnswerFeedback === 'correct' ? '#dcfce7' : '#fee2e2',
                  color: dppAnswerFeedback === 'correct' ? '#16a34a' : '#dc2626'
                }}>
                  {dppAnswerFeedback === 'correct' ? '✓ Correct!' : '✗ Wrong'}
                </span>
              )}
            </div>
            <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '12px', lineHeight: 1.5 }}>
              {dppQuestion.text}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['A', 'B', 'C', 'D'].map(opt => {
                let bg = 'var(--option-bg, #f8fafc)';
                let border = '1px solid var(--border-color, #e2e8f0)';
                let color = 'var(--text-main)';
                if (dppAnswerSubmitted) {
                  if (opt === dppQuestion.correctOption) { bg = '#dcfce7'; border = '1.5px solid #16a34a'; color = '#16a34a'; }
                  else if (opt === selectedDppOption) { bg = '#fee2e2'; border = '1.5px solid #dc2626'; color = '#dc2626'; }
                } else if (opt === selectedDppOption) {
                  bg = '#eff6ff'; border = '1.5px solid #3b82f6'; color = '#1d4ed8';
                }
                return (
                  <button
                    key={opt}
                    disabled={dppAnswerSubmitted}
                    onClick={() => setSelectedDppOption(opt)}
                    style={{
                      background: bg, border, color, borderRadius: '10px',
                      padding: '8px 12px', fontSize: '13px', fontWeight: 600,
                      cursor: dppAnswerSubmitted ? 'default' : 'pointer', textAlign: 'left'
                    }}
                  >
                    <strong>{opt}.</strong> {dppQuestion.options?.[opt] || ''}
                  </button>
                );
              })}
            </div>
            {!dppAnswerSubmitted && (
              <button
                onClick={() => {
                  if (!selectedDppOption) return;
                  const correct = selectedDppOption === dppQuestion.correctOption;
                  setDppAnswerSubmitted(true);
                  setDppAnswerFeedback(correct ? 'correct' : 'wrong');
                }}
                disabled={!selectedDppOption}
                style={{
                  marginTop: '12px', background: '#6366f1', color: '#fff',
                  border: 'none', borderRadius: '10px', padding: '8px 20px',
                  fontWeight: 700, fontSize: '13px',
                  cursor: selectedDppOption ? 'pointer' : 'not-allowed',
                  opacity: selectedDppOption ? 1 : 0.5
                }}
              >
                Submit Answer
              </button>
            )}
          </div>
        )}
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
