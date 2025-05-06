// pages/admin.js

// Prevent static prerendering — use SSR for this dynamic admin page
export async function getServerSideProps() {
    return { props: {} };
  }
  
  import { useState, useEffect } from 'react';
  import { personas } from '../lib/personas';
  
  export default function Admin() {
    const [selectedPersona, setSelectedPersona] = useState('daVinci');
    const [questions, setQuestions] = useState([]);
  
    // Fetch questions for the selected persona
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/question-count?character=${selectedPersona}`);
        const data = await res.json();
        setQuestions(data.questions || []);
      } catch (err) {
        console.error('Failed to fetch questions', err);
      }
    };
  
    useEffect(() => {
      fetchQuestions();
    }, [selectedPersona]);
  
    // Reset all questions across all characters
    const handleResetAll = async () => {
      if (!confirm('Are you sure you want to reset ALL questions?')) return;
      await fetch('/api/question-count', { method: 'DELETE' });
      fetchQuestions();
    };
  
    // Reset questions for current character
    const handleResetCharacter = async () => {
      if (!confirm(`Reset all questions for ${personas[selectedPersona].name}?`)) return;
      await fetch(`/api/question-count?character=${selectedPersona}`, { method: 'DELETE' });
      fetchQuestions();
    };
  
    // Delete a specific question
    const handleDeleteQuestion = async (q) => {
      if (!confirm(`Delete question: "${q}"?`)) return;
      await fetch(
        `/api/question-count?character=${selectedPersona}&question=${encodeURIComponent(q)}`,
        { method: 'DELETE' }
      );
      fetchQuestions();
    };
  
    return (
      <div className="p-6 max-w-xl mx-auto">
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
  
        <h2 className="text-xl font-semibold mb-2">Questions for {personas[selectedPersona].name}</h2>
        <ul className="space-y-2">
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
      </div>
    );
  }
  