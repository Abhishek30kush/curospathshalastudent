export const formatTime = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const getScoreColor = (score, max) => {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.8) return '#10b981'; // var(--success)
  if (pct >= 0.5) return '#f59e0b'; // var(--warning)
  return '#ef4444'; // var(--danger)
};

export const getGrade = (score, max) => {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
};

export const evaluateTest = (questions, answers) => {
  let score = 0;
  let maxScore = 0;
  const subjectBreakdown = {};

  questions.forEach(q => {
    const qMarks = Number(q.marks) !== undefined && !isNaN(Number(q.marks)) ? Number(q.marks) : 4;
    const rawNeg = q.negativeMarks !== undefined && !isNaN(Number(q.negativeMarks)) ? Number(q.negativeMarks) : -1;
    const qNegMarks = rawNeg > 0 ? -rawNeg : rawNeg;
    const subject = q.subject || 'General';

    if (!subjectBreakdown[subject]) {
      subjectBreakdown[subject] = { correct: 0, wrong: 0, skipped: 0, score: 0, max: 0 };
    }
    subjectBreakdown[subject].max += qMarks;
    maxScore += qMarks;

    const userAns = answers[q.id];

    if (q.type === 'numerical') {
      const isCorrect = userAns && String(userAns).trim().toLowerCase() === String(q.correctAnswer || q.correctOption).trim().toLowerCase();
      if (isCorrect) {
        score += qMarks;
        subjectBreakdown[subject].correct += 1;
        subjectBreakdown[subject].score += qMarks;
      } else if (userAns) {
        score += qNegMarks;
        subjectBreakdown[subject].wrong += 1;
        subjectBreakdown[subject].score += qNegMarks;
      } else {
        subjectBreakdown[subject].skipped += 1;
      }
    } else if (q.type === 'multi_correct') {
      const parseOptions = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(v => String(v).trim().toUpperCase()).sort();
        return String(val).split(',').map(v => String(v).trim().toUpperCase()).sort();
      };
      
      const userList = parseOptions(userAns);
      const correctList = parseOptions(q.correctOption);
      const isCorrect = userList.length > 0 && userList.length === correctList.length && userList.every((v, i) => v === correctList[i]);

      if (isCorrect) {
        score += qMarks;
        subjectBreakdown[subject].correct += 1;
        subjectBreakdown[subject].score += qMarks;
      } else if (userList.length > 0) {
        score += qNegMarks;
        subjectBreakdown[subject].wrong += 1;
        subjectBreakdown[subject].score += qNegMarks;
      } else {
        subjectBreakdown[subject].skipped += 1;
      }
    } else {
      if (userAns === q.correctOption) {
        score += qMarks;
        subjectBreakdown[subject].correct += 1;
        subjectBreakdown[subject].score += qMarks;
      } else if (userAns) {
        score += qNegMarks;
        subjectBreakdown[subject].wrong += 1;
        subjectBreakdown[subject].score += qNegMarks;
      } else {
        subjectBreakdown[subject].skipped += 1;
      }
    }
  });

  return { score, maxScore, subjectBreakdown };
};
