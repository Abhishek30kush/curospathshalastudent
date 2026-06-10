import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function MaterialViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { url, title, type, materialType, textContent } = location.state || {};

  // Protect page content from right-click, selection, copy/paste, and dragging
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      // Disable Ctrl+C, Ctrl+U, Ctrl+S, F12
      if (
        (e.ctrlKey && ['c', 'u', 's', 'p'].includes(e.key.toLowerCase())) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        alert("Copying and saving is disabled for security reasons.");
      }
    };
    const handleDragStart = (e) => e.preventDefault();

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  if (!url && type !== 'text') {
    return (
      <div className="center-indicator">
        <p style={{ color: 'var(--danger)', fontWeight: 'bold' }}>No valid link or content found for this resource.</p>
        <button onClick={() => navigate(-1)} className="auth-btn" style={{ maxWidth: '150px', marginTop: '20px' }}>
          Go Back
        </button>
      </div>
    );
  }

  const isText = type === 'text';

  const getYouTubeEmbedUrl = (link) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = link.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&modestbranding=1&rel=0&showinfo=0`;
    }
    return link;
  };

  const isVideo = type === 'video' || materialType === 'Video Lecture' || url.includes('youtube.com') || url.includes('youtu.be');
  let targetUrl = url;

  if (isVideo) {
    targetUrl = getYouTubeEmbedUrl(url);
  } else if (!isText) {
    // PDF Google Docs viewer wrapper to prevent direct download on web
    targetUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
  }

  return (
    <div style={{ userSelect: 'none', WebkitUserSelect: 'none', msUserSelect: 'none', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Secure Toolbar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderBottom: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
          >
            &larr; Back
          </button>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>{title || 'Study Resource'}</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
              🔒 Protected View • {isVideo ? 'Secure Video Player' : isText ? 'Direct Note Reader' : 'Secure Document Reader'}
            </p>
          </div>
        </div>
        <div className="secure-tag">
          <span>🛡️ Copy Protected</span>
        </div>
      </div>

      {/* Frame Viewer or Text Viewer */}
      <div style={{ flex: 1, backgroundColor: isText ? 'var(--bg-card)' : 'var(--bg-main)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1.5px solid var(--border-light)', position: 'relative' }}>
        {isText ? (
          <div style={{ padding: '24px', width: '100%', height: '100%', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-main)', fontSize: '15px', lineHeight: '1.6' }}>
            {textContent || 'No content provided.'}
          </div>
        ) : (
          <iframe
            src={targetUrl}
            className="viewer-frame"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={title}
            allowFullScreen
            allow="autoplay"
          />
        )}
      </div>
    </div>
  );
}
