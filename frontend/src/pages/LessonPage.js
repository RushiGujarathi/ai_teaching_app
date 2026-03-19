import React, { useState, useEffect } from 'react';
import { generateLesson, getAllLessons, getLesson } from '../services/api';

const GRADES = ['Grade 1-2', 'Grade 3-4', 'Grade 5-6', 'Grade 7-8', 'Grade 9-10', 'Grade 11-12', 'College'];
const DURATIONS = ['30 minutes', '45 minutes', '60 minutes', '90 minutes'];

export default function LessonPage() {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('Grade 5-6');
  const [duration, setDuration] = useState('45 minutes');
  const [lesson, setLesson] = useState(null);
  const [savedLessons, setSavedLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSavedLessons();
  }, []);

  const loadSavedLessons = async () => {
    try {
      const res = await getAllLessons();
      setSavedLessons(res.data.lessons);
    } catch {}
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await generateLesson({ topic, grade_level: grade, duration });
      setLesson(res.data);
      loadSavedLessons();
    } catch (err) {
      setError('Failed to generate lesson. Check backend + API key.');
    } finally {
      setLoading(false);
    }
  };

  const loadLesson = async (id) => {
    try {
      const res = await getLesson(id);
      setLesson(res.data.content);
    } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <h2>📚 Lesson Plan Creator</h2>
        <p>AI generates complete lesson plans for teachers</p>
      </div>

      <div className="grid-2">
        {/* Left: Form + History */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label>Lesson Topic</label>
              <input
                className="form-input"
                placeholder="e.g. Photosynthesis, French Revolution..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Grade Level</label>
              <select className="form-select" value={grade} onChange={e => setGrade(e.target.value)}>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Duration</label>
              <select className="form-select" value={duration} onChange={e => setDuration(e.target.value)}>
                {DURATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            {error && <p style={{ color: '#e53e3e', marginBottom: 12, fontSize: 14 }}>{error}</p>}
            <button className="btn-primary" onClick={handleGenerate} disabled={loading || !topic.trim()}>
              {loading ? '⏳ Generating...' : '✨ Generate Lesson Plan'}
            </button>
          </div>

          {savedLessons.length > 0 && (
            <div className="card">
              <h4 style={{ marginBottom: 14, color: '#4a5568' }}>📋 Saved Lessons</h4>
              {savedLessons.map(l => (
                <div
                  key={l.id}
                  onClick={() => loadLesson(l.id)}
                  style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: 8, marginBottom: 8, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ebf4ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f7fafc'}
                >
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{l.topic}</p>
                  <p style={{ fontSize: 12, color: '#a0aec0' }}>{l.grade_level} • {l.duration}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Lesson Display */}
        <div>
          {!lesson && !loading && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aec0' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📝</div>
              <p style={{ fontSize: 16 }}>Enter a topic and click Generate to create a lesson plan</p>
            </div>
          )}
          {loading && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
              <p style={{ color: '#718096' }}>AI is creating your lesson plan...</p>
            </div>
          )}
          {lesson && !loading && (
            <div className="card">
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 4 }}>
                {lesson.topic}
              </h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <span style={{ background: '#ebf4ff', color: '#3182ce', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                  {lesson.grade_level}
                </span>
                <span style={{ background: '#faf5ff', color: '#805ad5', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                  ⏱ {lesson.duration}
                </span>
              </div>

              <div className="lesson-section">
                <h4>🎯 Learning Objectives</h4>
                <ul>{lesson.objectives?.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </div>

              <div className="lesson-section">
                <h4>🧰 Materials Needed</h4>
                <ul>{lesson.materials?.map((m, i) => <li key={i}>{m}</li>)}</ul>
              </div>

              <div className="lesson-section">
                <h4>🚀 Introduction / Hook</h4>
                <p style={{ color: '#4a5568', lineHeight: 1.7 }}>{lesson.introduction}</p>
              </div>

              <div className="lesson-section">
                <h4>📋 Main Activities</h4>
                {lesson.main_content?.map((act, i) => (
                  <div key={i} className="activity-row">
                    <span className="activity-time">{act.time}</span>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: 2, fontSize: 14 }}>{act.activity}</p>
                      <p style={{ fontSize: 13, color: '#718096' }}>{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lesson-section">
                <h4>✅ Assessment</h4>
                <p style={{ color: '#4a5568', lineHeight: 1.7 }}>{lesson.assessment}</p>
              </div>

              {lesson.homework && (
                <div className="lesson-section">
                  <h4>📖 Homework</h4>
                  <p style={{ color: '#4a5568', lineHeight: 1.7 }}>{lesson.homework}</p>
                </div>
              )}

              {lesson.teacher_notes && (
                <div style={{ background: '#fffbeb', borderLeft: '4px solid #f6ad55', padding: 14, borderRadius: '0 10px 10px 0' }}>
                  <p style={{ fontWeight: 600, color: '#c05621', marginBottom: 4 }}>💡 Teacher Notes</p>
                  <p style={{ fontSize: 14, color: '#744210', lineHeight: 1.6 }}>{lesson.teacher_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
