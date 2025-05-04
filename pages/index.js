
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [statusStep, setStatusStep] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
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
    if (countdown === null) return;
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (!statusStep) return;
    const stepText = {
      transcribing: '⏳ Transcribing',
      thinking: '🧠 Thinking',
      buffering: '📡 Buffering audio',
    };
    if (countdown != null) {
      setStatusMessage(`${stepText[statusStep]}... (${countdown}s)`);
    }
  }, [statusStep, countdown]);

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
    if (podcastAudio.current && !podcastAudio.current.paused) {
      setStoryPosition(podcastAudio.current.currentTime);
    }

    stopAllAudio();
    setIsThinking(true);
    setShowOptions(false);

    try {
      setStatusStep('thinking');
      setCountdown(4);

      const response = await fetch('/api/ask-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to stream audio response');
      }

      setStatusStep('buffering');
      setCountdown(2);

      const mediaSource = new MediaSource();
      responseAudio.current.src = URL.createObjectURL(mediaSource);
      responseAudio.current.load();
      responseAudio.current.play().catch((e) => {
        console.error('Playback error:', e);
        setStatusMessage('❌ Playback error. Tap to resume.');
      });

      mediaSource.addEventListener('sourceopen', () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        const reader = response.body.getReader();

        function pump() {
          reader.read().then(({ done, value }) => {
            if (done) {
              mediaSource.endOfStream();
              setStatusMessage('🧠 What next?');
              choiceAudio.current.play();
              setShowOptions(true);
              setIsThinking(false);
              return;
            }
            if (value) {
              sourceBuffer.appendBuffer(value);
            }
            pump();
          });
        }

        pump();
      });
    } catch (err) {
      console.error(err);
      setStatusMessage('❌ Error streaming answer');
      setIsThinking(false);
    }
  };

  const handleVoiceQuestion = async () => {
    stopAllAudio();
    setStatusMessage('🎤 Listening...');
    setIsListening(true);

    try {
      const mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        setStatusMessage('❌ Your browser does not support required audio format.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setStatusStep('transcribing');
        setCountdown(3);

        const blob = new Blob(chunks, { type: mimeType });
        const formData = new FormData();
        formData.append('audio', blob, 'question.webm');

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.transcript) {
          handleAsk(data.transcript);
        } else {
          setStatusMessage('❌ Could not understand audio');
        }
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000);
    } catch (err) {
      console.error(err);
      setStatusMessage('❌ Microphone error');
      setIsListening(false);
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
      <p className="mb-4 text-gray-700 font-medium text-lg">{statusMessage}</p>

      <div className="mb-4 flex gap-4">
        {isPlaying ? (
          <button onClick={handlePausePodcast} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition transform hover:scale-105 active:scale-95">
            ⏸️ Pause
          </button>
        ) : (
          <button onClick={handlePlayPodcast} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition transform hover:scale-105 active:scale-95">
            ▶️ Start Conversation
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

      <div className="mt-6">
        <button
          onClick={handleVoiceQuestion}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow font-medium transition transform hover:scale-105 active:scale-95"
        >
          🎤 Ask Your Own Question
        </button>
      </div>

      <audio ref={podcastAudio} src="/podcast.mp3" preload="auto" playsInline />
      <audio ref={responseAudio} preload="auto" playsInline controls style={{ display: 'none' }} />
      <audio ref={promptAudio} src="/acknowledge.mp3" hidden preload="auto" playsInline />
      <audio ref={choiceAudio} src="/choice.mp3" hidden preload="auto" playsInline />
      <audio ref={unlockAudio} src="/unlock.mp3" hidden preload="auto" playsInline />
    </div>
  );
}
