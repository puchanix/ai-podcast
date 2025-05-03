import { useState, useRef, useEffect } from "react";

export default function PodcastApp() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answerAudioUrl, setAnswerAudioUrl] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionTimeoutRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        clearTimeout(recognitionTimeoutRef.current);
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        setIsListening(false);
        handleAsk(transcript);
      };
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        clearTimeout(recognitionTimeoutRef.current);
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const handlePlayPause = () => {
    if (!isPlaying) audioRef.current.play();
    else audioRef.current.pause();
    setIsPlaying(!isPlaying);
  };

  const handleAsk = async (customQuestion) => {
    const q = customQuestion || question;
    if (!q.trim()) return;
    setIsAsking(true);
    audioRef.current.pause();
    setIsPlaying(false);

    const gptResponse = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q })
    });
    const { answerText } = await gptResponse.json();

    const ttsResponse = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: answerText })
    });
    const { audioUrl } = await ttsResponse.json();

    const answerAudio = new Audio(audioUrl);
    setIsAsking(false);

    answerAudio.onended = () => {
      const resumeClip = new Audio("/followup.mp3");
      resumeClip.onended = () => {
        audioRef.current.play();
        setIsPlaying(true);
      };
      resumeClip.play();
    };
    answerAudio.play();
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        recognitionTimeoutRef.current = setTimeout(() => {
          console.warn("Speech recognition timeout.");
          recognitionRef.current.stop();
          setIsListening(false);
        }, 10000);
      } catch (error) {
        console.error("Failed to start recognition:", error);
        setIsListening(false);
      }
    }
  };

  const handleInteractiveAsk = () => {
    audioRef.current.pause();
    setIsPlaying(false);
    const promptAudio = new Audio("/askprompt.mp3");
    promptAudio.play();
    promptAudio.onended = () => {
      // Require a manual tap to start listening after prompt finishes
      alert("Tap OK and then speak your question.");
      startListening();
    };
  };

  return (
    <div className="px-4 py-6 max-w-xl mx-auto sm:px-6 md:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center">🎧 Interactive Podcast: Da Vinci Speaks</h1>
      <audio ref={audioRef} src="/podcast.mp3" preload="auto" onEnded={() => setIsPlaying(false)} />

      <div className="flex justify-center mb-4">
        <button onClick={handlePlayPause} className="bg-blue-600 text-white px-6 py-3 rounded text-lg">
          {isPlaying ? "Pause" : "Play Podcast"}
        </button>
      </div>

      <div className="mt-6">
        <label className="block mb-2 font-medium text-lg">Ask Da Vinci a question:</label>
        <input
          className="border border-gray-300 rounded w-full p-3 text-base"
          placeholder="What do you think about AI, Leonardo?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4">
          <button
            onClick={() => handleAsk()}
            disabled={isAsking}
            className="bg-green-600 text-white px-4 py-2 rounded text-base"
          >
            {isAsking ? "Thinking..." : "Ask"}
          </button>

          <button
            onClick={handleInteractiveAsk}
            disabled={isListening || isAsking}
            className="bg-purple-600 text-white px-4 py-2 rounded text-base"
          >
            {isListening ? "Listening..." : "🎤 I have a question"}
          </button>
        </div>
      </div>

      {answerAudioUrl && (
        <div className="mt-6">
          <p className="font-semibold mb-2">Da Vinci replies:</p>
          <audio controls autoPlay src={answerAudioUrl} className="w-full" />
        </div>
      )}
    </div>
  );
}