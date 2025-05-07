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

  const fetchPopularQuestions = async () => {
    try {
      const res = await fetch(`/api/question-count?character=${selectedPersona}`);
      const data = await res.json();
      setPopularQuestions(data.questions || []);
    } catch (err) {
      console.error("Failed to fetch popular questions", err);
    }
  };

  useEffect(() => {
    fetchPopularQuestions();
  }, [selectedPersona]);

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
    if (question === "Tell me Your Story") {
      togglePodcast();
      return;
    }
    await recordQuestion(question);
    unlockAudio();
    stopDaVinci();
    stopPodcast();
    setIsThinking(true);
    setDaVinciPaused(false);

    const encoded = encodeURIComponent(question);
    const url = `/api/ask-audio?character=${selectedPersona}` +
      `&question=${encoded}`;

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
      setHasStarted(true);
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

  const uiQuestions = ["Tell me Your Story", ...personas[selectedPersona].questions];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-copy p-4 space-y-4 text-center">
      <h1 className="text-h1 font-bold uppercase font-[Cinzel] tracking-wide">
      TALK TO THE HEROES OF HISTORY</h1>
      <select
        value={selectedPersona}
        onChange={(e) => setSelectedPersona(e.target.value)}
        className="mb-4 p-2 rounded border text-black bg-pantone-628"
      >
        {Object.values(personas).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <p className="text-neutral-dark font-medium">{statusMessage}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {uiQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleAsk(q)}
            disabled={isThinking}
            className="bg-button hover:bg-button-dark disabled:bg-neutral-dark text-copy py-2 px-5 rounded-full shadow-lg transition-all duration-200 ease-in-out"
          >
            {q}
          </button>
        ))}
      </div>

      {!isRecording && !isThinking && (
        <button
          onClick={startRecording}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow"
        >
          🎤 Ask with your voice
        </button>
      )}

      {(isDaVinciSpeaking || daVinciPaused) && (
        <button
          onClick={toggleDaVinci}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded shadow"
        >
          {isDaVinciSpeaking ? "⏸️ Pause Response" : "▶️ Resume Response"}
        </button>
      )}

<div className="mt-6 w-full max-w-md bg-pantone-318 p-4 rounded-lg shadow-lg">
        <h2 className="text-h2 font-semibold mb-2">Popular Questions</h2>
        {popularQuestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(item.question)}
            className="w-full text-left bg-pantone-628 hover:bg-neutral-dark py-2 px-3 mb-2 rounded text-black"
          >
            {item.question}
          </button>
        ))}
      </div>

      <audio ref={podcastAudio} hidden preload="auto" />
      <audio ref={daVinciAudio} hidden preload="auto" />
      <audio hidden preload="auto" src="/silent.mp3" />
    </div>
  );
}
