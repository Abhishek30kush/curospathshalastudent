import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FORMULA_CARDS = [
  // Physics
  { id: 'p1', title: 'De Broglie Wavelength', content: 'λ = h / p = h / (m * v)', subject: 'physics' },
  { id: 'p2', title: 'Einstein\'s Mass-Energy Relation', content: 'E = m * c^2', subject: 'physics' },
  { id: 'p3', title: 'Coulomb\'s Law Force', content: 'F = k * |q1 * q2| / r^2', subject: 'physics' },
  { id: 'p4', title: 'Planck Relation', content: 'E = h * ν', subject: 'physics' },
  
  // Chemistry
  { id: 'c1', title: 'Ideal Gas Law', content: 'P * V = n * R * T', subject: 'chemistry' },
  { id: 'c2', title: 'Arrhenius Equation', content: 'k = A * e^(-E_a / (R * T))', subject: 'chemistry' },
  { id: 'c3', title: 'Nernst Equation', content: 'E = E° - (R*T / n*F) * ln(Q)', subject: 'chemistry' },
  { id: 'c4', title: 'pH Definition', content: 'pH = -log10[H+]', subject: 'chemistry' },
  
  // Maths
  { id: 'm1', title: 'Euler\'s Formula', content: 'e^(i * θ) = cos(θ) + i * sin(θ)', subject: 'maths' },
  { id: 'm2', title: 'Quadratic Formula', content: 'x = (-b ± √(b^2 - 4ac)) / 2a', subject: 'maths' },
  { id: 'm3', title: 'Derivative of ln(x)', content: 'd/dx (ln(x)) = 1 / x', subject: 'maths' },
  
  // Biology
  { id: 'b1', title: 'Photosynthesis', content: '6CO2 + 6H2O + hv -> C6H12O6 + 6O2', subject: 'biology' },
  { id: 'b2', title: 'Hardy-Weinberg Principle', content: 'p^2 + 2pq + q^2 = 1', subject: 'biology' }
];

export default function Flashcards() {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedConfidence, setSelectedConfidence] = useState('All');
  const [flippedCards, setFlippedCards] = useState({});
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    // Load ratings from localStorage
    const saved = localStorage.getItem('curos_flashcard_ratings');
    if (saved) {
      try {
        setRatings(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleCardFlip = (id) => {
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleRateCard = (id, rating, e) => {
    e.stopPropagation(); // prevent flipping card when clicking rating button
    const updated = {
      ...ratings,
      [id]: rating
    };
    setRatings(updated);
    localStorage.setItem('curos_flashcard_ratings', JSON.stringify(updated));
  };

  // Filter cards
  const filteredCards = FORMULA_CARDS.filter(card => {
    const matchesSubject = selectedSubject === 'All' || card.subject === selectedSubject.toLowerCase();
    const cardRating = ratings[card.id] || 'unrated';
    const matchesConfidence = selectedConfidence === 'All' || cardRating === selectedConfidence.toLowerCase();
    return matchesSubject && matchesConfidence;
  });

  return (
    <div className="flashcards-layout">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          &larr; Back
        </button>
        <h1 className="section-title" style={{ margin: 0 }}>🎴 Formula Flashcards</h1>
      </div>

      {/* Filter Options */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', backgroundColor: 'var(--bg-card)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-light)' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>SUBJECT</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'Physics', 'Chemistry', 'Maths', 'Biology'].map(sub => (
              <button 
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid',
                  borderColor: selectedSubject === sub ? 'var(--primary)' : 'var(--border-light)',
                  backgroundColor: selectedSubject === sub ? 'var(--primary)' : '#ffffff',
                  color: selectedSubject === sub ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>CONFIDENCE LEVEL</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'Easy', 'Medium', 'Hard'].map(level => (
              <button 
                key={level}
                onClick={() => setSelectedConfidence(level)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid',
                  borderColor: selectedConfidence === level ? 'var(--primary)' : 'var(--border-light)',
                  backgroundColor: selectedConfidence === level ? 'var(--primary)' : '#ffffff',
                  color: selectedConfidence === level ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card Grid */}
      {filteredCards.length > 0 ? (
        <div className="flashcard-grid">
          {filteredCards.map(card => {
            const isFlipped = !!flippedCards[card.id];
            const currentRating = ratings[card.id] || 'unrated';
            return (
              <div 
                key={card.id} 
                className={`flashcard-scene ${isFlipped ? 'is-flipped' : ''}`}
                onClick={() => handleCardFlip(card.id)}
              >
                <div className="flashcard-inner">
                  {/* Front Face */}
                  <div className="flashcard-face flashcard-face-front">
                    <div className={`flashcard-subject-tag ${card.subject}`}>
                      {card.subject}
                    </div>
                    <h3 className="flashcard-title">{card.title}</h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 'bold' }}>
                      Click to reveal formula ➔
                    </div>
                  </div>

                  {/* Back Face */}
                  <div className="flashcard-face flashcard-face-back">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--primary)' }}>Formula</span>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: '800', 
                        color: currentRating === 'easy' ? 'var(--success)' : currentRating === 'medium' ? '#d97706' : currentRating === 'hard' ? 'var(--danger)' : 'var(--text-muted)',
                        textTransform: 'uppercase'
                      }}>
                        {currentRating}
                      </span>
                    </div>

                    <div className="flashcard-content">
                      {card.content}
                    </div>

                    <div className="flashcard-actions">
                      <button 
                        className="flashcard-rating-btn easy"
                        onClick={(e) => handleRateCard(card.id, 'easy', e)}
                      >
                        Easy 🙂
                      </button>
                      <button 
                        className="flashcard-rating-btn medium"
                        onClick={(e) => handleRateCard(card.id, 'medium', e)}
                      >
                        Medium 😐
                      </button>
                      <button 
                        className="flashcard-rating-btn hard"
                        onClick={(e) => handleRateCard(card.id, 'hard', e)}
                      >
                        Hard 🙁
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '2px dashed var(--border-light)' }}>
          <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-muted)' }}>No flashcards found matching filters.</p>
        </div>
      )}
    </div>
  );
}
