import React, { useState, useRef, useEffect } from 'react';
import { sendChat } from '../services/api';
import ReactMarkdown from 'react-markdown';

const SUBJECTS = ['General', 'Mathematics', 'Science', 'English', 'History', 'Geography', 'Computer Science', 'Physics', 'Chemistry', 'Biology'];

export default function ChatPage({ studentName }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hello ${studentName}! 👋 I'm your AI Teaching Assistant. Ask me anything about your studies! 📚` }
  ]);
  const [input, setInput] = useState('');
  const [subject, setSubject] = useState('General');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const history = messages.filter(m => m.role !== 'system').slice(-10);
      const res = await sendChat({ student_name: studentName, message: userMsg, subject: subject !== 'General' ? subject : null, history });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error connecting to AI. Please check the backend is running.' }]);
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <div>
      <div className="page-header"><h2>💬 AI Chat Assistant</h2><p>Ask questions, get explanations, and learn with AI</p></div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <label style={{ fontWeight: 600, color: '#4a5568', fontSize: 14 }}>Subject:</label>
        <select className="form-select" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: 200 }}>
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="chat-container card" style={{ padding: 16 }}>
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
            </div>
          ))}
          {loading && <div className="message assistant"><div className="typing-dots"><span /><span /><span /></div></div>}
          <div ref={bottomRef} />
        </div>
        <div className="chat-input-row">
          <textarea className="chat-input" placeholder="Ask anything... (Enter to send, Shift+Enter for newline)" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} />
          <button className="chat-send-btn" onClick={handleSend} disabled={loading || !input.trim()}>➤</button>
        </div>
      </div>
    </div>
  );
}
