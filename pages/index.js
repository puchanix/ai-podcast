import { useState, useRef, useEffect } from "react";

export default function PodcastApp() {
  const [showContinue, setShowContinue] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [question, setQuestion] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const audioRef = useRef(null);
  const podcastPositionRef = useRef(0);
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
    if (audioRef.current) {
      podcastPositionRef.current = audioRef.current.currentTime;
      audioRef.current.pause();
    }
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
        // Do NOT save podcast position after playing answer
        // That causes 'Continue Your Story' to repeat answer audio
        setStatusMessage("🤔 Do you have another question, or should I continue with my story?");
        setShowContinue(true);
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
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 via-white to-indigo-50 px-4 py-8 flex flex-col items-center font-sans">
      <div className="bg-white shadow-2xl border border-gray-200 rounded-2xl p-10 w-full max-w-2xl transition-all duration-300 space-y-6">
        <h1 className="text-5xl font-bold text-center mb-6 text-indigo-900 drop-shadow-md">💬 Talk with the Heroes of History</h1>
          <div className="flex justify-center mb-4">
            <img src="/leonardo.jpg" alt="Leonardo da Vinci" className="w-40 h-40 rounded-full border-4 border-indigo-300 shadow-xl" />
          </div>

        <audio ref={audioRef} src="/podcast.mp3" preload="auto" onEnded={() => setIsPlaying(false)} />

        <div className="flex justify-center mb-6">
          <button
            onClick={() => {
              setShowContinue(false);
              if (!isPlaying) {
                audioRef.current.currentTime = podcastPositionRef.current;
                audioRef.current.play();
                setIsPlaying(true);
              } else {
                stopAllAudio();
              }
            }}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg transition transform hover:scale-105 active:scale-95"
          >{isPlaying ? "Pause" : "Start Conversation"}</button>
        </div>

        <div className="mb-4 text-center text-gray-700 animate-pulse">
          {statusMessage && <p className="italic text-lg">{statusMessage}</p>}
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">💡 Suggested Questions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-items-center">
            {["If you were living today, what would you be doing?",
              "Do you think AI can create true art?",
              "Do you think we will ever have a colony in Mars?",
              "What inspired you paint the Mona Lisa?",
              "What is your favorite animal?"].map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setShowContinue(false); askQuestion(q); }}
                  disabled={isAsking || isListening}
                  className="bg-white hover:bg-indigo-100 text-indigo-800 px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50 shadow transition transform hover:scale-105 active:scale-95 border border-indigo-300"
                >{q}</button>
              ))}
          </div>
          {showContinue && (
            <div className="mt-4">
              <button
                onClick={() => {
                setShowContinue(false);
                audioRef.current.src = "/podcast.mp3";
                audioRef.current.currentTime = podcastPositionRef.current;
                audioRef.current.play();
                setIsPlaying(true);
              }}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg transition transform hover:scale-105 active:scale-95"
              >▶️ Continue Your Story</button>
            </div>
          )}
        </div>
        <div className="text-center mt-4 animate-fade-in">
          <button
            onClick={startVoiceQuestion}
            disabled={isAsking || isListening}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg disabled:opacity-50 transition transform hover:scale-105 active:scale-95"
            title="Click to speak your question aloud"
          >🎤 Ask by Voice</button>
        </div>
      </div>
    </div>
  );
}

