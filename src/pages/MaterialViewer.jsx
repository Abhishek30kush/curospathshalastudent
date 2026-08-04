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

  const isVideo = type === 'video' || materialType === 'Video Lecture' || (url && (url.includes('youtube.com') || url.includes('youtu.be')));
  const isPdf = !isText && !isVideo;
  
  let targetUrl = url;
  if (isVideo && url) {
    targetUrl = getYouTubeEmbedUrl(url);
  }

  const [useGoogleDocs, setUseGoogleDocs] = React.useState(false);

  const finalPdfUrl = useGoogleDocs && url ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}` : url;

  return (
    <div style={{ userSelect: 'none', WebkitUserSelect: 'none', msUserSelect: 'none', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Secure Toolbar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '14px 20px', borderBottom: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
          >
            &larr; Back
          </button>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>{title || 'Study Resource'}</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px', margin: 0 }}>
              🔒 Protected View • {isVideo ? 'Secure Video Player' : isText ? 'Direct Note Reader' : 'Secure Document Reader'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isPdf && url && (
            <>
              <button
                onClick={() => setUseGoogleDocs(!useGoogleDocs)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {useGoogleDocs ? '⚡ Standard Viewer' : '🌐 Google Preview'}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)'
                }}
              >
                📄 Open / Download PDF ↗
              </a>
            </>
          )}
          <div className="secure-tag">
            <span>🛡️ Copy Protected</span>
          </div>
        </div>
      </div>

      {/* Frame Viewer or Text Viewer */}
      <div style={{ flex: 1, backgroundColor: isText ? 'var(--bg-card)' : 'var(--bg-main)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1.5px solid var(--border-light)', position: 'relative' }}>
        {isText ? (
          <div 
            className="note-content-rendered"
            dangerouslySetInnerHTML={{ __html: textContent || '<p style="color: var(--text-muted); font-style: italic;">No content provided.</p>' }}
            style={{ padding: '32px 40px', width: '100%', height: '100%', overflowY: 'auto', color: 'var(--text-main)', fontSize: '16px', lineHeight: '1.7' }}
          />
        ) : isPdf ? (
          <object
            data={finalPdfUrl}
            type="application/pdf"
            width="100%"
            height="100%"
            style={{ width: '100%', height: '100%', border: 'none' }}
          >
            <iframe
              src={finalPdfUrl}
              className="viewer-frame"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={title}
              allowFullScreen
            />
          </object>
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
