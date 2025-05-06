import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isDaVinciSpeaking, setIsDaVinciSpeaking] = useState(false);
  const [daVinciPaused, setDaVinciPaused] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeType = useRef("audio/webm");
  const filename = useRef("input.webm");

  const podcastAudio = useRef(null);
  const daVinciAudio = useRef(null);

  // Web Speech API setup for client-side STT
  const SpeechRecognition =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  const recognitionRef = useRef(null);

  // Detect supported mime type (for fallback, unused)
  useEffect(() => {
    if (typeof MediaRecorder === "undefined") return;
    if (MediaRecorder.isTypeSupported("audio/webm")) {
      mimeType.current = "audio/webm";
      filename.current = "input.webm";
    } else if (MediaRecorder.isTypeSupported("audio/ogg; codecs=opus")) {
      mimeType.current = "audio/ogg; codecs=opus";
      filename.current = "input.ogg";
    }
  }, []);

  // Loader messages while thinking
  useEffect(() => {
    if (!isThinking) return;
    const messages = [
      "Pondering your question…",
      "Almost there…",
      "Just a moment more…",
      "Leonardo is sketching an answer…"
    ];
    let idx = 0;
    setStatusMessage(messages[0]);
    const iv = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setStatusMessage(messages[idx]);
    }, 3000);
    return () => clearInterval(iv);
  }, [isThinking]);

  const unlockAudio = () => {
    const dummy = new Audio("/silent.mp3");
    dummy.play().catch(() => {});
  };

  const stopDaVinci = () => {
    if (daVinciAudio.current) {
      daVinciAudio.current.pause();
      daVinciAudio.current.src = "";
      setIsDaVinciSpeaking(false);
      setDaVinciPaused(true);
    }
  };

  const stopPodcast = () => {
    if (podcastAudio.current && !podcastAudio.current.paused) {
      podcastAudio.current.pause();
      setIsPodcastPlaying(false);
    }
  };

  // startRecording with Web Speech API
  const startRecording = () => {
    if (!SpeechRecognition) {
      setStatusMessage("⚠️ Mic not supported");
      return;
    }
    if (!recognitionRef.current) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = "en-US";
      recog.onstart = () => {
        setIsRecording(true);
        setStatusMessage("🎤 Listening...");
      };
      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        setIsRecording(false);
        setStatusMessage("🎧 Answering...");
        handleAsk(transcript);
      };
      recog.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        setStatusMessage("❌ STT failed");
      };
      recog.onend = () => {
        setIsRecording(false);
      };
      recognitionRef.current = recog;
    }
    stopDaVinci();
    stopPodcast();
    recognitionRef.current.start();
  };

  // Simplified ask: no checks, let Leonardo handle
  const handleAsk = async (question) => {
    unlockAudio();
    stopDaVinci();
    stopPodcast();
    setIsThinking(true);
    setDaVinciPaused(false);

    const encoded = encodeURIComponent(question);
    const url = "/api/ask-audio?question=" + encoded;

    const audio = daVinciAudio.current;
    audio.src = url;
    audio.load();
    audio.play()
      .then(() => {
        setIsDaVinciSpeaking(true);
        setIsThinking(false);
        setStatusMessage("");
      })
      .catch((err) => {
        console.error("Playback error:", err);
        setStatusMessage("❌ Audio playback failed");
        setIsThinking(false);
      });

    audio.onended = () => {
      setIsDaVinciSpeaking(false);
      setIsThinking(false);
      setStatusMessage("");
    };

    audio.onerror = () => {
      console.error("Audio playback error");
      setStatusMessage("❌ Audio playback error");
      setIsThinking(false);
    };
  };

  const togglePodcast = () => {
    if (!podcastAudio.current) return;
    if (podcastAudio.current.paused) {
      podcastAudio.current.play();
      setIsPodcastPlaying(true);
    } else {
      podcastAudio.current.pause();
      setIsPodcastPlaying(false);
    }
  };

  const toggleDaVinci = () => {
    const da = daVinciAudio.current;
    if (!da) return;

    if (da.paused) {
      da.play();
      setIsDaVinciSpeaking(true);
      setDaVinciPaused(false);
    } else {
      da.pause();
      setIsDaVinciSpeaking(false);
      setDaVinciPaused(true);
    }
  };

  const cannedQuestions = [
    "What is creativity?",
    "How do you stay inspired?",
    "What advice do you have for young artists?"
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-yellow-100 p-4 space-y-4 text-center">
      <h1 className="text-3xl font-bold">🎙️ Talk to Leonardo</h1>
      <img src="/leonardo.jpg" alt="Leonardo" className="w-40 h-40 rounded-full" />
      <p className="text-blue-700">{statusMessage}</p>

      <div className="space-y-2">
        {cannedQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleAsk(q)}
            disabled={isThinking}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 px-4 rounded"
          >
            {q}
          </button>
        ))}
      </div>

      {!isRecording && !isThinking && (
        <button
          onClick={startRecording}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          🎤 Ask with your voice
        </button>
      )}

      {(isDaVinciSpeaking || daVinciPaused) && (
        <button
          onClick={toggleDaVinci}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          {isDaVinciSpeaking ? "⏸️ Pause Da Vinci" : "▶️ Resume Da Vinci"}
        </button>
      )}

      {!hasStarted && (
        <button
          onClick={() => {
            podcastAudio.current.play();
            setIsPodcastPlaying(true);
            setHasStarted(true);
          }}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
        >
          ▶️ Start Podcast
        </button>
      )}

      {hasStarted && (
        <button
          onClick={togglePodcast}
          className="bg-indigo-400 hover:bg-indigo-500 text-white px-4 py-2 rounded"
        >
          {isPodcastPlaying ? "⏸️ Pause Podcast" : "⏯️ Resume Podcast"}
        </button>
      )}

      <audio ref={podcastAudio} hidden preload="auto" src="/podcast.mp3" />
      <audio ref={daVinciAudio} hidden preload="auto" />
      <audio hidden preload="auto" src="/silent.mp3" />
    </div>
  );
}