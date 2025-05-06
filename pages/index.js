import { useEffect, useRef, useState } from "react";
import { personas } from "../lib/personas";

export default function Home() {
  // --- Character selection ---
  const [selectedPersona, setSelectedPersona] = useState("daVinci");

  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isDaVinciSpeaking, setIsDaVinciSpeaking] = useState(false);
  const [daVinciPaused, setDaVinciPaused] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeType = useRef("audio/webm");
  const filename = useRef("input.webm");

  const podcastAudio = useRef(null);
  const daVinciAudio = useRef(null);

  // Detect supported mime type
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
      "I am sketching an answer…"
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

  const startRecording = async () => {
    unlockAudio();
    stopDaVinci();
    stopPodcast();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: mimeType.current });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType.current });
        chunksRef.current = [];

        const formData = new FormData();
        formData.append("audio", blob, filename.current);

        setStatusMessage("📝 Transcribing...");

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const json = await res.json();
          const transcript = json.text?.trim();
          if (!transcript) throw new Error("No transcript");

          setStatusMessage("🎧 Answering...");
          handleAsk(transcript);
        } catch (err) {
          console.error("❌ Transcription failed:", err);
          setStatusMessage("⚠️ Could not understand your voice.");
        }

        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      setStatusMessage("🎤 Listening...");

      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 4000);
    } catch (err) {
      console.error("Mic error:", err);
      setStatusMessage("❌ Mic not supported");
    }
  };

  // Simplified ask: include character selection
  const handleAsk = async (question) => {
    unlockAudio();
    stopDaVinci();
    stopPodcast();
    setIsThinking(true);
    setDaVinciPaused(false);

    const encoded = encodeURIComponent(question);
    const url = `/api/ask-audio?character=${selectedPersona}&question=${encoded}`;

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

  const cannedQuestions = personas[selectedPersona].questions;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-yellow-100 p-4 space-y-4 text-center">
      <h1 className="text-3xl font-bold">Talk with the Heroes of History</h1>
      {/* Character Selector */}
      <select
        value={selectedPersona}
        onChange={(e) => setSelectedPersona(e.target.value)}
        className="mb-4 p-2 rounded border"
      >
        {Object.values(personas).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

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
          {isDaVinciSpeaking ? "⏸️ Pause" : "▶️ Resume"}
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
          {isPodcastPlaying ? "⏸️ Pause Story" : "⏯️ Resume Story"}
        </button>
      )}

<audio
  ref={podcastAudio}
  hidden
  preload="auto"
  src={personas[selectedPersona].podcast}
/>

      <audio ref={daVinciAudio} hidden preload="auto" />
      <audio hidden preload="auto" src="/silent.mp3" />
    </div>
  );
}