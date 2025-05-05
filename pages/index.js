
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [storyPosition, setStoryPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const podcastAudio = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const suggestedQuestions = [
    "If you were living today, what would you be doing?",
    "Do you think AI can create true art?",
    "Do you think we will ever have a colony on Mars?",
    "What inspired you to paint the Mona Lisa?",
    "What is your favorite animal?"
  ];

  useEffect(() => {
    const unlock = () => {
      if (!audioUnlocked && podcastAudio.current) {
        podcastAudio.current.play().catch(() => {});
        podcastAudio.current.pause();
        setAudioUnlocked(true);
      }
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, [audioUnlocked]);

  const stopAllAudio = () => {
    if (podcastAudio.current) podcastAudio.current.pause();
    setIsPlaying(false);
  };

  const playStreamedAudio = async (text) => {
    try {
      setIsThinking(true);
      setStatusMessage("Thinking...");

      const response = await fetch('/api/stream-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok || !response.body) {
        console.error("Streaming playback failed: response not ok");
        return;
      }

      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const blob = new Blob(chunks, { type: 'audio/mpeg' });
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

      setStatusMessage("🎧 Answer playing...");
    } catch (error) {
      console.error("Streaming playback failed", error);
      setStatusMessage("❌ Failed to play audio");
    } finally {
      setIsThinking(false);
    }
  };

  const handleQuestionClick = async (question) => {
    stopAllAudio();
    setStatusMessage("🧠 Generating response...");
    await playStreamedAudio(question);
  };

  return (
    <div className="p-6 font-sans text-center">
      <h1 className="text-2xl font-bold mb-4">🎙️ Ask Leonardo da Vinci</h1>
      <div className="grid gap-4 mb-6">
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            className="p-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700"
            onClick={() => handleQuestionClick(q)}
          >
            {q}
          </button>
        ))}
      </div>
      <p className="text-gray-600">{statusMessage}</p>
      <audio ref={podcastAudio} hidden preload="auto" />
    </div>
  );
}
