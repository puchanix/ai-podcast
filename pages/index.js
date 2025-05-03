import { useState, useRef, useEffect } from "react";

export default function PodcastApp() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [question, setQuestion] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const audioRef = useRef(null);
  const currentAudioRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream;
      })
      .catch(err => console.error("Microphone access error:", err));
  }, []);

  const stopAllAudio = () => {
    if (audioRef.current) audioRef.current.pause();
    if (currentAudioRef.current) currentAudioRef.current.pause();
    setIsPlaying(false);
  };

  const playAudio = (src, callback) => {
    const audio = new Audio(src);
    currentAudioRef.current = audio;
    audio.onended = () => callback && callback();
    audio.play();
  };

  const handlePlayPause = () => {
    stopAllAudio();
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const startVoiceQuestion = async () => {
    if (!streamRef.current) return;
    stopAllAudio();
    setIsListening(true);
    setStatusMessage("🎙️ Listening...");

    playAudio("/question_ack.mp3", () => {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        setIsListening(false);
        setStatusMessage("🧠 Thinking...");
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob);

        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          const { transcript } = await res.json();
          if (!transcript) throw new Error("No transcript");
          setQuestion(transcript);
          askQuestion(transcript);
        } catch (err) {
          console.error("Transcription failed:", err);
          setStatusMessage("❌ Error transcribing");
        }
      };

      recorderRef.current = recorder;
      recorder.start();

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(streamRef.current);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);

      let silenceStart = null;
      const silenceThreshold = 0.01;
      const silenceDuration = 2000;

      const detectSilence = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const volume = Math.sqrt(sum / bufferLength);

        const now = Date.now();
        if (volume < silenceThreshold) {
          if (!silenceStart) silenceStart = now;
          else if (now - silenceStart > silenceDuration && recorder.state === 'recording') {
            recorder.stop();
            audioCtx.close();
            return;
          }
        } else {
          silenceStart = null;
        }

        if (recorder.state === 'recording') {
          requestAnimationFrame(detectSilence);
        }
      };

      detectSilence();
    });
    
  };

  const askQuestion = async (q) => {
    setIsAsking(true);
    stopAllAudio();
    setStatusMessage("🧠 Thinking...");

    try {
      const gptRes = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q })
      });
      const { answerText } = await gptRes.json();

      const ttsRes = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: answerText })
      });
      const { audioUrl } = await ttsRes.json();

      playAudio(audioUrl, () => {
        playAudio("/followup.mp3", () => {
          audioRef.current.play();
          setIsPlaying(true);
          setStatusMessage("");
        });
      });
    } catch (err) {
      console.error("Ask flow failed:", err);
      
    }

    setIsAsking(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-xl">
        <h1 className="text-3xl font-bold text-center mb-4">🎧 Da Vinci Interactive Podcast</h1>

        <audio ref={audioRef} src="/podcast.mp3" preload="auto" onEnded={() => setIsPlaying(false)} />

        <div className="flex justify-center mb-6">
          <button
            onClick={handlePlayPause}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-lg"
          >Play Podcast</button>
        </div>

        <div className="mb-4 text-center text-gray-700">
          {statusMessage && <p className="italic text-lg">{statusMessage}</p>}
        </div>

        <div className="text-center">
          <button
            onClick={startVoiceQuestion}
            disabled={isAsking || isListening}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full text-lg disabled:opacity-50"
          >🎤 Ask by Voice</button>
        </div>
      </div>
    </div>
  );
}
