import { useState, useRef, useEffect } from "react";

export default function PodcastApp() {
  const [showContinue, setShowContinue] = useState(false);
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
    console.log("▶️ Playing audio:", src);
    if (!audioRef.current) {
      console.error("❌ audioRef not initialized");
      return;
    }
    audioRef.current.src = src;
    audioRef.current.onended = () => callback && callback();
    audioRef.current.onerror = (e) => {
      console.error("❌ Error playing audio:", e);
      setStatusMessage("❌ Failed to play audio response. Try again.");
    };
    audioRef.current.play().catch(err => {
      console.error("🔇 Autoplay or loading error:", err);
      setStatusMessage("❌ Audio playback failed. Try again.");
    });
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

    // Create and resume AudioContext immediately after user tap
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const source = audioCtx.createMediaStreamSource(streamRef.current);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    playAudio("/question_ack.mp3", () => {
      recorderRef.current = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' });
      const chunks = [];
      const recorder = recorderRef.current;

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        console.log("🔴 recorder.onstop triggered");
        setIsListening(false);
        setStatusMessage("🧠 Thinking... (0s)");
        let thinkingStart = Date.now();
        const thinkingInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - thinkingStart) / 1000);
          setStatusMessage(`🧠 Thinking... (${elapsed}s)`);
        }, 1000);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData, signal: controller.signal });
          clearTimeout(timeoutId);
          const { transcript } = await res.json();
          if (!transcript) {
            throw new Error("No transcript returned — possibly silence or API error");
          }
          setQuestion(transcript);
          clearInterval(thinkingInterval);
          askQuestion(transcript);
        } catch (err) {
          console.error("Transcription failed:", err);
          clearInterval(thinkingInterval);
          setStatusMessage("❌ Error transcribing or no response from server. Try again.");
        }
      };

      recorder.start();
      console.log("🎙️ recorder started");

      // Fallback timeout in case onstop never fires
      setTimeout(() => {
        if (recorder.state === 'recording') {
          console.warn("⚠️ Timeout: Forcing recorder to stop");
          console.log("🔇 Silence detected, stopping recorder");
            recorder.stop();
        }
      }, 10000);

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
    let thinkingStart = Date.now();
    const thinkingInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - thinkingStart) / 1000);
      setStatusMessage(`🧠 Thinking... (${elapsed}s)`);
    }, 1000);

    try {
      console.log("🧠 Sending question to GPT:", q);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const gptRes = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const gptData = await gptRes.json();
      console.log("🤖 GPT response:", gptData);
      const answerText = gptData?.answerText;
      if (!answerText) throw new Error("GPT returned no answerText");

      const ttsRes = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: answerText })
      });
      const ttsData = await ttsRes.json();
      console.log("🔊 TTS response:", ttsData);
      const { audioUrl } = ttsData;
      if (!audioUrl) {
        throw new Error("TTS failed to return audio URL or audio URL was empty");
      }

      playAudio(audioUrl, () => {
        playAudio("/followup.mp3", () => {
          setStatusMessage("🤔 Do you have another question, or should I continue with my story?");
          setShowContinue(true);
        });
      });
    } catch (err) {
      console.error("Ask flow failed:", err);
      setStatusMessage("❌ Failed to get an answer. Try again.");
    } finally {
      clearInterval(thinkingInterval);
      setIsAsking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-xl">
        <h1 className="text-3xl font-bold text-center mb-4">💬 Talk with the Heroes of History</h1>

        <audio ref={audioRef} src="/podcast.mp3" preload="auto" onEnded={() => setIsPlaying(false)} />

        <div className="flex justify-center mb-6">
          <button
            onClick={handlePlayPause}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-lg"
          >Start Conversation</button>
        </div>

        <div className="mb-4 text-center text-gray-700">
          {statusMessage && <p className="italic text-lg">{statusMessage}</p>}
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Suggested Questions</h2>
          <div className="grid gap-2">
            {["If you were living today, what would you be doing?",
              "Do you think AI can create true art?",
              "Do you think we will ever have a colony in Mars?",
              "What inspired you paint the Mona Lisa?",
              "What is your favorite animal?"].map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setShowContinue(false); askQuestion(q); }}
                  disabled={isAsking || isListening}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >{q}</button>
              ))}
          </div>
          {showContinue && (
            <div className="mt-4">
              <button
                onClick={handlePlayPause}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm"
              >▶️ Continue Your Story</button>
            </div>
          )}
        </div>
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

