
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const mediaSourceRef = useRef(null);
  const audioRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const queue = useRef([]);
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

  const startStreaming = async (question) => {
    setStatusMessage('Thinking...');
    setIsThinking(true);

    if (!audioRef.current) return;
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    audioRef.current.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', async () => {
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      sourceBufferRef.current = sourceBuffer;
      sourceBuffer.mode = 'sequence';

      const res = await fetch('/api/ask-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.body) {
        setStatusMessage('Stream error');
        setIsThinking(false);
        return;
      }

      const reader = res.body.getReader();

      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          queue.current.push(value);
          appendToBuffer();
        }
      };

      pump();
    });

    audioRef.current.play();
  };

  const appendToBuffer = () => {
    if (!sourceBufferRef.current || !queue.current.length || sourceBufferRef.current.updating) return;
    sourceBufferRef.current.appendBuffer(queue.current.shift());
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
            startStreaming(json.question);
          } else {
            setStatusMessage('Transcription failed');
          }
        } catch (err) {
          console.error('Transcription fetch error:', err);
          setStatusMessage('Transcription error');
        }
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 4000);
    } catch (err) {
      console.error('Mic error:', err);
      setStatusMessage('Mic permission error');
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 600, margin: '2rem auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.8rem' }}>🎙️ AI Podcast</h1>

      <p style={{ fontStyle: 'italic', marginBottom: '1.5rem' }}>Status: {statusMessage}</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Prewritten Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              disabled={isThinking}
              onClick={() => startStreaming(q)}
              style={{ padding: '0.75rem', fontSize: '1rem', borderRadius: 6, border: '1px solid #ccc', background: '#f2f2f2' }}
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Custom Question</h2>
        <button
          disabled={isThinking}
          onClick={startRecording}
          style={{ padding: '0.75rem 1rem', fontSize: '1rem', borderRadius: 6, background: '#0088cc', color: 'white', border: 'none' }}
        >
          🎤 Ask with Microphone
        </button>
      </section>

      <audio ref={audioRef} controls style={{ width: '100%' }}></audio>
    </div>
  );
}
