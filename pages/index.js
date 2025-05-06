import { useEffect, useRef, useState } from "react";
import { personas } from "../lib/personas";

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState("daVinci");
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isDaVinciSpeaking, setIsDaVinciSpeaking] = useState(false);
  const [daVinciPaused, setDaVinciPaused] = useState(false);
  const [popularQuestions, setPopularQuestions] = useState([]);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeType = useRef("audio/webm");
  const filename = useRef("input.webm");

  const podcastAudio = useRef(null);
  const daVinciAudio = useRef(null);

  // Fetch popular questions for the selected persona
  const fetchPopularQuestions = async () => {
    try {
      const res = await fetch(`/api/question-count?character=${selectedPersona}`);
      const data = await res.json();
      setPopularQuestions(data.questions || []);
    } catch (err) {
      console.error("Failed to fetch popular questions", err);
    }
  };

  // Refresh popular questions when persona changes
  useEffect(() => {
    fetchPopularQuestions();
  }, [selectedPersona]);

  // Record a question click and refresh list
  const recordQuestion = async (question) => {
    if (!question) return;
    try {
      await fetch(`/api/question-count`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: selectedPersona, question }),
      });
      await fetchPopularQuestions();
    } catch (err) {
      console.error("Failed to record question click", err);
    }
  };

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
      `${personas[selectedPersona].name} is working on your question…`
    ];
    let idx = 0;
    setStatusMessage(messages[0]);
    const iv = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setStatusMessage(messages[idx]);
    }, 3000);
    return () => clearInterval(iv);
  }, [isThinking, selectedPersona]);

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
          await recordQuestion(transcript);
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

  const handleAsk = async (question) => {
    await recordQuestion(question);
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
      podcastAudio.current.src = personas[selectedPersona].podcast;
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
          {isDaVinciSpeaking ? "⏸️ Pause Response" : "▶️ Resume Response"}
        </button>
      )}

      {!hasStarted && (
        <button
          onClick={togglePodcast}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
        >
          ▶️ Start Podcast
        </button>
      )}

      {hasStarted && (
        <button
          onClick={togglePodcast}
          className="bg-indigo-400 hover:bg-indigo-500 text-white px-4 py-2.rounded"
        >
          {isPodcastPlaying ? "⏸️ Pause Podcast" : "⏯️ Resume Podcast"}
        </button>
      )}

      <div className="mt-6 w-full max-w-md bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Popular Questions</h2>
        {popularQuestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(item.question)}
            className="w-full text-left bg-gray-100 hover:bg-gray-200 py-2 px-3 mb-2 rounded"
          >
            {item.question} ({item.count})
          </button>
        ))}
      </div>

      <audio ref={podcastAudio} hidden preload="auto" />
      <audio ref={daVinciAudio} hidden preload="auto" />
      <audio hidden preload="auto" src="/silent.mp3" />
    </div>
  );
}
