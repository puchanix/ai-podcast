
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background-top to-background text-copy p-4 space-y-6 text-center">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-wide text-heading drop-shadow-sm uppercase">
        Talk to the Heroes of History
      </h1>

      <img
        src={personas[selectedPersona].image}
        alt={personas[selectedPersona].name}
        className="w-32 h-32 rounded-full object-cover shadow-md"
      />

      <select
        value={selectedPersona}
        onChange={(e) => setSelectedPersona(e.target.value)}
        className="mt-2 mb-6 p-2 rounded border border-border text-white bg-dropdown-bg bg-opacity-95 shadow-sm"
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
            className="bg-button-primary hover:bg-button-hover disabled:bg-neutral-dark text-white py-2 px-5 rounded-full shadow-lg transition-all duration-200 ease-in-out"
          >
            {q}
          </button>
        ))}
      </div>

      {!isRecording && !isThinking && (
        <button
          onClick={startRecording}
          className="bg-voice-button text-black font-semibold py-3 px-6 mt-4 rounded-full shadow-lg ring-2 ring-heading hover:ring-offset-2 hover:scale-105 transition-all duration-200"
        >
          🎤 Ask with your voice
        </button>
      )}

      {(isDaVinciSpeaking || daVinciPaused) && (
        <button
          onClick={toggleDaVinci}
          className="bg-button-primary hover:bg-button-hover text-white py-2 px-5 rounded-full shadow-md"
        >
          {isDaVinciSpeaking ? "⏸️ Pause Response" : "▶️ Resume Response"}
        </button>
      )}

      <div className="mt-10 w-full max-w-md bg-box-accent p-5 rounded-xl shadow-lg border border-border">
        <h2 className="text-heading font-heading font-bold text-lg uppercase tracking-wider drop-shadow-sm opacity-90 mb-4">Popular Questions</h2>
        <div className="space-y-2">
          {popularQuestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(item.question)}
              className="w-full text-left bg-white hover:bg-neutral-dark py-2 px-3 rounded text-black"
            >
              {item.question}
            </button>
          ))}
        </div>
      </div>

      <audio ref={podcastAudio} hidden preload="auto" />
      <audio ref={daVinciAudio} hidden preload="auto" />
      <audio hidden preload="auto" src="/silent.mp3" />

      <footer className="mt-10 text-sm text-copy-soft">
  <div className="flex space-x-6 justify-center">
    <a href="/about" className="hover:underline">About</a>
    <a href="/feedback" className="hover:underline">Feedback</a>
  </div>
</footer>

    </div>
  );
}

