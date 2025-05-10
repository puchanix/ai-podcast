import { useState, useRef, useEffect } from 'react';

export default function TestRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [transcription, setTranscription] = useState('');
  const [status, setStatus] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const startRecording = async () => {
    setStatus('Requesting microphone access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        } 
      });
      
      streamRef.current = stream;
      setStatus('Microphone access granted');
      
      let mimeType = '';
      
      if (isIOS) {
        try {
          mimeType = 'audio/mp4';
          mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
          setStatus('Using audio/mp4 for iOS');
        } catch (e) {
          setStatus('iOS fallback to default mime type');
          mediaRecorderRef.current = new MediaRecorder(stream);
        }
      } else {
        try {
          mimeType = 'audio/webm';
          mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
          setStatus('Using audio/webm');
        } catch (e) {
          try {
            mimeType = 'audio/mp4';
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            setStatus('Using audio/mp4');
          } catch (e) {
            setStatus('Using default mime type');
            mediaRecorderRef.current = new MediaRecorder(stream);
          }
        }
      }
      
      chunksRef.current = [];
      
      const timeslice = isIOS ? 500 : 1000;
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          setStatus(`Chunk received: ${e.data.size} bytes`);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        setStatus(`Recording stopped. Total chunks: ${chunksRef.current.length}`);
        
        let blob;
        let filename;
        
        if (isIOS) {
          blob = new Blob(chunksRef.current, { type: 'audio/m4a' });
          filename = 'test.m4a';
        } else {
          blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
          filename = 'test.webm';
        }
        
        setStatus(`Audio blob size: ${blob.size} bytes`);
        
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        
        const formData = new FormData();
        formData.append('audio', blob, filename);
        if (isIOS) {
          formData.append('isIOS', 'true');
        }
        
        setStatus('Transcribing...');
        
        try {
          const res = await fetch('/api/transcribe', { 
            method: 'POST', 
            body: formData 
          });
          
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API returned ${res.status}: ${errorText}`);
          }
          
          const json = await res.json();
          setTranscription(json.text || 'No transcription returned');
          setStatus('Transcription complete');
        } catch (err) {
          console.error('Transcription error:', err);
          setStatus(`Transcription error: ${err.message}`);
        }
      };
      
      mediaRecorderRef.current.start(timeslice);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Microphone error:', err);
      setStatus(`Microphone error: ${err.message}`);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background-top to-background text-copy p-4 space-y-6">
      <h1 className="text-2xl font-bold">Audio Recording Test</h1>
      <p>Device: {isIOS ? 'iOS' : 'Non-iOS'}</p>
      <p>Status: {status}</p>
      
      {isRecording ? (
        <div className="flex flex-col items-center space-y-4">
          <p className="text-xl">Recording... {formatTime(recordingTime)}</p>
          <button 
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-full text-lg"
          >
            Stop Recording
          </button>
        </div>
      ) : (
        <button 
          onClick={startRecording}
          className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-full text-lg"
        >
          Start Recording
        </button>
      )}
      
      {audioURL && (
        <div className="mt-8 w-full max-w-md">
          <h2 className="text-xl font-bold mb-2">Recording Playback</h2>
          <audio src={audioURL} controls className="w-full" />
        </div>
      )}
      
      {transcription && (
        <div className="mt-8 w-full max-w-md">
          <h2 className="text-xl font-bold mb-2">Transcription</h2>
          <div className="bg-white text-black p-4 rounded">
            {transcription}
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <a href="/" className="text-blue-400 hover:underline">Back to Home</a>
      </div>
    </div>
  );
}