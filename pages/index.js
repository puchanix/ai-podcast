
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const audioRef = useRef(null);
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
    if (audioRef.current) {
      audioRef.current.addEventListener('ended', () => {
        setStatusMessage('Ready');
        setIsThinking(false);
      });
    }
  }, []);

  const askPrewritten = async (question) => {
    setStatusMessage('Thinking...');
    setIsThinking(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (data?.audioUrl) {
        audioRef.current.src = data.audioUrl;
        audioRef.current.play();
      } else {
        setStatusMessage('No audio returned');
        setIsThinking(false);
      }
    } catch (err) {
      console.error('Ask error:', err);
      setStatusMessage('Request failed');
      setIsThinking(false);
    }
  };

  const startRecording = async () => {
    setStatusMessage('Recording...');
    try {
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

        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          const json = await res.json();
          if (json?.question) {
            askPrewritten(json.question);
          } else {
            setStatusMessage('Transcription failed');
          }
        } catch (err) {
          console.error('Transcription fetch error:', err);
          setStatusMessage('Transcription error');
        }
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 4000); // 4s recording
    } catch (err) {
      console.error('Mic error:', err);
      setStatusMessage('Mic permission error');
    }
  };

  return (
    <div>
      <h1>🎙️ AI Podcast</h1>
      <p>Status: {statusMessage}</p>

      <h3>Prewritten Questions</h3>
      {suggestedQuestions.map((q, i) => (
        <button key={i} disabled={isThinking} onClick={() => askPrewritten(q)}>
          {q}
        </button>
      ))}

      <h3>Custom Question</h3>
      <button disabled={isThinking} onClick={startRecording}>🎤 Ask with Microphone</button>

      <audio ref={audioRef} controls></audio>
    </div>
  );
}
