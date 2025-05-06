import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    // Only runs in the browser
    if (typeof window === 'undefined') return;

    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/ogg; codecs=opus',
        });

        mediaRecorder.onstart = () => {
          console.log('🎤 Recording started');
          setStatus('Recording...');
          chunksRef.current = [];
        };

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/ogg' });
          console.log('🛑 Recording stopped. Blob size:', blob.size);
          setStatus('Processing...');

          const formData = new FormData();
          formData.append('audio', blob, 'input.ogg');

          console.log('📤 Uploading audio to /api/transcribe');
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            console.error('❌ Transcription failed');
            setStatus('Transcription failed.');
            return;
          }

          const data = await response.json();
          console.log('📝 Transcription result:', data.text);
          setStatus('Transcription: ' + data.text);
        };

        mediaRecorderRef.current = mediaRecorder;
      } catch (err) {
        console.error('🎙️ Mic setup failed:', err);
        setStatus('Microphone error');
      }
    }

    setupMedia();
  }, []);

  const startRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    recorder.start();
    setIsRecording(true);

    // Stop after 2s silence fallback (simplified)
    silenceTimerRef.current = setTimeout(() => {
      console.log('🤫 Detected 2s silence, stopping recorder');
      recorder.stop();
      setIsRecording(false);
    }, 4000); // You can improve this with real silence detection
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Ask Your Own Question</h1>
      <button onClick={startRecording} disabled={isRecording}>
        {isRecording ? 'Listening...' : 'Ask your own question'}
      </button>
      <p>{status}</p>
    </div>
  );
}
