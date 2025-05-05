
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [storyPosition, setStoryPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const podcastAudio = useRef(null);
  const responseAudio = useRef(null);
  const promptAudio = useRef(null);
  const choiceAudio = useRef(null);
  const unlockAudio = useRef(null);
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
    podcastAudio.current.currentTime = storyPosition;
    podcastAudio.current.play();
    setIsPlaying(true);
    setShowOptions(false);
    setStatusMessage('▶️ Playing story...');
  };

  const handlePausePodcast = () => {
    if (podcastAudio.current && !podcastAudio.current.paused) {
      setStoryPosition(podcastAudio.current.currentTime);
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
    setStatusMessage('🤔 Thinking...');
    setShowOptions(false);

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
      setStatusMessage('🎙️ Da Vinci Responds');
    } catch (err) {
      console.error(err);
      setStatusMessage('⚠️ Error during request');
    } finally {
      setIsThinking(false);
    }
  };

  const startRecording = async () => {
    setStatusMessage('🎤 Recording...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json?.question) {
        handleAsk(json.question);
      } else {
        setStatusMessage('❌ Transcription failed');
      }
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 4000);
  };

  return (
    <div style={{ fontFamily: 'Arial', maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>🎧 AI Podcast</h1>
      <p style={{ fontStyle: 'italic', marginBottom: '1rem' }}>{statusMessage}</p>

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={handlePlayPodcast} disabled={isPlaying}>▶️ Play</button>
        <button onClick={handlePausePodcast}>⏸️ Pause</button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        {suggestedQuestions.map((q, i) => (
          <button key={i} onClick={() => handleAsk(q)} disabled={isThinking} style={{ display: 'block', marginBottom: 6 }}>
            {q}
          </button>
        ))}
      </div>

      <div>
        <button onClick={startRecording} disabled={isThinking}>🎤 Ask with Microphone</button>
      </div>

      <audio ref={podcastAudio} hidden preload="auto" src="/intro.mp3"></audio>
      <audio ref={responseAudio} controls style={{ width: '100%' }}></audio>
      <audio ref={promptAudio} hidden preload="auto"></audio>
      <audio ref={choiceAudio} hidden preload="auto"></audio>
      <audio ref={unlockAudio} hidden preload="auto" src="/silent.mp3"></audio>
    </div>
  );
}
