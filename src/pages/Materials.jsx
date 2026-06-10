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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {materials.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
            No materials found for this course.
          </div>
        ) : (
          materials.map(material => (
            <div 
              key={material.id} 
              className="standing-row"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
              onClick={() => openMaterial(material)}
            >
              <div 
                className="quick-icon-wrapper" 
                style={{ 
                  margin: 0, 
                  backgroundColor: material.type === 'video' ? '#fee2e2' : '#e0e7ff', 
                  color: material.type === 'video' ? '#ef4444' : '#4f46e5' 
                }}
              >
                <span>{material.type === 'video' ? '▶' : '📄'}</span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>
                  {material.title}
                </h3>
                {material.description && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {material.description}
                  </p>
                )}
              </div>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>View &rarr;</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
