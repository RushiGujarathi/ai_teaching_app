import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ChatPage     from './pages/ChatPage';
import QuizPage     from './pages/QuizPage';
import LessonPage   from './pages/LessonPage';
import ProgressPage from './pages/ProgressPage';
import MLPage       from './pages/MLPage';       // NEW
import './App.css';

function App() {
  const [studentName, setStudentName] = useState(localStorage.getItem('studentName') || '');
  const [nameInput, setNameInput] = useState('');

  const handleSetName = () => {
    if (nameInput.trim()) {
      setStudentName(nameInput.trim());
      localStorage.setItem('studentName', nameInput.trim());
    }
  };

  if (!studentName) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-icon">🎓</div>
          <h1>AI Teaching Assistant</h1>
          <p>तुमचे नाव टाका / Enter your name to start</p>
          <input
            type="text"
            placeholder="Your name..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetName()}
            className="name-input"
          />
          <button onClick={handleSetName} className="btn-primary">
            Start Learning →
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <span className="nav-icon">🎓</span>
            <span>AI Teaching Assistant</span>
          </div>
          <div className="nav-links">
            <NavLink to="/chat"     className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>💬 Chat</NavLink>
            <NavLink to="/quiz"     className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>📝 Quiz</NavLink>
            <NavLink to="/lesson"   className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>📚 Lesson</NavLink>
            <NavLink to="/progress" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>📊 Progress</NavLink>
            <NavLink to="/ml"       className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>🤖 ML</NavLink>
          </div>
          <div className="nav-user">
            <span className="user-badge">👤 {studentName}</span>
            <button onClick={() => { setStudentName(''); localStorage.removeItem('studentName'); }} className="btn-logout">
              Logout
            </button>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/"         element={<Navigate to="/chat" />} />
            <Route path="/chat"     element={<ChatPage     studentName={studentName} />} />
            <Route path="/quiz"     element={<QuizPage     studentName={studentName} />} />
            <Route path="/lesson"   element={<LessonPage />} />
            <Route path="/progress" element={<ProgressPage studentName={studentName} />} />
            <Route path="/ml"       element={<MLPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
