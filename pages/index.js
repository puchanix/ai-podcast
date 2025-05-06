import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeType = useRef("audio/webm");
  const filename = useRef("input.webm");

  useEffect(() => {
    if (typeof MediaRecorder === "undefined") return;
    if (MediaRecorder.isTypeSupported("audio/webm")) {
      mimeType.current = "audio/webm";
      filename.current = "input.webm";
    } else if (MediaRecorder.isTypeSupported("audio/ogg; codecs=opus")) {
      mimeType.current = "audio/ogg; codecs=opus";
      filename.current = "input.ogg";
    } else {
      console.warn("No supported audio format for MediaRecorder");
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
          const transcript = json.text;
          if (!transcript) throw new Error("No transcript");
          setStatusMessage("✅ " + transcript);
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
      }, 4000); // timeout-based silence fallback
    } catch (err) {
      console.error("Mic error:", err);
      setStatusMessage("❌ Mic not supported");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Ask Your Own Question</h2>
      <button onClick={startRecording} disabled={isRecording}>
        🎤 Ask
      </button>
      <p>{statusMessage}</p>
    </div>
  );
}