
import { useState, useRef } from 'react';

export default function Home() {
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showOptions, setShowOptions] = useState(true);

  const stopAllAudio = () => {
    document.querySelectorAll('audio').forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  const handleAsk = async (question) => {
    stopAllAudio();
    setIsThinking(true);
    setStatusMessage('🤖 Thinking...');
    setShowOptions(false);

    try {
      const audio = new Audio('/api/ask-stream?question=' + encodeURIComponent(question));
      audio.play();
      audio.onended = () => {
        setIsThinking(false);
        setStatusMessage('');
        setShowOptions(true);
      };
      audio.onerror = (err) => {
        console.error('Audio playback failed:', err);
        setIsThinking(false);
        setStatusMessage('❌ Playback failed');
      };
    } catch (err) {
      console.error('Unexpected error:', err);
      setIsThinking(false);
      setStatusMessage('❌ Unexpected error');
    }
  };

  const cannedQuestions = [
    "What is creativity?",
    "How do you stay inspired?",
    "What advice do you have for young artists?",
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-3xl font-bold mb-6">🎙️ Ask Da Vinci</h1>
      {isThinking && <p className="text-blue-600 mb-4">{statusMessage}</p>}
      <div className="space-y-4">
        {showOptions && cannedQuestions.map((q, index) => (
          <button
            key={index}
            onClick={() => handleAsk(q)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
