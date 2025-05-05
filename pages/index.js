
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showOptions, setShowOptions] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [storyMode, setStoryMode] = useState(false);

  const responseAudio = useRef(null);
  const promptAudio = useRef(null);
  const choiceAudio = useRef(null);
  const unlockAudio = useRef(null);
  const storyAudio = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const prompt = new Audio("/prompt.mp3");
      const choice = new Audio("/choice.mp3");
      const unlock = new Audio("/unlock.mp3");
      promptAudio.current = prompt;
      choiceAudio.current = choice;
      unlockAudio.current = unlock;
    }
  }, []);

  function stopAllAudio() {
    [responseAudio, promptAudio, choiceAudio, unlockAudio, storyAudio].forEach(
      (ref) => {
        if (ref.current) {
          ref.current.pause();
          ref.current.currentTime = 0;
        }
      }
    );
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
    setIsRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    let chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "input.webm");

      setStatusMessage("📝 Transcribing...");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      const transcribed = data.text?.trim();
      setTranscript(transcribed || "");
      setIsRecording(false);
      handleAsk(transcribed);
    };

    recorder.start();
    setMediaRecorder(recorder);
  }

  const stopRecording = () => {
    mediaRecorder.stop();
    setMediaRecorder(null);
  };

  const cannedQuestions = [
    "What is creativity?",
    "How do you stay inspired?",
    "What advice do you have for young artists?",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-yellow-300 flex flex-col items-center justify-center text-center p-4 space-y-6">
      <h1 className="text-4xl font-bold text-gray-800">🎧 Talk to Da Vinci</h1>
      <img src="/davinci.png" alt="Da Vinci" className="w-48 h-48 rounded-full shadow-lg" />
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
          cannedQuestions.map((q, index) => (
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
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow"
          >
            🎤 Ask with your voice
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow"
          >
            ⏹️ Stop Recording
          </button>
        )}
      </div>
      <audio ref={promptAudio} hidden preload="auto" />
      <audio ref={choiceAudio} hidden preload="auto" />
      <audio ref={unlockAudio} hidden preload="auto" src="/silent.mp3" />
    </div>
  );
}
