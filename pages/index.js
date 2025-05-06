import { useEffect, useRef, useState } from "react";

export default function Home() {
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

  const unlockAudio = () => {
    const dummy = new Audio("/silent.mp3");
    dummy.play().catch(() => {});
  };

  const stopDaVinci = () => {
    if (daVinciAudio.current) {
      daVinciAudio.current.pause();
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
        const formData = new FormData();
        formData.append("audio", blob, filename.current);

        setStatusMessage("📝 Transcribing...");

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const text = await res.text();
          const json = JSON.parse(text);
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

  const handleAsk = async (question) => {
    unlockAudio();
    if (!question || question.trim() === "") {
      setStatusMessage("⚠️ No question found.");
      return;
    }

    stopDaVinci();
    stopPodcast();
    setIsThinking(true);
    setDaVinciPaused(false);

    try {
      const encoded = encodeURIComponent(question);
      const url = "/api/ask-stream?question=" + encoded;

      const audio = daVinciAudio.current;
      audio.src = url;

      audio.oncanplaythrough = () => {
        audio.play()
          .then(() => {
            setIsDaVinciSpeaking(true);
          })
          .catch((err) => {
            console.error("Playback error:", err);
            setStatusMessage("❌ Audio playback failed");
          });
      };

      audio.onended = () => {
        setIsDaVinciSpeaking(false);
        setIsThinking(false);
        setStatusMessage("");
      };

      audio.onerror = () => {
        setIsDaVinciSpeaking(false);
        setIsThinking(false);
        setStatusMessage("❌ Audio playback failed");
      };
    } catch (err) {
      console.error("Unexpected error:", err);
      setIsDaVinciSpeaking(false);
      setIsThinking(false);
      setStatusMessage("❌ Unexpected error");
    }
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
          <button key={i} onClick={() => handleAsk(q)} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
            {q}
          </button>
        ))}
      </div>

      {!isRecording && !isThinking && (
        <button onClick={startRecording} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
          🎤 Ask with your voice
        </button>
      )}

      {(isDaVinciSpeaking || daVinciPaused) && (
        <button onClick={toggleDaVinci} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
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
        <button onClick={togglePodcast} className="bg-indigo-400 hover:bg-indigo-500 text-white px-4 py-2 rounded">
          {isPodcastPlaying ? "⏸️ Pause Podcast" : "⏯️ Resume Podcast"}
        </button>
      )}

      <audio ref={podcastAudio} hidden preload="auto" src="/podcast.mp3" />
      <audio ref={daVinciAudio} hidden preload="auto" />
      <audio hidden preload="auto" src="/silent.mp3" />
    </div>
  );
}