
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [storyMode, setStoryMode] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const responseAudio = useRef(null);
  const promptAudio = useRef(null);
  const choiceAudio = useRef(null);
  const unlockAudio = useRef(null);
  const storyAudio = useRef(null);
  const podcastAudio = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const prompt = new Audio('/prompt.mp3');
    const choice = new Audio('/choice.mp3');
    const unlock = new Audio('/unlockreveri.mp3');
    promptAudio.current = prompt;
    choiceAudio.current = choice;
    unlockAudio.current = unlock;
  }, []);

  function stopAllAudio() {
    [responseAudio, promptAudio, choiceAudio, unlockAudio, storyAudio, podcastAudio].forEach(ref => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    });
  }

  async function handleAsk(question) {
    stopAllAudio();
    setIsThinking(true);
    setStatusMessage("🤖 Thinking...");
    setShowOptions(false);

    try {
      const res = await fetch("/api/ask-stream?question=" + encodeURIComponent(question));
      if (!res.ok || !res.body) throw new Error("Stream fetch failed");
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createBufferSource();
      const reader = res.body.getReader();
      let chunks = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
      }

      const fullArray = new Uint8Array(receivedLength);
      let position = 0;
      for (let chunk of chunks) {
        fullArray.set(chunk, position);
        position += chunk.length;
      }

      const audioBuffer = await audioContext.decodeAudioData(fullArray.buffer);
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      source.onended = () => {
        setIsThinking(false);
        setStatusMessage("");
        setShowOptions(true);
      };
    } catch (err) {
      console.error("Streaming playback failed:", err);
      setIsThinking(false);
      setStatusMessage("❌ Playback failed");
    }
  }

  async function startRecording() {
    setIsThinking(true);
    setStatusMessage("🎤 Listening...");
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob);

        setStatusMessage("🧠 Transcribing...");

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        const question = data.text?.trim();
        if (question) {
          handleAsk(question);
        } else {
          setStatusMessage("❌ Transcription failed");
          setIsThinking(false);
        }
      };

      mediaRecorder.start();

      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, 5000);
    } catch (err) {
      console.error("Recording error:", err);
      setStatusMessage("❌ Recording failed");
      setIsThinking(false);
    }
  }

  const suggestedQuestions = [
    "If you were living today, what would you be doing?",
    "Do you think AI can create true art?",
    "Do you think we will ever have a colony on Mars?",
    "What inspired you to paint the Mona Lisa?",
    "What is your favorite animal?"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-yellow-300 flex flex-col items-center justify-center text-center p-4 space-y-6">
      <h1 className="text-4xl font-bold text-gray-800">🎧 Talk to Da Vinci</h1>
      <img src="/davinci.png" alt="Da Vinci" className="w-48 h-48 rounded-full shadow-lg" />
      {!audioUnlocked && (
        <button
          onClick={() => {
            unlockAudio.current?.play();
            setAudioUnlocked(true);
            setShowOptions(true);
          }}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
        >
          🔓 Unlock Audio
        </button>
      )}
      {isThinking && <p className="text-blue-600 font-medium">{statusMessage}</p>}
      {storyMode && (
        <div>
          <button
            onClick={() => {
              stopAllAudio();
              const audio = new Audio("/story.mp3");
              storyAudio.current = audio;
              audio.play();
            }}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded shadow"
          >
            ▶️ Play Story
          </button>
        </div>
      )}
      <div className="space-y-4">
        {showOptions &&
          suggestedQuestions.map((q, index) => (
            <button
              key={index}
              onClick={() => handleAsk(q)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow"
            >
              {q}
            </button>
          ))}
      </div>
      <div className="mt-6">
        <button
          onClick={startRecording}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow"
        >
          🎤 Ask with your voice
        </button>
      </div>
      <audio ref={promptAudio} hidden preload="auto" />
      <audio ref={choiceAudio} hidden preload="auto" />
      <audio ref={unlockAudio} hidden preload="auto" src="/silent.mp3" />
    </div>
  );
}
