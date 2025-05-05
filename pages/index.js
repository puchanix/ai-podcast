
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [responseAudio, setResponseAudio] = useState(null);
  const [promptAudio, setPromptAudio] = useState(null);
  const [question, setQuestion] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const streamingRef = useRef({ mediaSource: null, sourceBuffer: null, queue: [] });

  const questions = [
    "If you were living today, what would you be doing?",
    "Do you think AI can create true art?",
    "Do you think we will ever have a colony on Mars?",
    "What inspired you to paint the Mona Lisa?",
    "What is your favorite animal?"
  ];

  const playAudio = (url) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  };

  const appendToBuffer = () => {
    const { sourceBuffer, queue } = streamingRef.current;
    if (!sourceBuffer || !queue.length || sourceBuffer.updating) return;
    sourceBuffer.appendBuffer(queue.shift());
  };

  const handlePrewritten = async (q) => {
    setStatusMessage('Thinking...');
    setIsThinking(true);
    setQuestion(q);

    const audio = audioRef.current;
    const mediaSource = new MediaSource();
    audio.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', async () => {
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      streamingRef.current.sourceBuffer = sourceBuffer;
      streamingRef.current.queue = [];
      sourceBuffer.mode = 'sequence';
      sourceBuffer.addEventListener('updateend', appendToBuffer);

      const res = await fetch('/api/ask-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });

      const reader = res.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamingRef.current.queue.push(value);
          appendToBuffer();
        }
        setIsThinking(false);
      };
      pump();
    });

    audio.play();
  };

  const startRecording = async () => {
    setIsRecording(true);
    setStatusMessage('Recording...');
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
        setQuestion(json.question);
        setStatusMessage('Thinking...');
        const r = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: json.question })
        });
        const data = await r.json();
        setPromptAudio(data.promptUrl);
        setResponseAudio(data.audioUrl);
        setStatusMessage('Playing');
        playAudio(data.audioUrl);
      } else {
        setStatusMessage('Transcription failed');
      }
      setIsRecording(false);
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 4000);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 600, margin: '2rem auto', padding: '1rem' }}>
      <h1>🎙️ AI Podcast</h1>
      <p><em>Status:</em> {statusMessage}</p>

      <h3>Suggested Questions</h3>
      {questions.map((q, i) => (
        <button key={i} onClick={() => handlePrewritten(q)} disabled={isThinking} style={{ marginBottom: '0.5rem', display: 'block' }}>
          {q}
        </button>
      ))}

      <h3>Custom Question</h3>
      <button onClick={startRecording} disabled={isThinking || isRecording}>
        🎤 Record Your Question
      </button>

      <audio ref={audioRef} controls style={{ width: '100%', marginTop: '2rem' }}></audio>
    </div>
  );
}
