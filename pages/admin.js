// pages/admin.js
export async function getServerSideProps() {
    return { props: {} };
  }
  
  import { useState, useEffect } from 'react';
  import { personas } from '../lib/personas';
  
  export default function Admin() {
    const [selectedPersona, setSelectedPersona] = useState('daVinci');
    const [questions, setQuestions] = useState([]);
    const [feedback, setFeedback] = useState([]);
  
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/question-count?character=${selectedPersona}`);
        const data = await res.json();
        setQuestions(data.questions || []);
      } catch (err) {
        console.error('Failed to fetch questions', err);
      }
    };
  
    const fetchFeedback = async () => {
      try {
        const res = await fetch(`/api/feedback`);
        const data = await res.json();
        setFeedback(data.feedback || []);
      } catch (err) {
        console.error('Failed to fetch feedback', err);
      }
    };
  
    useEffect(() => {
      fetchQuestions();
    }, [selectedPersona]);
  
    useEffect(() => {
      fetchFeedback();
    }, []);
  
    const handleResetAll = async () => {
      if (!confirm('Are you sure you want to reset ALL questions?')) return;
      await fetch('/api/question-count', { method: 'DELETE' });
      fetchQuestions();
    };
  
    const handleResetCharacter = async () => {
      if (!confirm(`Reset all questions for ${personas[selectedPersona].name}?`)) return;
      await fetch(`/api/question-count?character=${selectedPersona}`, { method: 'DELETE' });
      fetchQuestions();
    };
  
    const handleDeleteQuestion = async (q) => {
      if (!confirm(`Delete question: "${q}"?`)) return;
      await fetch(
        `/api/question-count?character=${selectedPersona}&question=${encodeURIComponent(q)}`,
        { method: 'DELETE' }
      );
      fetchQuestions();
    };
  
    return (
      <div className="p-6 max-w-xl mx-auto text-copy">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="mb-4 flex items-center space-x-2">
          <button
            onClick={handleResetAll}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Reset All Questions
          </button>
          <select
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            className="p-2 rounded border"
          >
            {Object.values(personas).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleResetCharacter}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            Reset {personas[selectedPersona].name} Questions
          </button>
        </div>
  
        <h2 className="text-xl font-semibold mb-2">
          Questions for {personas[selectedPersona].name}
        </h2>
        <ul className="space-y-2 mb-10">
          {questions.map(({ question }, idx) => (
            <li key={idx} className="flex justify-between items-center bg-gray-100 p-2 rounded">
              <span>{question}</span>
              <button
                onClick={() => handleDeleteQuestion(question)}
                className="text-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
  
        <h2 className="text-xl font-semibold mb-2">Feedback</h2>
        <ul className="space-y-2">
          {feedback
            .slice()
            .reverse()
            .map((entry, idx) => (
              <li key={idx} className="bg-box-accent text-black p-3 rounded shadow">
                <span className="text-sm">{entry.text}</span>
              </li>
          ))}
        </ul>
      </div>
    );
  }
  
  