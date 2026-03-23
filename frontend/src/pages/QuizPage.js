import React, { useState } from 'react';
import { generateQuiz, submitQuiz } from '../services/api';

export default function QuizPage({ studentName }) {
  const [step, setStep] = useState('setup');
  const [topic, setTopic] = useState('');
  const [numQ, setNumQ] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await generateQuiz({ topic, num_questions: numQ, difficulty });
      setQuizData(res.data); setAnswers({}); setStep('quiz');
    } catch { setError('Failed to generate quiz. Make sure the backend is running and API key is set.'); }
    finally { setLoading(false); }
  };

  const handleAnswer = (qId, option) => { if (results) return; setAnswers(prev => ({ ...prev, [qId]: option[0] })); };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quizData.questions.length) { alert('Please answer all questions first!'); return; }
    setLoading(true);
    try {
      const res = await submitQuiz({ student_name: studentName, quiz_id: quizData.quiz_id, answers, questions: quizData.questions });
      setResults(res.data); setStep('results');
    } catch { setError('Failed to submit quiz.'); }
    finally { setLoading(false); }
  };

  const getOptionClass = (q, option) => {
    const letter = option[0];
    if (!results) return answers[q.id] === letter ? 'quiz-option selected' : 'quiz-option';
    const res = results.results.find(r => r.question === q.question);
    if (letter === res?.correct_answer) return 'quiz-option correct';
    if (answers[q.id] === letter && letter !== res?.correct_answer) return 'quiz-option wrong';
    return 'quiz-option';
  };

  if (step === 'setup') return (
    <div>
      <div className="page-header"><h2>📝 Quiz Generator</h2><p>AI will create a custom quiz for you</p></div>
      <div className="card" style={{ maxWidth: 500 }}>
        <div className="form-group">
          <label>Topic / Subject</label>
          <input className="form-input" placeholder="e.g. Photosynthesis, World War 2, Algebra..." value={topic} onChange={e => setTopic(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label>Number of Questions</label>
            <select className="form-select" value={numQ} onChange={e => setNumQ(Number(e.target.value))}>
              {[3,5,7,10].map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Difficulty</label>
            <select className="form-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </div>
        </div>
        {error && <p style={{ color: '#e53e3e', marginBottom: 12, fontSize: 14 }}>{error}</p>}
        <button className="btn-primary" onClick={handleGenerate} disabled={loading || !topic.trim()}>
          {loading ? '⏳ Generating Quiz...' : '🚀 Generate Quiz'}
        </button>
      </div>
    </div>
  );

  if (step === 'quiz') return (
    <div>
      <div className="page-header">
        <h2>📝 {quizData?.topic}</h2>
        <p>{quizData?.difficulty?.toUpperCase()} • {quizData?.questions?.length} Questions • Answered: {Object.keys(answers).length}/{quizData?.questions?.length}</p>
      </div>
      <div className="card">
        {quizData?.questions?.map((q, i) => (
          <div key={q.id} className="quiz-question">
            <h4>{i + 1}. {q.question}</h4>
            <div className="quiz-options">
              {q.options.map(opt => (
                <button key={opt} className={getOptionClass(q, opt)} onClick={() => handleAnswer(q.id, opt)}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : '✅ Submit Quiz'}</button>
          <button className="btn-secondary" onClick={() => setStep('setup')}>← Back</button>
        </div>
      </div>
    </div>
  );

  if (step === 'results') return (
    <div>
      <div className="page-header"><h2>🏆 Quiz Results</h2></div>
      <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>{results.percentage >= 70 ? '🎉' : results.percentage >= 50 ? '👍' : '📖'}</div>
        <div style={{ fontSize: 48, fontWeight: 700, color: results.percentage >= 70 ? '#48bb78' : results.percentage >= 50 ? '#ecc94b' : '#fc8181' }}>
          {results.percentage}%
        </div>
        <p style={{ color: '#718096' }}>{results.score} / {results.total} correct</p>
      </div>
      <div className="card">
        {results.results.map((r, i) => (
          <div key={i} style={{ marginBottom: 20, padding: 16, background: r.is_correct ? '#f0fff4' : '#fff5f5', borderRadius: 10, borderLeft: `4px solid ${r.is_correct ? '#48bb78' : '#fc8181'}` }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>{i + 1}. {r.question}</p>
            <p style={{ fontSize: 14 }}>Your answer: <strong>{r.your_answer}</strong> {r.is_correct ? '✅' : '❌'}</p>
            {!r.is_correct && <p style={{ fontSize: 14 }}>Correct: <strong>{r.correct_answer}</strong></p>}
            {r.explanation && <p style={{ fontSize: 13, color: '#718096', marginTop: 6 }}>💡 {r.explanation}</p>}
          </div>
        ))}
        <button className="btn-primary" onClick={() => { setStep('setup'); setResults(null); }}>Try Another Quiz →</button>
      </div>
    </div>
  );
}
