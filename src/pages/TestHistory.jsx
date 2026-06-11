import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TestHistory() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Standings modal state
  const [rankings, setRankings] = useState([]);
  const [userRank, setUserRank] = useState({ rank: 0, total: 0 });
  const [rankingLoading, setRankingLoading] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const [selectedSeriesName, setSelectedSeriesName] = useState('');

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(collection(db, "userTests"), where("userId", "==", userId));
        const snap = await getDocs(q);
        const testsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Fetch series names
        const seriesIds = [...new Set(testsData.map(t => t.testSeriesId))];
        const seriesMap = {};
        for (const sid of seriesIds) {
          try {
            const sDoc = await getDoc(doc(db, "testSeries", sid));
            if (sDoc.exists()) seriesMap[sid] = sDoc.data().title;
          } catch (e) {
            // ignore
          }
        }

        const enriched = testsData.map(t => ({
          ...t,
          seriesName: seriesMap[t.testSeriesId] || 'Unknown Series',
        }));

        enriched.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        setTests(enriched);
      } catch (error) {
        console.error("Error fetching test history:", error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      fetchHistory();
    }
  }, [userId]);

  const handleViewLeaderboard = async (seriesId, seriesName, testScore) => {
    setSelectedSeriesName(seriesName);
    setShowRankModal(true);
    setRankingLoading(true);
    try {
      const q = query(collection(db, "userTests"), where("testSeriesId", "==", seriesId));
      const qSnap = await getDocs(q);
      const submissions = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const userBestScores = {};
      const currentUid = auth.currentUser?.uid;

      submissions.forEach(sub => {
        const uid = sub.userId;
        if (!userBestScores[uid] || sub.score > userBestScores[uid].score) {
          userBestScores[uid] = sub;
        }
      });

      if (!userBestScores[currentUid]) {
        userBestScores[currentUid] = { userId: currentUid, score: testScore, submittedAt: new Date().toISOString() };
      }

      const uniqueSubmissions = Object.values(userBestScores);

      const resolvedList = [];
      for (const sub of uniqueSubmissions) {
        if (sub.studentName) {
          resolvedList.push(sub);
        } else {
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
      }

      resolvedList.sort((a, b) => b.score - a.score);

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

  const getScoreColor = (score, max) => {
    const pct = max > 0 ? score / max : 0;
    if (pct >= 0.8) return 'var(--success)';
    if (pct >= 0.5) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getGrade = (score, max) => {
    const pct = max > 0 ? (score / max) * 100 : 0;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    return 'D';
  };

  if (loading) {
    return (
      <div className="center-indicator">
        <div className="spinner"></div>
      </div>
    );
  }

  const totalTests = tests.length;
  const avgScore = totalTests > 0
    ? Math.round(tests.reduce((s, t) => s + (t.score || 0), 0) / totalTests)
    : 0;
  const avgPercent = totalTests > 0
    ? Math.round(tests.reduce((s, t) => s + ((t.score || 0) / (t.maxScore || 1)) * 100, 0) / totalTests)
    : 0;

  const chartData = [...tests].reverse().map(t => {
    const pct = t.maxScore > 0 ? Math.round((t.score / t.maxScore) * 100) : 0;
    return {
      name: t.seriesName.length > 12 ? t.seriesName.substring(0, 10) + '..' : t.seriesName,
      percentage: pct,
      score: t.score,
      maxScore: t.maxScore
    };
  });

  return (
    <div className="dark:text-slate-100">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          &larr; Back
        </button>
        <h1 className="section-title" style={{ margin: 0 }}>Test History</h1>
      </div>

      {/* Progress Chart */}
      {totalTests > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">📈 Progress Analysis</h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700/50" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--text-main)' }}
                />
                <Line type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {totalTests > 0 && (
        <div style={{ 
          display: 'flex', 
          backgroundColor: 'var(--primary)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '24px', 
          marginBottom: '28px', 
          color: '#ffffff', 
          boxShadow: 'var(--shadow-md)' 
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '950' }}>{totalTests}</div>
            <div style={{ fontSize: '12px', color: 'hsl(var(--primary-hue), 80%, 90%)', fontWeight: '700', marginTop: '4px' }}>Total Tests</div>
          </div>
          <div style={{ width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.25)', alignSelf: 'stretch' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '950' }}>{avgScore}</div>
            <div style={{ fontSize: '12px', color: 'hsl(var(--primary-hue), 80%, 90%)', fontWeight: '700', marginTop: '4px' }}>Avg Score</div>
          </div>
          <div style={{ width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.25)', alignSelf: 'stretch' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '950' }}>{avgPercent}%</div>
            <div style={{ fontSize: '12px', color: 'hsl(var(--primary-hue), 80%, 90%)', fontWeight: '700', marginTop: '4px' }}>Avg Percentage</div>
          </div>
        </div>
      )}

      {/* Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>No tests taken yet</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Take a mock test to see your history here.</p>
          </div>
        ) : (
          tests.map((test, idx) => {
            const pct = test.maxScore > 0 ? Math.round((test.score / test.maxScore) * 100) : 0;
            const scoreColor = getScoreColor(test.score, test.maxScore);
            return (
              <div 
                key={test.id} 
                className="test-row-card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/test/${test.testSeriesId}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px', gap: '12px' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--primary-light)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: '900', 
                    color: 'var(--primary)',
                    fontSize: '13px'
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-main)' }}>{test.seriesName}</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {test.submittedAt ? new Date(test.submittedAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <div style={{ 
                    padding: '6px 12px', 
                    borderRadius: 'var(--radius-sm)', 
                    backgroundColor: `${scoreColor}15`, 
                    color: scoreColor, 
                    fontWeight: '900',
                    fontSize: '16px'
                  }}>
                    {getGrade(test.score, test.maxScore)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: scoreColor }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: scoreColor, minWidth: '90px', textAlign: 'right' }}>
                    {test.score}/{test.maxScore} ({pct}%)
                  </span>
                </div>

                <div className="card-footer" style={{ borderTop: '1px solid var(--border-light)', marginTop: '12px', paddingTop: '8px', textAlign: 'center' }}>
                  <span className="leaderboard-text" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700' }}>
                    📖 Tap to View Solutions & Leaderboard ↗
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Standings Modal */}
      {showRankModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-head">
              <div className="modal-title-box">
                <h3 className="modal-main-title">Test Standings 🏆</h3>
                <p className="modal-sub-title">{selectedSeriesName}</p>
              </div>
              <button className="modal-close-trigger" onClick={() => setShowRankModal(false)}>✕</button>
            </div>

            {rankingLoading ? (
              <div className="center-indicator" style={{ minHeight: '150px' }}>
                <div className="spinner"></div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Fetching Standings...</span>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
