import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Chat
export const sendChat      = (data) => API.post('/chat/', data);
export const getChatHistory= (name) => API.get(`/chat/history/${name}`);

// Quiz
export const generateQuiz  = (data) => API.post('/quiz/generate', data);
export const submitQuiz    = (data) => API.post('/quiz/submit', data);
export const getQuizAttempts=(name) => API.get(`/quiz/attempts/${name}`);

// Lesson
export const generateLesson= (data) => API.post('/lesson/generate', data);
export const getAllLessons  = ()     => API.get('/lesson/all');
export const getLesson     = (id)   => API.get(`/lesson/${id}`);

// Progress
export const createStudent = (data) => API.post('/progress/student', data);
export const getProgress   = (name) => API.get(`/progress/student/${name}`);
export const listStudents  = ()     => API.get('/progress/students');

export default API;
