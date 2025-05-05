
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
    const prompt = new Audio('/prompt.mp3');
    const choice = new Audio('/choice.mp3');
    const unlock = new Audio('/unlockreveri.mp3');
    promptAudio.current = prompt;
    choiceAudio.current = choice;
    unlockAudio.current = unlock;
  }, []);

  function stopAllAudio() {
    [podcastAudio, responseAudio, promptAudio, choiceAudio, unlockAudio].forEach(ref => {
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
      const audio = new Audio("/api/ask-stream?question=" + encodeURIComponent(question));
      audio.play();
      audio.onended = () => {
        setIsThinking(false);
        setStatusMessage("");
        setShowOptions(true);
      };
      audio.onerror = (err) => {
        console.error("Audio playback failed:", err);
        setIsThinking(false);
        setStatusMessage("❌ Playback failed");
      };
    } catch (err) {
      console.error("Unexpected error:", err);
      setIsThinking(false);
      setStatusMessage("❌ Unexpected error");
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gradient-to-br from-yellow-100 to-yellow-300 text-center">
      <h1 className="text-4xl font-bold mb-4">🎙️ Ask Da Vinci</h1>
      {!audioUnlocked ? (
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-6"
          onClick={() => {
            unlockAudio.current?.play();
            setAudioUnlocked(true);
            setShowOptions(true);
          }}
        >
          ▶️ Start Listening
        </button>
      ) : null}

      {isThinking && <p className="text-blue-800 font-semibold text-lg">{statusMessage}</p>}

      {showOptions && (
        <div className="space-y-4">
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleAsk(question)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow"
            >
              {question}
            </button>
          ))}
          <button
            onClick={startRecording}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded shadow"
          >
            🎤 Ask with your voice
          </button>
        </div>
      )}
    </div>
  );
}
