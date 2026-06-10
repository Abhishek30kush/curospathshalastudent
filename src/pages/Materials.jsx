import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Materials() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState({});

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

  useEffect(() => {
    const fetchMaterialsAndCourse = async () => {
      try {
        // Fetch course title
        const cSnap = await getDocs(query(collection(db, "courses")));
        const currentCourse = cSnap.docs.find(d => d.id === courseId);
        if (currentCourse) {
          setCourseTitle(currentCourse.data().title);
        }

        // Fetch materials
        const q = query(collection(db, "materials"), where("courseId", "==", courseId));
        const qSnap = await getDocs(q);
        setMaterials(qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching materials", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterialsAndCourse();
  }, [courseId]);

  const openMaterial = (material) => {
    navigate('/view-material', {
      state: {
        url: material.url,
        title: material.title,
        textContent: material.textContent,
        type: material.type,
        materialType: material.materialType
      }
    });
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
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          &larr; Back
        </button>
        <h1 className="section-title" style={{ margin: 0 }}>{courseTitle || 'Course Materials'}</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {materials.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
            No materials found for this course.
          </div>
        ) : (
          Object.entries(groupMaterialsByChapter(materials)).sort(([a], [b]) => a.localeCompare(b)).map(([chapter, mats]) => (
            <div key={chapter} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
              <button 
                onClick={() => toggleChapter(chapter)}
                style={{ 
                  width: '100%', 
                  background: 'var(--card-bg)', 
                  border: 'none', 
                  padding: '16px 20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderBottom: expandedChapters[chapter] ? '1px solid var(--border-color)' : 'none'
                }}
              >
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>{chapter}</h2>
                <span style={{ fontSize: '18px', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: expandedChapters[chapter] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </button>
              
              {expandedChapters[chapter] && (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-main)' }}>
                  {mats.map(material => (
                    <div 
                      key={material.id} 
                      className="standing-row"
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
                      onClick={() => openMaterial(material)}
                    >
                      <div 
                        className="quick-icon-wrapper" 
                        style={{ 
                          margin: 0, 
                          backgroundColor: material.type === 'video' ? 'var(--danger-light)' : 'var(--primary-light)', 
                          color: material.type === 'video' ? 'var(--danger)' : 'var(--primary)' 
                        }}
                      >
                        <span>{material.type === 'video' ? '▶' : '📄'}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>
                            {material.title}
                          </h3>
                          {material.lectureName && (
                              <span style={{ fontSize: '10px', background: 'var(--bg-main)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                  {material.lectureName}
                              </span>
                          )}
                        </div>
                        {material.description && (
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            {material.description}
                          </p>
                        )}
                      </div>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>View &rarr;</span>
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
