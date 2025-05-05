import { useEffect, useRef, useState } from "react";

const cannedQuestions = [
  "What is creativity?",
  "How do you stay inspired?",
  "What advice do you have for young artists?",
];

export default function Home() {
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [storyMode, setStoryMode] = useState(false);
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [podcastWasPlaying, setPodcastWasPlaying] = useState(false);

  const promptAudio = useRef(null);
  const choiceAudio = useRef(null);
  const unlockAudio = useRef(null);
  const storyAudio = useRef(null);
  const podcastAudio = useRef(null);
  const daVinciAudio = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      promptAudio.current = new Audio("/prompt.mp3");
      choiceAudio.current = new Audio("/choice.mp3");
      unlockAudio.current = new Audio("/unlock.mp3");
    }
  }, []);

  const stopAllAudio = () => {
    [storyAudio.current, promptAudio.current, choiceAudio.current, unlockAudio.current, daVinciAudio.current].forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  };

  const handleAsk = async (question) => {
    console.log("📨 handleAsk received question:", question);
    if (!question || question.trim() === "") {
      console.warn("⚠️ No question provided to GPT");
      return;
    }

    const podcast = podcastAudio.current;
    if (podcast && !podcast.paused) {
      podcast.pause();
      setIsPodcastPlaying(false);
      setPodcastWasPlaying(true);
    }

    if (daVinciAudio.current) {
      daVinciAudio.current.pause();
      daVinciAudio.current.currentTime = 0;
    }

    setIsThinking(true);
    setStatusMessage("🤖 Thinking...");

    try {
      const encoded = encodeURIComponent(question);
      console.log("🚀 Sending to GPT:", encoded);
      const audio = new Audio("/api/ask-stream?question=" + encoded);
      daVinciAudio.current = audio;
      audio.play();

      audio.onended = () => {
        setIsThinking(false);
        setStatusMessage("");
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
  };

  const startRecording = async () => {
    setIsRecording(true);
    setStatusMessage("");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    let chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "input.webm");

      setStatusMessage("📝 Transcribing...");
      try {
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        const transcribed = data.text?.trim();

        console.log("🎤 Transcribed question:", transcribed);

        if (!transcribed) {
          console.warn("⚠️ No transcription received, aborting.");
          setIsRecording(false);
          setStatusMessage("⚠️ Could not understand your voice.");
          return;
        }

        setTranscript(transcribed);
        setIsRecording(false);
        setStatusMessage("");
        handleAsk(transcribed);
      } catch (err) {
        console.error("Transcription failed", err);
        setIsRecording(false);
        setStatusMessage("❌ Transcription failed");
      }
    };

    recorder.start();
    setMediaRecorder(recorder);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let silenceStart = null;

    const checkSilence = () => {
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b) / data.length;

      if (volume < 5) {
        if (!silenceStart) silenceStart = Date.now();
        else if (Date.now() - silenceStart > 1500) {
          recorder.stop();
          audioCtx.close();
          return;
        }
      } else {
        silenceStart = null;
      }
      requestAnimationFrame(checkSilence);
    };

    requestAnimationFrame(checkSilence);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-yellow-300 flex flex-col items-center justify-center text-center p-4 space-y-6">
      <h1 className="text-4xl font-bold text-gray-800">🎙️ Talk to Leonardo</h1>
      <img src="/leonardo.jpg" alt="Leonardo da Vinci" className="w-48 h-48 rounded-full shadow-lg" />
      {statusMessage && <p className="text-blue-600 font-medium">{statusMessage}</p>}

      <div className="space-y-4">
        {cannedQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleAsk(q)}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded shadow"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!isRecording && !isThinking && (
          <button
            onClick={startRecording}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow"
          >
            🎤 Ask with your voice
          </button>
        )}
        {isRecording && <div className="text-red-600 font-semibold animate-pulse">🔴 Recording...</div>}
      </div>

      <div className="mt-4">
        <audio ref={podcastAudio} hidden preload="auto" src="/podcast.mp3" />
        <audio ref={promptAudio} hidden preload="auto" />
        <audio ref={choiceAudio} hidden preload="auto" />
        <audio ref={unlockAudio} hidden preload="auto" src="/silent.mp3" />
      </div>
    </div>
  );
}