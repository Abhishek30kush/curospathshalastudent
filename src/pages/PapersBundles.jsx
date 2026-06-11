import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function PapersBundles() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetExam, setTargetExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [previewPaper, setPreviewPaper] = useState(null);
  const [showSolutions, setShowSolutions] = useState(false);

  const userId = auth.currentUser?.uid;

  const getSubjectsList = (cat) => {
    if (cat === 'Class 9' || cat === 'Class 10') {
      return ['All', 'Science', 'Mathematics', 'English', 'Social Science', 'General'];
    } else if (cat === 'Class 11' || cat === 'Class 12') {
      return ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'General'];
    } else if (cat === 'IIT-JEE' || cat === 'JEE') {
      return ['All', 'Physics', 'Chemistry', 'Mathematics', 'General'];
    } else if (cat === 'NEET') {
      return ['All', 'Physics', 'Chemistry', 'Biology', 'General'];
    }
    return ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'General'];
  };

  const getSubjectColorClasses = (sub) => {
    const colors = {
      Mathematics: { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' },
      Physics: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
      Chemistry: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
      Biology: { bg: '#d1fae5', text: '#047857', border: '#a7f3d0' },
      Science: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
      English: { bg: '#fae8ff', text: '#86198f', border: '#f5d0fe' },
      'Social Science': { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
      General: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
    };
    return colors[sub] || colors['General'];
  };

  const bundleTypes = [
    { label: 'Full Syllabus Paper (Mixed)', value: 'Full Paper' },
    { label: 'Only Long Questions Series', value: 'Only Long' },
    { label: 'Only Short Questions Series', value: 'Only Short' },
    { label: 'Only Objective (MCQs) Series', value: 'Only Objective' },
    { label: 'Only Numerical Series', value: 'Only Numerical' },
    { label: 'Custom Mixed Bundle', value: 'Mixed' }
  ];

  const getBundleLabel = (val) => {
    return bundleTypes.find(t => t.value === val)?.label || val;
  };

  useEffect(() => {
    const fetchUserAndPapers = async () => {
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

        // Fetch papers
        const querySnapshot = await getDocs(collection(db, "testPapers"));
        const allPapers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter based on student stream
        const filtered = allPapers.filter(paper => {
          if (userCategory === 'JEE' || userCategory === 'IIT-JEE') {
            return paper.category === 'IIT-JEE' || paper.category === 'JEE';
          }
          if (userCategory === 'NEET') {
            return paper.category === 'NEET';
          }
          return paper.category === userCategory;
        });

        setPapers(filtered);
      } catch (error) {
        console.error("Error fetching papers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndPapers();
  }, [userId]);

  const groupQuestionsBySection = (questionsList = []) => {
    const sections = {
      objective: [],
      short: [],
      long: [],
      numerical: []
    };

    questionsList.forEach(q => {
      if (sections[q.type]) {
        sections[q.type].push(q);
      } else {
        sections.short.push(q);
      }
    });

    return sections;
  };

  const filteredPapers = papers.filter(paper => {
    return selectedSubject === 'All' || paper.subject === selectedSubject;
  });

  const triggerPrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="center-indicator">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }} className="materials-container">
      {/* CSS print styles injected for beautiful printed sheets */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-paper-sheet, #print-paper-sheet * {
            visibility: visible;
          }
          #print-paper-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          &larr; Back
        </button>
        <h1 className="section-title" style={{ margin: 0 }}>Papers & Question Bundles ({targetExam === 'JEE' ? 'IIT-JEE' : targetExam})</h1>
      </div>

      {/* Subject Filter Chips */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '24px' }} className="hide-scrollbar">
        {getSubjectsList(targetExam).map(sub => (
          <button
            key={sub}
            onClick={() => setSelectedSubject(sub)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: selectedSubject === sub ? 'var(--primary)' : 'var(--card-bg)',
              color: selectedSubject === sub ? '#fff' : 'var(--text-main)',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: selectedSubject === sub ? '0 4px 10px rgba(79, 70, 229, 0.3)' : '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Papers Grid */}
      {filteredPapers.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '40px', textAlign: 'center' }}>
          No papers or bundles found matching the selected subject.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {filteredPapers.map(paper => {
            const colors = getSubjectColorClasses(paper.subject);
            return (
              <div 
                key={paper.id} 
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.02)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 'bold', 
                      backgroundColor: 'var(--primary-light)', 
                      color: 'var(--primary)', 
                      padding: '4px 8px', 
                      borderRadius: '8px' 
                    }}>
                      {paper.category}
                    </span>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 'bold', 
                      backgroundColor: colors.bg, 
                      color: colors.text, 
                      border: `1px solid ${colors.border}`,
                      padding: '4px 8px', 
                      borderRadius: '8px' 
                    }}>
                      {paper.subject}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', lineHeight: '1.4' }}>
                    {paper.title}
                  </h3>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🏷️ {getBundleLabel(paper.bundleType)}
                  </span>
                  {paper.description && (
                    <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.6' }}>
                      {paper.description}
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {paper.mode === 'pdf' ? '📄 Direct PDF' : `✍️ Custom Typed (${paper.questions?.length || 0} Qs)`}
                  </span>
                  {paper.mode === 'pdf' ? (
                    <a 
                      href={paper.pdfUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ 
                        color: 'var(--primary)', 
                        fontWeight: 'bold', 
                        fontSize: '14px', 
                        textDecoration: 'none' 
                      }}
                    >
                      Open PDF &rarr;
                    </a>
                  ) : (
                    <button 
                      onClick={() => {
                        setPreviewPaper(paper);
                        setShowSolutions(false);
                      }}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        fontWeight: 'bold', 
                        fontSize: '14px', 
                        cursor: 'pointer' 
                      }}
                    >
                      View & Practice &rarr;
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAPER PREVIEW MODAL */}
      {previewPaper && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '20px',
          zIndex: 1000,
          overflowY: 'auto'
        }} className="no-print">
          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '800px',
            padding: '32px',
            margin: '40px 0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--border-color)'
          }}>
            {/* Modal Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>View Question Paper</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Grouped by Exam Section</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => setShowSolutions(!showSolutions)}
                  style={{
                    backgroundColor: showSolutions ? 'var(--success-light)' : 'var(--bg-main)',
                    color: showSolutions ? 'var(--success)' : 'var(--text-main)',
                    border: `1.5px solid ${showSolutions ? 'var(--success)' : 'var(--border-color)'}`,
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {showSolutions ? '💡 Hide Answers' : '🔑 Show Answers'}
                </button>
                <button 
                  onClick={triggerPrint}
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🖨️ Print / Save PDF
                </button>
                <button 
                  onClick={() => setPreviewPaper(null)}
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-muted)',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Simulating Printed Paper Container */}
            <div 
              id="print-paper-sheet"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '40px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontFamily: 'Georgia, serif',
                lineHeight: '1.6',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #000000', paddingBottom: '16px', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', letterSpacing: '1px' }}>CUROS PATHSHALA</h1>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px' }}>
                  {previewPaper.category.toUpperCase()} PRACTICE TEST
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', marginTop: '16px' }}>
                  <span>SUBJECT: {previewPaper.subject.toUpperCase()}</span>
                  <span>MAX MARKS: {previewPaper.questions?.reduce((sum, q) => sum + (Number(q.marks) || 0), 0)}</span>
                </div>
                {previewPaper.description && (
                  <p style={{ margin: '12px 0 0 0', fontSize: '11px', fontStyle: 'italic', borderTop: '1px solid #e2e8f0', paddingTop: '8px', color: '#4b5563', textTransform: 'uppercase' }}>
                    Instructions: {previewPaper.description}
                  </p>
                )}
              </div>

              {/* Sections list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* Section A: Objective (MCQs) */}
                {groupQuestionsBySection(previewPaper.questions).objective.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Section A: Multiple Choice Questions (MCQs)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {groupQuestionsBySection(previewPaper.questions).objective.map((q, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>Q.{idx + 1} {q.text}</p>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', whiteSpace: 'nowrap' }}>[{q.marks} Marks]</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingLeft: '24px', fontFamily: 'sans-serif', fontSize: '13px' }}>
                            <div><strong>A.</strong> {q.optionA}</div>
                            <div><strong>B.</strong> {q.optionB}</div>
                            <div><strong>C.</strong> {q.optionC}</div>
                            <div><strong>D.</strong> {q.optionD}</div>
                          </div>
                          {showSolutions && (
                            <div style={{ backgroundColor: '#f0fdf4', borderLeft: '3.5px solid #16a34a', padding: '10px 14px', borderRadius: '6px', marginTop: '6px', fontFamily: 'sans-serif' }} className="no-print">
                              <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase' }}>🔑 Answer Key</p>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1f2937' }}>Correct Option: {q.correctOption}</p>
                              {q.solution && (
                                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4b5563', borderTop: '1px dashed #d1fae5', paddingTop: '6px', lineHeight: '1.4' }}>
                                  <strong>Explanation:</strong> {q.solution}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section B: Short Answer Type */}
                {groupQuestionsBySection(previewPaper.questions).short.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Section B: Short Answer Type Questions
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {groupQuestionsBySection(previewPaper.questions).short.map((q, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>Q.{idx + 1} {q.text}</p>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', whiteSpace: 'nowrap' }}>[{q.marks} Marks]</span>
                          </div>
                          {showSolutions && q.correctAnswer && (
                            <div style={{ backgroundColor: '#f0fdf4', borderLeft: '3.5px solid #16a34a', padding: '10px 14px', borderRadius: '6px', marginTop: '6px', fontFamily: 'sans-serif' }} className="no-print">
                              <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase' }}>🔑 Answer Key</p>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1f2937' }}>Key Points: {q.correctAnswer}</p>
                              {q.solution && (
                                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4b5563', borderTop: '1px dashed #d1fae5', paddingTop: '6px', lineHeight: '1.4' }}>
                                  <strong>Explanation:</strong> {q.solution}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section C: Long Answer Type */}
                {groupQuestionsBySection(previewPaper.questions).long.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Section C: Long Answer Type Questions
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {groupQuestionsBySection(previewPaper.questions).long.map((q, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>Q.{idx + 1} {q.text}</p>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', whiteSpace: 'nowrap' }}>[{q.marks} Marks]</span>
                          </div>
                          {showSolutions && q.correctAnswer && (
                            <div style={{ backgroundColor: '#f0fdf4', borderLeft: '3.5px solid #16a34a', padding: '10px 14px', borderRadius: '6px', marginTop: '6px', fontFamily: 'sans-serif' }} className="no-print">
                              <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase' }}>🔑 Answer Key</p>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1f2937' }}>Key Points: {q.correctAnswer}</p>
                              {q.solution && (
                                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4b5563', borderTop: '1px dashed #d1fae5', paddingTop: '6px', lineHeight: '1.4' }}>
                                  <strong>Explanation:</strong> {q.solution}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section D: Numerical */}
                {groupQuestionsBySection(previewPaper.questions).numerical.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #000000', paddingBottom: '4px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Section D: Numerical/Integer Value Questions
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {groupQuestionsBySection(previewPaper.questions).numerical.map((q, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>Q.{idx + 1} {q.text}</p>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', whiteSpace: 'nowrap' }}>[{q.marks} Marks]</span>
                          </div>
                          {showSolutions && q.correctAnswer && (
                            <div style={{ backgroundColor: '#f0fdf4', borderLeft: '3.5px solid #16a34a', padding: '10px 14px', borderRadius: '6px', marginTop: '6px', fontFamily: 'sans-serif' }} className="no-print">
                              <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase' }}>🔑 Answer Key</p>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1f2937' }}>Correct Value: {q.correctAnswer}</p>
                              {q.solution && (
                                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4b5563', borderTop: '1px dashed #d1fae5', paddingTop: '6px', lineHeight: '1.4' }}>
                                  <strong>Explanation:</strong> {q.solution}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* End of Sheet Sign */}
              <div style={{ textAlign: 'center', marginTop: '48px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '4px', borderTop: '1px solid #000000', paddingTop: '24px' }}>
                *** END OF QUESTION PAPER ***
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
