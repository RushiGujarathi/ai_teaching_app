import React, { useState, useEffect } from 'react';
import { getProgress, listStudents, createStudent, getQuizAttempts } from '../services/api';

export default function ProgressPage({ studentName }) {
  const [progress, setProgress] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(studentName);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { if (selectedStudent) loadProgress(selectedStudent); }, [selectedStudent]);

  const loadStudents = async () => {
    try { const res = await listStudents(); setStudents(res.data.students); } catch {}
  };

  const loadProgress = async (name) => {
    setLoading(true);
    try {
      const [progRes, attRes] = await Promise.all([getProgress(name), getQuizAttempts(name)]);
      setProgress(progRes.data); setAttempts(attRes.data.attempts);
    } catch { setProgress(null); }
    finally { setLoading(false); }
  };

  const handleAddStudent = async () => {
    if (!newName.trim()) return;
    try {
      await createStudent({ name: newName.trim(), subject: newSubject, grade: newGrade });
      setMessage(`✅ Student "${newName}" added!`);
      setNewName(''); setNewSubject(''); setNewGrade(''); setShowAddForm(false);
      loadStudents(); setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('❌ Student may already exist.'); setTimeout(() => setMessage(''), 3000); }
  };

  const getScoreColor = (pct) => pct >= 80 ? '#48bb78' : pct >= 60 ? '#ecc94b' : '#fc8181';
  const getGrade = (pct) => pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D';

  return (
    <div>
      <div className="page-header"><h2>📊 Student Progress Tracker</h2><p>Track quiz scores, chat activity, and learning progress</p></div>
      <div className="grid-2">
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h4 style={{ color: '#4a5568' }}>👥 Students</h4>
              <button className="btn-secondary" onClick={() => setShowAddForm(!showAddForm)} style={{ fontSize: 13, padding: '6px 14px' }}>
                {showAddForm ? 'Cancel' : '+ Add Student'}
              </button>
            </div>
            {message && <div style={{ background: message.startsWith('✅') ? '#f0fff4' : '#fff5f5', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 14, color: message.startsWith('✅') ? '#276749' : '#c53030' }}>{message}</div>}
            {showAddForm && (
              <div style={{ background: '#f7fafc', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <input className="form-input" placeholder="Student name *" value={newName} onChange={e => setNewName(e.target.value)} style={{ marginBottom: 8 }} />
                <input className="form-input" placeholder="Subject (optional)" value={newSubject} onChange={e => setNewSubject(e.target.value)} style={{ marginBottom: 8 }} />
                <input className="form-input" placeholder="Grade (optional)" value={newGrade} onChange={e => setNewGrade(e.target.value)} style={{ marginBottom: 10 }} />
                <button className="btn-primary" onClick={handleAddStudent} style={{ padding: '10px 20px', fontSize: 14 }}>Add Student</button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div onClick={() => setSelectedStudent(studentName)}
                style={{ padding: '12px 14px', background: selectedStudent === studentName ? '#ebf4ff' : '#f7fafc', borderRadius: 10, cursor: 'pointer', border: selectedStudent === studentName ? '2px solid #667eea' : '2px solid transparent' }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>👤 {studentName} (You)</p>
              </div>
              {students.filter(s => s.name !== studentName).map(s => (
                <div key={s.id} onClick={() => setSelectedStudent(s.name)}
                  style={{ padding: '12px 14px', background: selectedStudent === s.name ? '#ebf4ff' : '#f7fafc', borderRadius: 10, cursor: 'pointer', border: selectedStudent === s.name ? '2px solid #667eea' : '2px solid transparent' }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>👤 {s.name}</p>
                  {s.subject && <p style={{ fontSize: 12, color: '#a0aec0' }}>{s.subject} {s.grade && `• ${s.grade}`}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          {loading && <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}><div style={{ fontSize: 40 }}>⏳</div><p style={{ color: '#a0aec0' }}>Loading progress...</p></div>}
          {!loading && progress && (
            <>
              <h3 style={{ marginBottom: 16, color: '#1a202c' }}>📈 {selectedStudent}'s Progress</h3>
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-number">{progress.quiz_stats?.total_quizzes || 0}</div><div className="stat-label">Quizzes Taken</div></div>
                <div className="stat-card"><div className="stat-number" style={{ color: getScoreColor(progress.quiz_stats?.avg_score || 0) }}>{progress.quiz_stats?.avg_score ? Math.round(progress.quiz_stats.avg_score) : 0}%</div><div className="stat-label">Average Score</div></div>
                <div className="stat-card"><div className="stat-number" style={{ color: '#48bb78' }}>{progress.quiz_stats?.best_score ? Math.round(progress.quiz_stats.best_score) : 0}%</div><div className="stat-label">Best Score</div></div>
                <div className="stat-card"><div className="stat-number" style={{ color: '#805ad5' }}>{progress.chat_stats?.total_chats || 0}</div><div className="stat-label">Questions Asked</div></div>
              </div>
              {progress.quiz_stats?.avg_score > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <p style={{ fontWeight: 600, marginBottom: 10, color: '#4a5568' }}>Overall Performance</p>
                  <div style={{ background: '#e2e8f0', borderRadius: 20, height: 20, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round(progress.quiz_stats.avg_score)}%`, background: `linear-gradient(90deg, ${getScoreColor(progress.quiz_stats.avg_score)}, ${getScoreColor(progress.quiz_stats.avg_score)}aa)`, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                      <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{getGrade(progress.quiz_stats.avg_score)}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="card">
                <h4 style={{ marginBottom: 14, color: '#4a5568' }}>🕐 Recent Quiz Attempts</h4>
                {attempts.length === 0 ? <p style={{ color: '#a0aec0', textAlign: 'center', padding: '20px 0' }}>No quizzes taken yet</p> :
                  attempts.map((a, i) => {
                    const pct = Math.round((a.score / a.total) * 100);
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < attempts.length - 1 ? '1px solid #f0f4f8' : 'none' }}>
                        <div><p style={{ fontWeight: 600, fontSize: 14 }}>{a.topic || 'Quiz'}</p><p style={{ fontSize: 12, color: '#a0aec0' }}>{new Date(a.created_at).toLocaleDateString()}</p></div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ background: getScoreColor(pct) + '22', color: getScoreColor(pct), padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>{pct}%</span>
                          <p style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>{a.score}/{a.total} correct</p>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </>
          )}
          {!loading && !progress && <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aec0' }}><div style={{ fontSize: 64, marginBottom: 16 }}>📊</div><p>Select a student to view their progress</p></div>}
        </div>
      </div>
    </div>
  );
}
