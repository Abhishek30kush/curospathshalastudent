import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function Forum() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [repliesLoading, setRepliesLoading] = useState(false);

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
      let authorName = userEmail.split('@')[0];
      // Try fetching actual student name
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
      let authorName = userEmail.split('@')[0];
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
      setReplyText('');
      fetchReplies(selectedThread.id);
    } catch (e) {
      console.error("Error posting reply:", e);
    }
  };

  const filteredThreads = activeCategory === 'All' 
    ? threads 
    : threads.filter(t => t.subject === activeCategory);

  return (
    <div className="p-6 max-w-6xl mx-auto dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight dark:text-white">💬 Doubt Discussion Forum</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ask questions, share solutions, and study with peers.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
        >
          ➕ Post a New Doubt
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: categories and threads list */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelectedThread(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Threads List */}
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading discussion threads...</div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                No doubts posted in this category yet.
              </div>
            ) : (
              filteredThreads.map(thread => (
                <div
                  key={thread.id}
                  onClick={() => handleSelectThread(thread)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedThread?.id === thread.id
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 dark:border-indigo-400'
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                      {thread.subject}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {new Date(thread.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-2">{thread.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-semibold">By {thread.authorName}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: active thread view */}
        <div className="lg:col-span-2">
          {selectedThread ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-6 shadow-sm">
              {/* Thread detail */}
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="flex gap-2 items-center mb-3">
                  <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 px-2.5 py-0.5 rounded text-xs font-extrabold uppercase">
                    {selectedThread.subject}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Posted on {new Date(selectedThread.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-snug">{selectedThread.title}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1.5">Asked by {selectedThread.authorName}</p>
                <div className="mt-4 text-slate-700 dark:text-slate-300 text-sm bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl leading-relaxed whitespace-pre-wrap">
                  {selectedThread.body}
                </div>
              </div>

              {/* Replies list */}
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-4">Replies</h3>
                {repliesLoading ? (
                  <div className="text-center py-6 text-slate-400 text-xs">Loading replies...</div>
                ) : replies.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-900/20 rounded-xl">
                    No replies yet. Be the first to answer!
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {replies.map(reply => (
                      <div key={reply.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex justify-between items-center mb-1 font-bold text-slate-500 dark:text-slate-400">
                          <span>{reply.authorName}</span>
                          <span className="font-medium text-[10px]">{new Date(reply.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handlePostReply} className="flex gap-2 items-end border-t border-slate-100 dark:border-slate-700 pt-4">
                <div className="flex-1">
                  <textarea
                    rows="2"
                    required
                    placeholder="Write a helpful response..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-200 resize-none"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs active:scale-95 transition-all shadow-md"
                >
                  Reply
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 min-h-[400px]">
              <span className="text-5xl mb-4">💬</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No doubt selected</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs max-w-xs mt-1 leading-relaxed">
                Select a doubt from the left pane to view its description, solution progress, and helper discussions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Thread Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Ask a Doubt</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateThread} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Subject Category</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700 dark:text-slate-300"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                >
                  {categories.slice(1).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Title / Brief Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Confused about angular acceleration in rotational motion"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-800 dark:text-slate-200"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Describe your Doubt</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Paste question details, equations, or describe exactly where you are stuck..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs text-slate-800 dark:text-slate-200 leading-relaxed resize-none"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl hover:shadow-lg transition active:scale-95 mt-2"
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
