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

  const suggestedQuestions = [
    "If you were living today, what would you be doing?",
    "Do you think AI can create true art?",
    "Do you think we will ever have a colony on Mars?",
    "What inspired you to paint the Mona Lisa?",
    "What is your favorite animal?"
  ];

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
        setStatusMessage('🧠 What next?');
        choiceAudio.current.play();
        setShowOptions(true);
        setIsThinking(false);
      };
    } catch (err) {
      console.error(err);
      setStatusMessage('❌ Error answering');
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
        setStatusMessage('⏳ Transcribing...');

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

      {!showOptions && (
        <>
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
        </>
      )}

      {showOptions && (
        <div className="mt-6 flex gap-4">
          <button
            onClick={handlePlayPodcast}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow font-medium transition transform hover:scale-105 active:scale-95"
          >
            ▶️ Continue the Story
          </button>
          <button
            onClick={() => setShowOptions(false)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow font-medium transition transform hover:scale-105 active:scale-95"
          >
            ❓ Ask Another Question
          </button>
        </div>
      )}

      <audio ref={podcastAudio} src="/podcast.mp3" hidden preload="auto" />
      <audio ref={responseAudio} hidden preload="auto" />
      <audio ref={promptAudio} src="/acknowledge.mp3" hidden preload="auto" />
      <audio ref={choiceAudio} src="/choice.mp3" hidden preload="auto" />
    </div>
  );
}
