import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function ClassMaterials() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetExam, setTargetExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [subjects, setSubjects] = useState(['All']);
  const [expandedChapters, setExpandedChapters] = useState({});

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchUserAndMaterials = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        // Get user target exam
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        let userCategory = 'Class 10'; // default
        if (userDoc.exists() && userDoc.data().targetExam) {
          userCategory = userDoc.data().targetExam;
        }
        setTargetExam(userCategory);

        // Fetch class materials matching user category
        const q = query(collection(db, "studyMaterials"), where("category", "==", userCategory));
        const snap = await getDocs(q);
        const fetchedMaterials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Also fetch materials with category "Both" if applicable
        if (userCategory === 'JEE' || userCategory === 'IIT-JEE' || userCategory === 'NEET') {
            const bothQ = query(collection(db, "studyMaterials"), where("category", "==", "Both"));
            const bothSnap = await getDocs(bothQ);
            bothSnap.docs.forEach(d => {
                fetchedMaterials.push({ id: d.id, ...d.data() });
            });
        }

        setMaterials(fetchedMaterials);

        // Extract unique subjects
        const uniqueSubjects = ['All', ...new Set(fetchedMaterials.map(m => m.subject).filter(Boolean))];
        setSubjects(uniqueSubjects);
        if (uniqueSubjects.length > 1) {
          setSelectedSubject(uniqueSubjects[1]); // Default to first actual subject
        }

      } catch (error) {
        console.error("Error fetching class materials:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndMaterials();
  }, [userId]);

  const toggleChapter = (chapter) => {
    setExpandedChapters(prev => ({ ...prev, [chapter]: !prev[chapter] }));
  };

  const groupMaterialsByChapter = (materialsList) => {
    const grouped = {};
    materialsList.forEach(m => {
      const ch = m.chapterName || 'General';
      if (!grouped[ch]) grouped[ch] = [];
      grouped[ch].push(m);
    });
    return grouped;
  };

  const filteredMaterials = materials.filter(m => (selectedSubject === 'All' || m.subject === selectedSubject) && m.status !== 'draft');

  const openMaterial = (material) => {
    if (material.type === 'video') {
      window.open(material.url, '_blank');
    } else {
      navigate('/view-material', { 
        state: { 
          url: material.url, 
          title: material.title, 
          textContent: material.textContent, 
          type: material.type, 
          materialType: material.materialType 
        } 
      });
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
    <div className="materials-container" style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          &larr; Back
        </button>
        <h1 className="section-title" style={{ margin: 0 }}>Study Materials ({targetExam})</h1>
      </div>

      {subjects.length > 1 && (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px' }} className="hide-scrollbar">
          {subjects.map(subject => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: selectedSubject === subject ? 'var(--primary)' : 'var(--card-bg)',
                color: selectedSubject === subject ? '#fff' : 'var(--text-main)',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: selectedSubject === subject ? '0 4px 10px rgba(79, 70, 229, 0.3)' : '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              {subject}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {filteredMaterials.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
            No materials found for {selectedSubject}.
          </div>
        ) : (
          Object.entries(groupMaterialsByChapter(filteredMaterials)).sort(([a], [b]) => a.localeCompare(b)).map(([chapter, mats]) => (
            <div key={chapter} style={{ border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px', background: 'var(--card-bg)' }}>
              <button 
                onClick={() => toggleChapter(chapter)}
                style={{ 
                  width: '100%', 
                  background: 'var(--card-bg)', 
                  border: 'none', 
                  padding: '14px 16px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderBottom: expandedChapters[chapter] ? '1px solid var(--border-light)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '18px', shrink: 0 }}>📂</span>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', textAlign: 'left', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>{chapter}</h2>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: expandedChapters[chapter] ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                  ▼
                </span>
              </button>
              
              {expandedChapters[chapter] && (
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-main)' }}>
                  {mats.map(material => (
                    <div 
                      key={material.id} 
                      style={{ 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '12px', 
                        padding: '12px 14px',
                        background: 'var(--card-bg)', 
                        border: '1px solid var(--border-light)',
                        borderRadius: '10px'
                      }}
                      onClick={() => openMaterial(material)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div 
                          style={{ 
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '16px',
                            backgroundColor: material.type === 'video' ? 'var(--danger-light)' : 'var(--primary-light)', 
                            color: material.type === 'video' ? 'var(--danger)' : 'var(--primary)' 
                          }}
                        >
                          <span>{material.type === 'video' ? '▶' : '📝'}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: 0, wordBreak: 'break-word' }}>
                              {material.title}
                            </h3>
                            {material.lectureName && (
                              <span style={{ fontSize: '10px', background: 'var(--bg-main)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                {material.lectureName}
                              </span>
                            )}
                            {material.materialType && (
                              <span style={{ fontSize: '10px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                {material.materialType}
                              </span>
                            )}
                          </div>
                          {material.description && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {material.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px', flexShrink: 0, whiteSpace: 'nowrap' }}>View &rarr;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
