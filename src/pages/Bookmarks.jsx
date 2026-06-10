import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Bookmarks() {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = auth.currentUser?.uid;

  const fetchBookmarks = async () => {
    try {
      const snap = await getDocs(collection(db, `users/${userId}/bookmarks`));
      const bookmarkData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const enriched = [];
      for (const bm of bookmarkData) {
        try {
          const qDoc = await getDoc(doc(db, "questions", bm.questionId));
          if (qDoc.exists()) {
            enriched.push({
              ...bm,
              question: { id: qDoc.id, ...qDoc.data() },
            });
          }
        } catch (e) {
          enriched.push({ ...bm, question: null });
        }
      }

      enriched.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      setBookmarks(enriched);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchBookmarks();
    }
  }, [userId]);

  const handleRemoveBookmark = async (bmId) => {
    const confirmRemove = window.confirm("Remove this question from bookmarks?");
    if (confirmRemove) {
      try {
        await deleteDoc(doc(db, `users/${userId}/bookmarks`, bmId));
        setBookmarks(prev => prev.filter(b => b.id !== bmId));
      } catch (e) {
        alert("Error: " + e.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="center-indicator">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          &larr; Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 className="section-title" style={{ margin: 0 }}>🔖 Bookmarks</h1>
          <span 
            className="q-badge" 
            style={{ backgroundColor: 'var(--warning)', color: '#ffffff', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}
          >
            {bookmarks.length}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {bookmarks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: '48px' }}>🔖</span>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '12px' }}>No bookmarks yet</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Bookmark questions during tests to review them here later.</p>
          </div>
        ) : (
          bookmarks.map((bm, idx) => {
            const q = bm.question;
            if (!q) return null;
            return (
              <div key={bm.id} className="test-question-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--warning-light)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: '900', 
                      color: 'var(--warning)',
                      fontSize: '12px'
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Saved {bm.savedAt ? new Date(bm.savedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleRemoveBookmark(bm.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                  >
                    ✕ Remove
                  </button>
                </div>

                <p className="test-q-text" style={{ marginBottom: '16px' }}>{q.text}</p>
                {q.imageUrl && <img src={q.imageUrl} className="test-image" alt="Question Resource" />}

                <div className="test-option-list">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const isCorrectOpt = q.correctOption === opt;
                    return (
                      <div 
                        key={opt} 
                        className="test-option-btn" 
                        style={{ 
                          borderColor: isCorrectOpt ? 'var(--success)' : 'var(--border-light)',
                          backgroundColor: isCorrectOpt ? 'var(--success-light)' : '#f8fafc',
                          cursor: 'default'
                        }}
                      >
                        <div 
                          className="option-radio-box"
                          style={{ 
                            backgroundColor: isCorrectOpt ? 'var(--success)' : '#e2e8f0',
                            color: isCorrectOpt ? '#ffffff' : 'var(--text-muted)'
                          }}
                        >
                          {opt}
                        </div>
                        <span className="option-value-text">{q.options?.[opt]}</span>
                        {isCorrectOpt && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontWeight: 'bold' }}>✓ Correct Option</span>}
                      </div>
                    );
                  })}
                </div>

                {q.solution && (
                  <div style={{ marginTop: '20px', backgroundColor: 'var(--primary-light)', padding: '16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
                    <p style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '13px', marginBottom: '4px' }}>💡 Solution Explanation</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.5' }}>{q.solution}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
