import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, getDoc, orderBy, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';

// Helper to generate consistent gradient background based on name hash
const getAvatarColor = (name = 'Anonymous') => {
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-violet-500 to-fuchsia-600',
    'from-pink-500 to-rose-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-600',
    'from-blue-500 to-sky-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
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

// Subject config mapping for rich badges, theme colors, and icons
const categoryConfig = {
  All: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    accent: 'indigo',
    bgClass: 'bg-indigo-50/80 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-400',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50'
  },
  Physics: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    accent: 'sky',
    bgClass: 'bg-sky-50/80 border-sky-200 text-sky-700 dark:bg-sky-950/30 dark:border-sky-800 dark:text-sky-400',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50'
  },
  Chemistry: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5a2 2 0 002.828 0l5-5A2 2 0 0015 10.172V5l-1-1H10z" />
      </svg>
    ),
    accent: 'amber',
    bgClass: 'bg-amber-50/80 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800/80 dark:text-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50'
  },
  Mathematics: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    accent: 'violet',
    bgClass: 'bg-violet-50/80 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200/50 dark:border-violet-800/50'
  },
  Biology: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    accent: 'emerald',
    bgClass: 'bg-emerald-50/80 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50'
  },
  General: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    accent: 'slate',
    bgClass: 'bg-slate-50/80 border-slate-200 text-slate-700 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-400',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/50'
  }
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

      // Save reply to replies subcollection
      await addDoc(collection(db, `forums/${selectedThread.id}/replies`), newReply);

      // Increment replies count on parent document
      await updateDoc(doc(db, 'forums', selectedThread.id), {
        repliesCount: increment(1)
      });

      // Update state locally
      setSelectedThread(prev => ({
        ...prev,
        repliesCount: (prev.repliesCount || 0) + 1
      }));

      // Update in main threads list
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto dark:text-slate-100 min-h-screen">
      {/* Header Banner Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 text-white p-6 md:p-8 mb-8 shadow-xl shadow-indigo-500/10 dark:shadow-indigo-950/20">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none hidden md:block">
          <svg className="w-full h-full text-white" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 0 A50 50 0 1 0 100 50 A50 50 0 0 0 50 0 Z" opacity="0.3"/>
            <path d="M50 20 A30 30 0 1 0 80 50 A30 30 0 0 0 50 20 Z" opacity="0.5"/>
          </svg>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-semibold mb-3 tracking-wide">
              <span>💬</span> Interactive Community
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Doubt Discussion Forum</h1>
            <p className="text-indigo-100/90 text-sm md:text-base mt-2 max-w-xl font-medium">
              Stuck on a concept? Post your doubt to study with peers or check solutions from active mentors.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="group inline-flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-700 font-extrabold py-3.5 px-6 rounded-2xl shadow-lg transition-all active:scale-95 duration-200 cursor-pointer text-sm"
          >
            <svg className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Post a New Doubt
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Categories and Threads List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Search Bar */}
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search doubts by title, keyword, or author..."
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/5 outline-none text-sm text-slate-800 dark:text-slate-200 transition-all font-medium placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Cards */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
            {categories.map(cat => {
              const config = categoryConfig[cat] || categoryConfig.General;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setSelectedThread(null); }}
                  className={`flex items-center gap-2 px-4.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer snap-start ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15 scale-105 border border-transparent'
                      : 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800/60'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}>
                    {config.icon}
                  </span>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Threads List */}
          <div className="flex flex-col gap-3.5 max-h-[620px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-medium">Loading threads...</span>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-16 px-6 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900">
                <span className="text-4xl block mb-3 opacity-60">🔍</span>
                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">No doubts found</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                  Try adjusting your keywords, switching categories, or create a new thread.
                </p>
              </div>
            ) : (
              filteredThreads.map(thread => {
                const isSelected = selectedThread?.id === thread.id;
                const config = categoryConfig[thread.subject] || categoryConfig.General;
                const avatarGradient = getAvatarColor(thread.authorName);
                
                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread)}
                    className={`group relative p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/15 border-indigo-500/80 dark:border-indigo-500/80 shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* User Initial Avatar */}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-extrabold text-sm shadow-sm flex-shrink-0`}>
                        {(thread.authorName || 'S')[0].toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${config.badgeClass}`}>
                            {thread.subject}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatRelativeTime(thread.createdAt)}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {thread.title}
                        </h3>
                        
                        <div className="flex items-center justify-between mt-3 text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-bold">
                            By {thread.authorName}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {thread.repliesCount || 0}
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

        {/* Right Column: Active Thread Details and Replies (7 cols) */}
        <div className="lg:col-span-7 h-full">
          {selectedThread ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-7 flex flex-col gap-6 shadow-sm relative overflow-hidden">
              {/* Card top gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

              {/* Thread header */}
              <div className="border-b border-slate-100 dark:border-slate-800/60 pb-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(selectedThread.authorName)} flex items-center justify-center text-white font-extrabold text-lg shadow-sm`}>
                    {(selectedThread.authorName || 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">
                      {selectedThread.authorName}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        Asked {formatRelativeTime(selectedThread.createdAt)}
                      </span>
                      <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${(categoryConfig[selectedThread.subject] || categoryConfig.General).badgeClass}`}>
                        {selectedThread.subject}
                      </span>
                    </div>
                  </div>
                </div>
                
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-50 leading-snug tracking-tight">
                  {selectedThread.title}
                </h2>
                
                <div className="mt-5 text-slate-700 dark:text-slate-300 text-sm md:text-base bg-slate-50/60 dark:bg-slate-950/40 p-5 rounded-2xl leading-relaxed whitespace-pre-wrap border border-slate-100 dark:border-slate-850 font-medium">
                  {selectedThread.body}
                </div>
              </div>

              {/* Replies timeline */}
              <div>
                <h3 className="font-black text-slate-850 dark:text-slate-200 text-sm mb-4 flex items-center gap-2">
                  <span>Responses</span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold border border-indigo-100/30 dark:border-indigo-900/30">
                    {replies.length}
                  </span>
                </h3>

                {repliesLoading ? (
                  <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">Loading solutions...</span>
                  </div>
                ) : replies.length === 0 ? (
                  <div className="text-center py-10 px-4 text-slate-400 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-950/10">
                    <span className="text-2xl block mb-2 opacity-50">💡</span>
                    <h5 className="font-bold text-xs text-slate-650 dark:text-slate-300 mb-0.5">No answers yet</h5>
                    <p className="text-[11px] text-slate-400">Be the first to provide a clear explanation and help out!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-850">
                    {replies.map(reply => {
                      const isAuthorOfThread = reply.authorId === selectedThread.authorId;
                      return (
                        <div 
                          key={reply.id} 
                          className="group relative p-4 bg-slate-50/50 dark:bg-slate-950/35 hover:bg-slate-50/80 dark:hover:bg-slate-950/50 rounded-2xl border border-slate-200/50 dark:border-slate-850 text-xs transition-colors"
                        >
                          <div className="flex justify-between items-center mb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarColor(reply.authorName)} flex items-center justify-center text-white font-black text-[10px] shadow-sm`}>
                                {(reply.authorName || 'S')[0].toUpperCase()}
                              </div>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                {reply.authorName}
                              </span>
                              {isAuthorOfThread && (
                                <span className="bg-indigo-600 text-white dark:bg-indigo-600 dark:text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider scale-90">
                                  Author
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                              {formatRelativeTime(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pl-8 font-medium">
                            {reply.body}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handlePostReply} className="border-t border-slate-100 dark:border-slate-800/80 pt-5 flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    rows="2"
                    required
                    placeholder="Provide a step-by-step helpful solution..."
                    className="w-full px-4 py-3 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-xs text-slate-800 dark:text-slate-200 resize-none font-medium placeholder:text-slate-400 pr-12 transition-all"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className={`absolute right-3.5 bottom-3.5 p-2 rounded-xl text-white transition-all cursor-pointer ${
                      replyText.trim() 
                        ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-600/10' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4 transform rotate-45 -translate-x-0.5 translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 md:p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/85 dark:border-slate-800/80 min-h-[460px] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700"></div>
              
              {/* Premium illustration using pure styling & SVGs */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-xl transform scale-150 animate-pulse"></div>
                <div className="relative w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-slate-950 flex items-center justify-center shadow-inner border border-indigo-100/30 dark:border-indigo-950/30">
                  <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-100">Select a doubt thread</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm max-w-sm mt-2.5 leading-relaxed font-medium">
                Choose an active conversation from the left feed to explore explanations, view diagrams, or post a helpful reply.
              </p>
              
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-5 rounded-xl cursor-pointer transition active:scale-95 shadow-md shadow-indigo-600/15"
                >
                  Ask a Question
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Thread Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 w-full max-w-lg p-6 shadow-2xl relative overflow-hidden transition-transform duration-300 animate-in fade-in zoom-in-95">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500"></div>

            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-50">Create New Doubt</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Ask our student and mentor community for help.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center font-bold transition-all active:scale-90 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Subject Category</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition-all"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                >
                  {categories.slice(1).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Title / Brief Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., How does lens power change when submerged in water?"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-xs text-slate-800 dark:text-slate-200 font-bold placeholder:text-slate-400 transition-all"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Describe your Doubt</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Describe your equation, write the question prompt, or explain exactly where you got stuck..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-xs text-slate-800 dark:text-slate-200 leading-relaxed resize-none font-medium placeholder:text-slate-400 transition-all"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-2xl hover:shadow-lg shadow-indigo-500/20 transition active:scale-95 mt-3 cursor-pointer text-xs uppercase tracking-wider"
              >
                🚀 Post to Forum
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
