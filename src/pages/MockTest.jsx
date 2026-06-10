import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function MockTest() {
  const { seriesId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [userRank, setUserRank] = useState({ rank: 0, total: 0 });
  const [rankings, setRankings] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);

  // Timer — isTimed: admin-defined; null means no timer
  const [isTimed, setIsTimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        // Fetch test series details
        const seriesSnap = await getDocs(query(collection(db, "testSeries")));
        const curSeries = seriesSnap.docs.find(d => d.id === seriesId);
        if (curSeries) {
          const seriesData = curSeries.data();
          setTitle(seriesData.title);
          // Read admin-defined timer config
          const timedEnabled = seriesData.isTimed === true;
          const adminDuration = seriesData.duration; // in minutes
          setIsTimed(timedEnabled);
          if (timedEnabled && adminDuration) {
            setTimeLeft(Number(adminDuration) * 60); // convert to seconds
          } else {
            setTimeLeft(null); // no timer
          }
        }

        // Fetch questions
        const q = query(collection(db, "questions"), where("testSeriesId", "==", seriesId));
        const qSnap = await getDocs(q);
        const qData = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuestions(qData);
        setStartTime(Date.now());

        // Fetch bookmarks
        if (userId) {
          const bmSnap = await getDocs(collection(db, `users/${userId}/bookmarks`));
          const bmIds = new Set(bmSnap.docs.map(d => d.id));
          setBookmarkedIds(bmIds);
        }

        // Check for existing attempt
        if (userId) {
          const attemptQuery = query(
            collection(db, "userTests"),
            where("userId", "==", userId),
            where("testSeriesId", "==", seriesId)
          );
          const attemptSnap = await getDocs(attemptQuery);
          if (!attemptSnap.empty) {
            const attemptDoc = attemptSnap.docs[0].data();
            setAnswers(attemptDoc.answers || {});
            setScore(attemptDoc.score || 0);
            setIsSubmitted(true);
            calculateAndFetchRankings(attemptDoc.score || 0);
          }
        }
      } catch (error) {
        console.error("Error fetching mock test data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTestData();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [seriesId, userId]);

  // Start timer only for admin-timed tests
  useEffect(() => {
    if (isTimed && timeLeft !== null && questions.length > 0 && !isSubmitted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [isTimed, timeLeft !== null, questions.length, isSubmitted]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft < 60) return '#ef4444';
    if (timeLeft < 300) return '#f59e0b';
    return '#10b981';
  };

  const handleSelectOption = (qId, option) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const calculateAndFetchRankings = async (currentScore) => {
    setRankingLoading(true);
    try {
      const q = query(collection(db, "userTests"), where("testSeriesId", "==", seriesId));
      const qSnap = await getDocs(q);
      const submissions = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const userBestScores = {};
      const currentUid = auth.currentUser?.uid;
      userBestScores[currentUid] = { userId: currentUid, score: currentScore, submittedAt: new Date().toISOString(), timeTakenSeconds: 0 };

      submissions.forEach(sub => {
        const uid = sub.userId;
        if (!userBestScores[uid] || sub.score > userBestScores[uid].score) {
          userBestScores[uid] = sub;
        }
      });

      const uniqueSubmissions = Object.values(userBestScores);

      const resolvedList = [];
      for (const sub of uniqueSubmissions) {
        try {
          const uDoc = await getDoc(doc(db, "users", sub.userId));
          const name = uDoc.exists() ? (uDoc.data().name || uDoc.data().email || 'Student') : 'Student';
          resolvedList.push({
            ...sub,
            studentName: name
          });
        } catch (e) {
          resolvedList.push({
            ...sub,
            studentName: 'Student'
          });
        }
      }

      resolvedList.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (a.timeTakenSeconds || Infinity) - (b.timeTakenSeconds || Infinity);
      });

      const myIndex = resolvedList.findIndex(sub => sub.userId === currentUid);
      const myRank = myIndex !== -1 ? myIndex + 1 : 1;

      setUserRank({ rank: myRank, total: resolvedList.length });
      setRankings(resolvedList);
    } catch (error) {
      console.error("Error calculating test rankings: ", error);
    } finally {
      setRankingLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTakenSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    let calculatedScore = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctOption) {
        calculatedScore += 4;
      } else if (answers[q.id]) {
        calculatedScore -= 1;
      }
    });
    setScore(calculatedScore);
    setIsSubmitted(true);

    try {
      await addDoc(collection(db, "userTests"), {
        userId: auth.currentUser?.uid,
        testSeriesId: seriesId,
        score: calculatedScore,
        maxScore: questions.length * 4,
        answers: answers,
        timeTakenSeconds: timeTakenSeconds,
        submittedAt: new Date().toISOString()
      });
      calculateAndFetchRankings(calculatedScore);
    } catch (err) {
      console.error("Error saving score", err);
      calculateAndFetchRankings(calculatedScore);
    }
  };

  const confirmSubmit = () => {
    const unanswered = questions.length - Object.keys(answers).length;
    const confirmText = unanswered > 0
      ? `You have ${unanswered} unanswered question(s). Submit anyway?`
      : 'Are you sure you want to submit?';
    if (window.confirm(confirmText)) {
      handleSubmit();
    }
  };

  const toggleBookmark = async (questionId) => {
    const bmRef = doc(db, `users/${userId}/bookmarks`, questionId);
    try {
      if (bookmarkedIds.has(questionId)) {
        await deleteDoc(bmRef);
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
      } else {
        await setDoc(bmRef, {
          questionId,
          testSeriesId: seriesId,
          savedAt: new Date().toISOString()
        });
        setBookmarkedIds(prev => new Set(prev).add(questionId));
      }
    } catch (e) {
      console.error("Bookmark error:", e);
    }
  };

  if (loading) {
    return (
      <div className="center-indicator">
        <div className="spinner"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="center-indicator">
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>No questions available in this test yet.</p>
        <button onClick={() => navigate(-1)} className="auth-btn" style={{ width: '150px' }}>Go Back</button>
      </div>
    );
  }

  // Results + Review mode
  if (isSubmitted) {
    if (showReview) {
      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button 
              onClick={() => setShowReview(false)} 
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}
            >
              &larr; Results Summary
            </button>
            <h1 className="section-title">Solution Review</h1>
            <div style={{ width: '60px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {questions.map((q, idx) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correctOption;
              const isUnanswered = !userAns;
              return (
                <div key={q.id} className="test-question-box" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span 
                      className="q-badge"
                      style={{ 
                        backgroundColor: isUnanswered ? 'var(--border-light)' : isCorrect ? 'var(--success-light)' : 'var(--danger-light)',
                        color: isUnanswered ? 'var(--text-muted)' : isCorrect ? 'var(--success)' : 'var(--danger)'
                      }}
                    >
                      {isUnanswered ? 'Skipped' : isCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Q{idx + 1}</span>
                  </div>

                  <div className="q-badge-bar">
                    <span className="q-badge" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>{q.subject || 'Physics'}</span>
                    <span className={`q-badge ${q.difficulty === 'Easy' ? 'badge-neet' : q.difficulty === 'Hard' ? 'badge-board' : 'badge-jee'}`}>
                      {q.difficulty || 'Medium'}
                    </span>
                    <span className="q-badge" style={{ backgroundColor: 'var(--border-light)', color: 'var(--text-muted)' }}>
                      +{q.marks || 4}/{q.negativeMarks !== undefined ? q.negativeMarks : -1}
                    </span>
                  </div>

                  <p className="test-q-text" style={{ marginBottom: '16px' }}>{q.text}</p>
                  {q.imageUrl && <img src={q.imageUrl} className="test-image" alt="Question" />}

                  <div className="test-option-list">
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const isCorrectOpt = q.correctOption === opt;
                      const isUserOpt = userAns === opt;
                      let optionBorder = 'var(--border-light)';
                      let optionBg = '#f8fafc';
                      if (isCorrectOpt) {
                        optionBorder = 'var(--success)';
                        optionBg = 'var(--success-light)';
                      } else if (isUserOpt && !isCorrectOpt) {
                        optionBorder = 'var(--danger)';
                        optionBg = 'var(--danger-light)';
                      }

                      return (
                        <div 
                          key={opt}
                          className="test-option-btn"
                          style={{ borderColor: optionBorder, backgroundColor: optionBg, cursor: 'default' }}
                        >
                          <div 
                            className="option-radio-box"
                            style={{ 
                              backgroundColor: isCorrectOpt ? 'var(--success)' : isUserOpt ? 'var(--danger)' : '#e2e8f0',
                              color: '#ffffff'
                            }}
                          >
                            {opt}
                          </div>
                          <span className="option-value-text">{q.options?.[opt]}</span>
                          {isCorrectOpt && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontWeight: 'bold' }}>✓</span>}
                          {isUserOpt && !isCorrectOpt && <span style={{ marginLeft: 'auto', color: 'var(--danger)', fontWeight: 'bold' }}>✗</span>}
                        </div>
                      );
                    })}
                  </div>

                  {!!q.solution && (
                    <div style={{ marginTop: '20px', backgroundColor: 'var(--primary-light)', padding: '16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
                      <p style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '13px', marginBottom: '4px' }}>💡 Solution Explanation</p>
                      <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.5' }}>{q.solution}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const correctCount = questions.filter(q => answers[q.id] === q.correctOption).length;
    const wrongCount = questions.filter(q => answers[q.id] && answers[q.id] !== q.correctOption).length;
    const skippedCount = questions.length - correctCount - wrongCount;
    const pct = Math.round((score / (questions.length * 4)) * 100);

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="auth-card" style={{ maxWidth: '540px', padding: '40px' }}>
          <h2 className="auth-title">Test Completed! 🎉</h2>
          <p className="auth-subtitle" style={{ marginBottom: '14px' }}>{title}</p>

          <h1 style={{ fontSize: '48px', fontWeight: '900', color: 'var(--primary)', marginBottom: '4px' }}>
            {score} / {questions.length * 4}
          </h1>
          <p style={{ fontSize: '18px', fontWeight: '700', color: '#6366f1', marginBottom: '24px' }}>
            {pct}% Score
          </p>

          <div style={{ backgroundColor: 'var(--primary-light)', padding: '12px 24px', borderRadius: 'var(--radius-lg)', border: '1.5px solid hsl(var(--primary-hue), 75%, 85%)', marginBottom: '24px' }}>
            {rankingLoading ? (
              <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 'bold' }}>Calculating Standings...</span>
            ) : (
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-dark)' }}>
                🏆 Your Rank: #{userRank.rank} / {userRank.total}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '24px', width: '100%', justifyContent: 'center', marginBottom: '28px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--success)' }}>{correctCount}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>Correct</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--danger)' }}>{wrongCount}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>Wrong</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-muted)' }}>{skippedCount}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>Skipped</div>
            </div>
          </div>

          <button 
            type="button" 
            className="auth-btn" 
            style={{ marginBottom: '12px', backgroundColor: '#eef2ff', color: 'var(--primary)', border: '1.5px solid var(--border-focus)' }}
            onClick={() => setShowRankModal(true)}
          >
            🏆 View Test Leaderboard
          </button>

          <button 
            type="button" 
            className="auth-btn" 
            style={{ marginBottom: '12px' }}
            onClick={() => setShowReview(true)}
          >
            📖 View Solutions
          </button>

          <button 
            type="button" 
            className="auth-btn" 
            style={{ backgroundColor: '#64748b', boxShadow: 'none' }}
            onClick={() => navigate('/')}
          >
            Back to Dashboard
          </button>
        </div>

        {/* Test Standings Modal */}
        {showRankModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-head">
                <div className="modal-title-box">
                  <h3 className="modal-main-title">Test Standings 🏆</h3>
                  <p className="modal-sub-title">{title}</p>
                </div>
                <button className="modal-close-trigger" onClick={() => setShowRankModal(false)}>✕</button>
              </div>

              <div className="modal-scroller">
                {rankings.map((item, idx) => {
                  const isMe = item.userId === auth.currentUser?.uid;
                  return (
                    <div key={item.userId} className={`standing-row ${isMe ? 'standing-row-me' : ''}`}>
                      <span className="standing-rank-num">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <span className="standing-student-name">
                        {item.studentName} {isMe ? '(You)' : ''}
                      </span>
                      <span className="standing-score-val">{item.score} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="section-title" style={{ maxWidth: '70%', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{title}</h1>
        {isTimed && timeLeft !== null ? (
          <div style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', backgroundColor: `${getTimerColor()}15`, border: `1px solid ${getTimerColor()}` }}>
            <span style={{ fontSize: '15px', fontWeight: '900', color: getTimerColor() }}>⏱️ {formatTime(timeLeft)}</span>
          </div>
        ) : (
          <div style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', border: '1px solid var(--border-focus)' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary)' }}>📝 Practice Mode</span>
          </div>
        )}
      </div>

      <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-light)', borderRadius: '2px', marginBottom: '10px' }}>
        <div style={{ height: '100%', backgroundColor: 'var(--primary)', borderRadius: '2px', width: `${((currentIdx + 1) / questions.length) * 100}%` }}></div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textAlign: 'center', marginBottom: '24px' }}>
        Question {currentIdx + 1} of {questions.length} • {answeredCount} Answered
      </p>

      <div className="test-simulator-layout">
        {/* Left: Active Question card */}
        <div className="test-question-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>QUESTION DETAIL</span>
            <button 
              onClick={() => toggleBookmark(currentQ.id)} 
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
            >
              {bookmarkedIds.has(currentQ.id) ? '🔖' : '📎'}
            </button>
          </div>

          <div className="q-badge-bar">
            <span className="q-badge" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>{currentQ.subject || 'Physics'}</span>
            <span className={`q-badge ${currentQ.difficulty === 'Easy' ? 'badge-neet' : currentQ.difficulty === 'Hard' ? 'badge-board' : 'badge-jee'}`}>
              {currentQ.difficulty || 'Medium'}
            </span>
            <span className="q-badge" style={{ backgroundColor: 'var(--border-light)', color: 'var(--text-muted)' }}>
              +{currentQ.marks || 4}/{currentQ.negativeMarks !== undefined ? currentQ.negativeMarks : -1}
            </span>
          </div>

          <p className="test-q-text">{currentQ.text}</p>
          {currentQ.imageUrl && <img src={currentQ.imageUrl} className="test-image" alt="Question Resource" />}

          <div className="test-option-list">
            {['A', 'B', 'C', 'D'].map(opt => (
              <div 
                key={opt}
                className={`test-option-btn ${answers[currentQ.id] === opt ? 'selected' : ''}`}
                onClick={() => handleSelectOption(currentQ.id, opt)}
              >
                <div className="option-radio-box">{opt}</div>
                <span className="option-value-text">{currentQ.options?.[opt]}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
            <button 
              className="auth-btn" 
              style={{ flex: 1, marginRight: '16px', backgroundColor: '#64748b', boxShadow: 'none' }}
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
            >
              &larr; Previous
            </button>

            {currentIdx === questions.length - 1 ? (
              <button className="auth-btn" style={{ flex: 1, backgroundColor: 'var(--success)', boxShadow: 'none' }} onClick={confirmSubmit}>
                Submit Test ✓
              </button>
            ) : (
              <button className="auth-btn" style={{ flex: 1 }} onClick={() => setCurrentIdx(prev => prev + 1)}>
                Next &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Right Sidebar dot navigator */}
        <div className="test-sidebar-box">
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '14px' }}>Navigator</h3>
          <div className="navigation-dots-grid">
            {questions.map((q, idx) => (
              <div 
                key={q.id}
                className={`nav-dot ${currentIdx === idx ? 'current' : ''} ${answers[q.id] ? 'answered' : ''}`}
                onClick={() => setCurrentIdx(idx)}
              >
                {idx + 1}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <button className="auth-btn" style={{ backgroundColor: 'var(--danger)', width: '100%', boxShadow: 'none' }} onClick={confirmSubmit}>
              Submit Paper
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
