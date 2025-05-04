
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [storyPosition, setStoryPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const podcastAudio = useRef(null);
  const responseAudio = useRef(null);
  const promptAudio = useRef(null);
  const choiceAudio = useRef(null);
  const unlockAudio = useRef(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const suggestedQuestions = [
    "If you were living today, what would you be doing?",
    "Do you think AI can create true art?",
    "Do you think we will ever have a colony on Mars?",
    "What inspired you to paint the Mona Lisa?",
    "What is your favorite animal?"
  ];

  useEffect(() => {
    const unlock = () => {
      if (!audioUnlocked && unlockAudio.current) {
        unlockAudio.current.play().catch(() => {});
        setAudioUnlocked(true);
      }
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, [audioUnlocked]);

  const stopAllAudio = () => {
    podcastAudio.current?.pause();
    responseAudio.current?.pause();
    promptAudio.current?.pause();
    choiceAudio.current?.pause();
    setIsPlaying(false);
  };

  const handlePlayPodcast = () => {
    stopAllAudio();
    if (podcastAudio.current) {
      podcastAudio.current.currentTime = storyPosition || 0;
      podcastAudio.current.play();
    }
    setIsPlaying(true);
    setShowOptions(false);
    setStatusMessage('▶️ Playing story...');
  };

  const handlePausePodcast = () => {
    if (podcastAudio.current && !podcastAudio.current.paused) {
      setStoryPosition(podcastAudio.current.currentTime || 0);
    }
    stopAllAudio();
    setIsPlaying(false);
    setStatusMessage('⏸️ Paused');
  };

  const handleAsk = async (question) => {
    stopAllAudio();
    setIsThinking(true);
    setStatusMessage('🤔 Thinking...');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      const speakRes = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.answer }),
      });
      const audioData = await speakRes.json();
      if (!audioData.audioUrl) throw new Error('No audio response');

      responseAudio.current.src = audioData.audioUrl;
      responseAudio.current.play();
      setStatusMessage('🎙️ Da Vinci replies');
      responseAudio.current.onended = () => {
        setIsThinking(false);
        setStatusMessage('');
        setShowOptions(true);
      };
    } catch (err) {
      console.error(err);
      setStatusMessage('❌ Error answering');
      setIsThinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 via-white to-indigo-50 px-4 py-8 flex flex-col items-center font-sans">
      <h1 className="text-5xl font-bold text-center mb-6 text-indigo-900 drop-shadow-md">
        💬 Talk with the Heroes of History
      </h1>
      <div className="flex justify-center mb-4">
        <img src="/leonardo.jpg" alt="Leonardo da Vinci" className="w-40 h-40 rounded-full border-4 border-indigo-300 shadow-xl" />
      </div>
      {statusMessage && <p className="mb-4 text-gray-700 font-medium text-lg">{statusMessage}</p>}

      <div className="mb-4 flex gap-4">
        {!isPlaying ? (
          <button onClick={handlePlayPodcast} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition transform hover:scale-105 active:scale-95">
            ▶️ Start Conversation
          </button>
        ) : (
          <button onClick={handlePausePodcast} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition transform hover:scale-105 active:scale-95">
            ⏸️ Pause
          </button>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4 text-gray-800">💡 Suggested Questions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-items-center">
        {suggestedQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleAsk(q)}
            className="bg-white hover:bg-indigo-100 text-indigo-800 px-6 py-3 rounded-xl text-sm font-medium shadow transition transform hover:scale-105 active:scale-95 border border-indigo-300"
          >
            {q}
          </button>
        ))}
      </div>

      <audio ref={podcastAudio} src="/podcast.mp3" preload="auto" playsInline />
      <audio ref={responseAudio} preload="auto" playsInline controls style={{ display: 'none' }} />
      <audio ref={promptAudio} src="/acknowledge.mp3" hidden preload="auto" playsInline />
      <audio ref={choiceAudio} src="/choice.mp3" hidden preload="auto" playsInline />
      <audio ref={unlockAudio} src="/unlock.mp3" hidden preload="auto" playsInline />
    </div>
  );
}
