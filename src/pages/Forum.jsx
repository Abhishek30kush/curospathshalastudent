import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, getDoc, orderBy, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';

// Helper to generate consistent avatar color based on name hash
const getAvatarColor = (name = 'Anonymous') => {
  const colors = [
    { bg: '#eef2ff', text: '#4f46e5', border: '#818cf8' },
    { bg: '#f5f3ff', text: '#7c3aed', border: '#a78bfa' },
    { bg: '#fdf2f8', text: '#db2777', border: '#f472b6' },
    { bg: '#ecfdf5', text: '#059669', border: '#34d399' },
    { bg: '#fff7ed', text: '#ea580c', border: '#fb923c' },
    { bg: '#eff6ff', text: '#2563eb', border: '#60a5fa' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Helper for relative timestamps
const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Subject badge color mapping
const subjectStyles = {
  Physics: { bg: 'var(--course-physics-bg)', text: 'var(--course-physics-text)', emoji: '⚛️' },
  Chemistry: { bg: 'var(--course-chemistry-bg)', text: 'var(--course-chemistry-text)', emoji: '🧪' },
  Mathematics: { bg: 'var(--course-math-bg)', text: 'var(--course-math-text)', emoji: '📐' },
  Biology: { bg: 'var(--course-biology-bg)', text: 'var(--course-biology-text)', emoji: '🧬' },
  General: { bg: 'var(--course-default-bg)', text: 'var(--course-default-text)', emoji: '💬' },
};

export default function Forum() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New thread form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newSubject, setNewSubject] = useState('General');

  // New reply state
  const [replyText, setReplyText] = useState('');

  const [activeCategory, setActiveCategory] = useState('All');
  const userId = auth.currentUser?.uid;
  const userEmail = auth.currentUser?.email;

  const categories = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'General'];

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'forums'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const threadList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setThreads(threadList);
    } catch (e) {
      console.error("Error fetching threads:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchReplies = async (threadId) => {
    setRepliesLoading(true);
    try {
      const q = query(collection(db, `forums/${threadId}/replies`), orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      const replyList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReplies(replyList);
    } catch (e) {
      console.error("Error fetching replies:", e);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleSelectThread = (thread) => {
    setSelectedThread(thread);
    fetchReplies(thread.id);
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;

    try {
      let authorName = userEmail ? userEmail.split('@')[0] : 'Student';
      if (userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          authorName = userDoc.data().name || authorName;
        }
      }

      const newThread = {
        title: newTitle.trim(),
        body: newBody.trim(),
        subject: newSubject,
        authorId: userId,
        authorName: authorName,
        createdAt: new Date().toISOString(),
        repliesCount: 0
      };

      await addDoc(collection(db, 'forums'), newThread);
      setNewTitle('');
      setNewBody('');
      setNewSubject('General');
      setShowCreateModal(false);
      fetchThreads();
    } catch (e) {
      console.error("Error creating thread:", e);
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThread) return;

    try {
      let authorName = userEmail ? userEmail.split('@')[0] : 'Student';
      if (userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          authorName = userDoc.data().name || authorName;
        }
      }

      const newReply = {
        body: replyText.trim(),
        authorId: userId,
        authorName: authorName,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, `forums/${selectedThread.id}/replies`), newReply);

      await updateDoc(doc(db, 'forums', selectedThread.id), {
        repliesCount: increment(1)
      });

      setSelectedThread(prev => ({
        ...prev,
        repliesCount: (prev.repliesCount || 0) + 1
      }));

      setThreads(prevThreads =>
        prevThreads.map(t =>
          t.id === selectedThread.id
            ? { ...t, repliesCount: (t.repliesCount || 0) + 1 }
            : t
        )
      );

      setReplyText('');
      fetchReplies(selectedThread.id);
    } catch (e) {
      console.error("Error posting reply:", e);
    }
  };

  // Filter threads based on category AND search input
  const filteredThreads = threads.filter(thread => {
    const matchesCategory = activeCategory === 'All' || thread.subject === activeCategory;
    const matchesSearch =
      thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (thread.authorName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      {/* Header Banner */}
      <div className="portal-header">
        <div className="header-main-row">
          <div className="greeting-info">
            <h1 className="greeting-text">💬 Doubt Discussion Forum</h1>
            <p className="subgreeting-text">
              Stuck on a concept? Post your doubt to study with peers or check solutions from mentors.
            </p>
          </div>
          <button
            className="forum-post-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <span>＋</span> Post a New Doubt
          </button>
        </div>
      </div>

      {/* Main Forum Grid */}
      <div className="forum-layout">
        {/* Left Column: Search, Categories & Threads */}
        <div className="forum-left-col">
          {/* Search Bar */}
          <div className="forum-search-wrap">
            <span className="forum-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search doubts by title, keyword, or author..."
              className="forum-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="forum-search-clear"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="forum-categories-bar">
            {categories.map(cat => {
              const isActive = activeCategory === cat;
              const style = subjectStyles[cat];
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setSelectedThread(null); }}
                  className={`forum-cat-btn ${isActive ? 'active' : ''}`}
                  style={isActive ? {} : style ? { backgroundColor: style.bg, color: style.text } : {}}
                >
                  {style?.emoji || '📋'} {cat}
                </button>
              );
            })}
          </div>

          {/* Threads List */}
          <div className="forum-threads-list">
            {loading ? (
              <div className="center-indicator">
                <div className="spinner"></div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading threads...</span>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="forum-empty-state">
                <span style={{ fontSize: '40px', opacity: 0.5 }}>🔍</span>
                <h4>No doubts found</h4>
                <p>Try adjusting your keywords, switching categories, or create a new thread.</p>
              </div>
            ) : (
              filteredThreads.map(thread => {
                const isSelected = selectedThread?.id === thread.id;
                const style = subjectStyles[thread.subject] || subjectStyles.General;
                const avatarColor = getAvatarColor(thread.authorName);

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`forum-thread-card ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="forum-thread-row">
                      <div
                        className="forum-avatar"
                        style={{
                          backgroundColor: avatarColor.bg,
                          color: avatarColor.text,
                          border: `2px solid ${avatarColor.border}`
                        }}
                      >
                        {(thread.authorName || 'S')[0].toUpperCase()}
                      </div>
                      <div className="forum-thread-content">
                        <div className="forum-thread-meta">
                          <span
                            className="forum-subject-badge"
                            style={{ backgroundColor: style.bg, color: style.text }}
                          >
                            {thread.subject}
                          </span>
                          <span className="forum-time">
                            🕐 {formatRelativeTime(thread.createdAt)}
                          </span>
                        </div>
                        <h3 className="forum-thread-title">{thread.title}</h3>
                        <div className="forum-thread-footer">
                          <span className="forum-author">By {thread.authorName}</span>
                          <span className="forum-replies-count">
                            💬 {thread.repliesCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Thread Detail & Replies */}
        <div className="forum-right-col">
          {selectedThread ? (
            <div className="forum-detail-card">
              {/* Top gradient accent */}
              <div className="forum-detail-accent"></div>

              {/* Thread header info */}
              <div className="forum-detail-header">
                <div className="forum-detail-author-row">
                  <div
                    className="forum-avatar forum-avatar-lg"
                    style={{
                      backgroundColor: getAvatarColor(selectedThread.authorName).bg,
                      color: getAvatarColor(selectedThread.authorName).text,
                      border: `2.5px solid ${getAvatarColor(selectedThread.authorName).border}`
                    }}
                  >
                    {(selectedThread.authorName || 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="forum-detail-name">{selectedThread.authorName}</h4>
                    <div className="forum-detail-info">
                      <span>Asked {formatRelativeTime(selectedThread.createdAt)}</span>
                      <span className="forum-dot-sep">•</span>
                      <span
                        className="forum-subject-badge"
                        style={{
                          backgroundColor: (subjectStyles[selectedThread.subject] || subjectStyles.General).bg,
                          color: (subjectStyles[selectedThread.subject] || subjectStyles.General).text,
                        }}
                      >
                        {selectedThread.subject}
                      </span>
                    </div>
                  </div>
                </div>

                <h2 className="forum-detail-title">{selectedThread.title}</h2>

                <div className="forum-detail-body">
                  {selectedThread.body}
                </div>
              </div>

              {/* Replies Section */}
              <div className="forum-replies-section">
                <h3 className="forum-replies-heading">
                  Responses
                  <span className="forum-replies-badge">{replies.length}</span>
                </h3>

                {repliesLoading ? (
                  <div className="center-indicator" style={{ minHeight: '100px' }}>
                    <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading solutions...</span>
                  </div>
                ) : replies.length === 0 ? (
                  <div className="forum-empty-replies">
                    <span style={{ fontSize: '28px', opacity: 0.5 }}>💡</span>
                    <h5>No answers yet</h5>
                    <p>Be the first to provide a clear explanation and help out!</p>
                  </div>
                ) : (
                  <div className="forum-replies-list">
                    {replies.map(reply => {
                      const isAuthorOfThread = reply.authorId === selectedThread.authorId;
                      const replyAvatar = getAvatarColor(reply.authorName);
                      return (
                        <div key={reply.id} className="forum-reply-item">
                          <div className="forum-reply-header">
                            <div className="forum-reply-author">
                              <div
                                className="forum-avatar forum-avatar-sm"
                                style={{
                                  backgroundColor: replyAvatar.bg,
                                  color: replyAvatar.text,
                                  border: `1.5px solid ${replyAvatar.border}`
                                }}
                              >
                                {(reply.authorName || 'S')[0].toUpperCase()}
                              </div>
                              <span className="forum-reply-name">{reply.authorName}</span>
                              {isAuthorOfThread && (
                                <span className="forum-author-tag">Author</span>
                              )}
                            </div>
                            <span className="forum-reply-time">
                              {formatRelativeTime(reply.createdAt)}
                            </span>
                          </div>
                          <p className="forum-reply-body">{reply.body}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handlePostReply} className="forum-reply-form">
                <textarea
                  rows="2"
                  required
                  placeholder="Provide a step-by-step helpful solution..."
                  className="forum-reply-textarea"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className={`forum-reply-send ${replyText.trim() ? 'active' : ''}`}
                >
                  ↗ Send
                </button>
              </form>
            </div>
          ) : (
            <div className="forum-empty-detail">
              <div className="forum-empty-icon-wrap">
                <span style={{ fontSize: '48px' }}>💬</span>
              </div>
              <h3>Select a doubt thread</h3>
              <p>Choose an active conversation from the left feed to explore explanations, or post a helpful reply.</p>
              <button
                className="forum-post-btn"
                onClick={() => setShowCreateModal(true)}
              >
                Ask a Question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Thread Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" style={{ alignSelf: 'center', borderRadius: 'var(--radius-xl)', maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title-box">
                <h3 className="modal-main-title">Create New Doubt</h3>
                <p className="modal-sub-title">Ask our student and mentor community for help.</p>
              </div>
              <button className="modal-close-trigger" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateThread} className="forum-create-form">
              <div className="form-group">
                <label className="form-label">Subject Category</label>
                <select
                  className="form-input"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {categories.slice(1).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Title / Brief Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., How does lens power change when submerged in water?"
                  className="form-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Describe your Doubt</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Describe your equation, write the question prompt, or explain exactly where you got stuck..."
                  className="form-input"
                  style={{ resize: 'none', lineHeight: 1.6 }}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                />
              </div>

              <button type="submit" className="auth-btn" style={{ marginTop: '8px' }}>
                🚀 Post to Forum
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
