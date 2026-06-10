import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const snap = await getDocs(collection(db, "notifications"));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
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
          <h1 className="section-title" style={{ margin: 0 }}>Notifications</h1>
          <span 
            className="q-badge" 
            style={{ backgroundColor: 'var(--primary)', color: '#ffffff', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}
          >
            {notifications.length}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: '48px' }}>🔔</span>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '12px' }}>No notifications</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>You'll see announcements from your institution here.</p>
          </div>
        ) : (
          notifications.map((n, idx) => (
            <div 
              key={n.id} 
              className="standing-row"
              style={{ 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                borderLeft: idx === 0 ? '4px solid var(--primary)' : '4px solid var(--border-light)',
                backgroundColor: idx === 0 ? 'var(--primary-light)' : 'var(--bg-card)',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: idx === 0 ? 'var(--primary)' : 'var(--border-light)' 
                  }} 
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {getTimeAgo(n.createdAt)}
                </span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '6px' }}>{n.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{n.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
