import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

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

  const startRecording = async () => {
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
          console.log("📦 Whisper raw response:", text);

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
    if (!question || question.trim() === "") {
      setStatusMessage("⚠️ No question found.");
      return;
    }

    setIsThinking(true);

    if (podcastAudio.current && !podcastAudio.current.paused) {
      podcastAudio.current.pause();
      setIsPodcastPlaying(false);
    }

    if (daVinciAudio.current) {
      daVinciAudio.current.pause();
      daVinciAudio.current.currentTime = 0;
    }

    try {
      const encoded = encodeURIComponent(question);
      const audio = new Audio("/api/ask-stream?question=" + encoded);
      daVinciAudio.current = audio;
      audio.play();

      audio.onended = () => {
        setIsThinking(false);
        setStatusMessage("");
      };

      audio.onerror = () => {
        setIsThinking(false);
        setStatusMessage("❌ Audio playback failed");
      };
    } catch (err) {
      console.error("Unexpected error:", err);
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
          {isPodcastPlaying ? "⏸️ Pause" : "⏯️ Resume"}
        </button>
      )}

      <audio ref={podcastAudio} hidden preload="auto" src="/podcast.mp3" />
    </div>
  );
}