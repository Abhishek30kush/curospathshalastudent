import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTarget, setUserTarget] = useState('');

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const currentUserRef = doc(db, "users", currentUserId);
        const currentUserDoc = await getDoc(currentUserRef);
        let targetExamVal = 'IIT-JEE';
        if (currentUserDoc.exists()) {
          targetExamVal = currentUserDoc.data().targetExam || 'IIT-JEE';
        }
        setUserTarget(targetExamVal === 'JEE' ? 'IIT-JEE' : targetExamVal);
        const isJeeStream = (val) => val === 'JEE' || val === 'IIT-JEE';

        const testsSnap = await getDocs(collection(db, "userTests"));
        const allTests = testsSnap.docs.map(d => d.data());

        const userScores = {};
        allTests.forEach(test => {
          const uid = test.userId;
          if (!userScores[uid]) {
            userScores[uid] = { totalScore: 0, testCount: 0, bestScore: 0 };
          }
          userScores[uid].totalScore += (test.score || 0);
          userScores[uid].testCount += 1;
          userScores[uid].bestScore = Math.max(userScores[uid].bestScore, test.score || 0);
        });

        const userIds = Object.keys(userScores);
        const leaderData = [];
        for (const uid of userIds) {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              const studentTarget = data.targetExam || 'IIT-JEE';
              
              const isMatch = (isJeeStream(targetExamVal) && isJeeStream(studentTarget)) || (targetExamVal === studentTarget);
              
              if (isMatch) {
                leaderData.push({
                  userId: uid,
                  name: data.firstName || data.name || data.email || 'Student',
                  email: data.email || '',
                  ...userScores[uid],
                  avgScore: Math.round(userScores[uid].totalScore / userScores[uid].testCount),
                });
              }
            }
          } catch (e) {
            // ignore
          }
        }

        leaderData.sort((a, b) => b.totalScore - a.totalScore);
        setLeaders(leaderData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUserId) {
      fetchLeaderboard();
    }
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="center-indicator">
        <div className="spinner"></div>
      </div>
    );
  }

  const getMedalEmoji = (rank) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return '';
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          &larr; Back
        </button>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>Leaderboard 🏆</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
            {userTarget} Student Standings
          </p>
        </div>
      </div>

      {/* 3D Podium Layout */}
      {leaders.length >= 3 && (
        <div className="podium-container">
          {/* 2nd Place (Silver) */}
          <div className="podium-column podium-silver">
            <div className="podium-avatar">
              <span>{leaders[1].name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="podium-name">{leaders[1].name}</div>
            <div className="podium-pts">{leaders[1].totalScore} pts</div>
            <div className="podium-pillar">2</div>
          </div>

          {/* 1st Place (Gold) */}
          <div className="podium-column podium-gold" style={{ marginTop: '-24px' }}>
            <div className="podium-avatar" style={{ transform: 'scale(1.1)' }}>
              <span>{leaders[0].name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="podium-name" style={{ fontWeight: '800' }}>{leaders[0].name}</div>
            <div className="podium-pts" style={{ fontWeight: '900' }}>{leaders[0].totalScore} pts</div>
            <div className="podium-pillar" style={{ height: '120px' }}>1</div>
          </div>

          {/* 3rd Place (Bronze) */}
          <div className="podium-column podium-bronze">
            <div className="podium-avatar">
              <span>{leaders[2].name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="podium-name">{leaders[2].name}</div>
            <div className="podium-pts">{leaders[2].totalScore} pts</div>
            <div className="podium-pillar">3</div>
          </div>
        </div>
      )}

      {/* All standings list */}
      <div style={{ marginTop: '24px' }}>
        <h2 className="section-title" style={{ fontSize: '16px', marginBottom: '16px' }}>All Standings</h2>
        {leaders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: '48px' }}>🏆</span>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '12px' }}>No rankings yet</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Complete mock tests to claim your podium spot!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leaders.map((leader, idx) => {
              const isCurrentUser = leader.userId === currentUserId;
              return (
                <div 
                  key={leader.userId}
                  className={`standing-row ${isCurrentUser ? 'standing-row-me' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                >
                  <div style={{ width: '32px', textAlign: 'center', fontWeight: '800', marginRight: '16px', fontSize: '14px' }}>
                    {idx < 3 ? getMedalEmoji(idx) : `#${idx + 1}`}
                  </div>
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: 'var(--radius-sm)', 
                    backgroundColor: isCurrentUser ? 'var(--primary)' : 'var(--border-light)', 
                    color: isCurrentUser ? '#ffffff' : 'var(--text-main)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: '900', 
                    marginRight: '16px',
                    fontSize: '15px'
                  }}>
                    {leader.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '14px', fontWeight: isCurrentUser ? '800' : '700', color: isCurrentUser ? 'var(--primary-dark)' : 'var(--text-main)' }}>
                      {leader.name} {isCurrentUser ? '(You)' : ''}
                    </h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {leader.testCount} tests • Avg: {leader.avgScore} • Best: {leader.bestScore}
                    </p>
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: isCurrentUser ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {leader.totalScore}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
