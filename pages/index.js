
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const mediaSourceRef = useRef(null);
  const audioRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const queue = useRef([]);

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

  return (
    <div>
      <h1>🎙️ AI Podcast - Streaming</h1>
      <p>Status: {statusMessage}</p>
      {suggestedQuestions.map((q, i) => (
        <button key={i} disabled={isThinking} onClick={() => startStreaming(q)}>
          {q}
        </button>
      ))}
      <audio ref={audioRef} controls></audio>
    </div>
  );
}
