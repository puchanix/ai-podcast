import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
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
    [storyAudio.current, promptAudio.current, choiceAudio.current, unlockAudio.current, daVinciAudio.current].forEach(
      (audio) => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      }
    );
  };

  const handleAsk = async (question) => {
    if (!question || question.trim() === "") {
      setStatusMessage("⚠️ Could not understand your voice.");
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
    try {
      setIsRecording(true);
      setStatusMessage("🎤 Recording...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      setRecordedChunks([]);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        console.log("🛑 Recording stopped. Blob size:", blob.size);
        setIsRecording(false);
        setStatusMessage("⏳ Processing...");
        setRecordedChunks(chunks);
        // Phase B: upload will go here
      };

      recorder.start();
      setMediaRecorder(recorder);

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 2048;
      const data = new Uint8Array(analyser.frequencyBinCount);

      let silenceStart = null;
      const SILENCE_THRESHOLD = 5;
      const SILENCE_DURATION = 2000;

      const detectSilence = () => {
        analyser.getByteFrequencyData(data);
        const average = data.reduce((a, b) => a + b, 0) / data.length;

        if (average < SILENCE_THRESHOLD) {
          if (!silenceStart) silenceStart = Date.now();
          else if (Date.now() - silenceStart > SILENCE_DURATION) {
            console.log("🤫 Detected 2s silence, stopping recorder");
            recorder.stop();
            stream.getTracks().forEach((t) => t.stop());
            audioCtx.close();
            return;
          }
        } else {
          silenceStart = null;
        }

        requestAnimationFrame(detectSilence);
      };

      requestAnimationFrame(detectSilence);
      console.log("🎤 Recording started");
    } catch (err) {
      console.error("🎙️ Mic setup failed:", err);
      setStatusMessage("❌ Microphone error");
      setIsRecording(false);
    }
  };

  const togglePodcast = () => {
    const podcast = podcastAudio.current;
    const answer = daVinciAudio.current;

    if (!podcast) return;

    if (podcast.paused) {
      podcast.play();
      setIsPodcastPlaying(true);
      setPodcastWasPlaying(false);
    } else {
      podcast.pause();
      setIsPodcastPlaying(false);
    }

    if (answer && !answer.paused) {
      answer.pause();
    }
  };

  const cannedQuestions = [
    "What is creativity?",
    "How do you stay inspired?",
    "What advice do you have for young artists?",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-yellow-300 flex flex-col items-center justify-center text-center p-4 space-y-6">
      <h1 className="text-4xl font-bold text-gray-800">🎙️ Talk to Leonardo</h1>
      <img src="/leonardo.jpg" alt="Leonardo da Vinci" className="w-48 h-48 rounded-full shadow-lg" />
      {statusMessage && <p className="text-blue-600 font-medium">{statusMessage}</p>}
      <div className="space-y-4">
        {cannedQuestions.map((q, index) => (
          <button
            key={index}
            onClick={() => handleAsk(q)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!isRecording && !isThinking && (
          <button
            onClick={startRecording}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow"
          >
            🎤 Ask your own question
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {!hasStarted && (
          <button
            onClick={() => {
              if (daVinciAudio.current) {
                daVinciAudio.current.pause();
                daVinciAudio.current.currentTime = 0;
              }

              const audio = podcastAudio.current;
              if (audio) {
                audio.currentTime = 0;
                audio.play();
                setIsPodcastPlaying(true);
                setHasStarted(true);
                setPodcastWasPlaying(false);
              }
            }}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded shadow"
          >
            ▶️ Start
          </button>
        )}
        {hasStarted && (
          <button
            onClick={togglePodcast}
            className="bg-indigo-400 hover:bg-indigo-500 text-white px-4 py-2 rounded shadow"
          >
            {isPodcastPlaying ? "⏸️ Pause" : "⏯️ Resume"}
          </button>
        )}
        <audio ref={podcastAudio} hidden preload="auto" src="/podcast.mp3" />
      </div>

      <audio ref={promptAudio} hidden preload="auto" />
      <audio ref={choiceAudio} hidden preload="auto" />
      <audio ref={unlockAudio} hidden preload="auto" src="/silent.mp3" />
    </div>
  );
}
