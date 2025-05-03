import { useState, useRef, useEffect } from "react";

export default function PodcastApp() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answerAudioUrl, setAnswerAudioUrl] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        setIsListening(false);
        handleAsk(transcript);
      };
      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
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

    setAnswerAudioUrl(audioUrl);
    setIsAsking(false);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleInteractiveAsk = () => {
    audioRef.current.pause();
    setIsPlaying(false);
    const questionPrompt = new SpeechSynthesisUtterance("Go ahead, what is your question?");
    speechSynthesis.speak(questionPrompt);
    questionPrompt.onend = () => startListening();
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎧 Interactive Podcast: Da Vinci Speaks</h1>
      <audio ref={audioRef} src="/podcast.mp3" preload="auto" onEnded={() => setIsPlaying(false)} />

      <button onClick={handlePlayPause} className="bg-blue-600 text-white px-4 py-2 rounded">
        {isPlaying ? "Pause" : "Play Podcast"}
      </button>

      <div className="mt-6">
        <label className="block mb-2 font-medium">Ask Da Vinci a question:</label>
        <input
          className="border border-gray-300 rounded w-full p-2"
          placeholder="What do you think about AI, Leonardo?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          onClick={() => handleAsk()}
          disabled={isAsking}
          className="bg-green-600 text-white px-4 py-2 rounded mt-2"
        >
          {isAsking ? "Thinking..." : "Ask"}
        </button>

        <button
          onClick={handleInteractiveAsk}
          disabled={isListening || isAsking}
          className="bg-purple-600 text-white px-4 py-2 rounded mt-2 ml-2"
        >
          {isListening ? "Listening..." : "🎤 I have a question"}
        </button>
      </div>

      {answerAudioUrl && (
        <div className="mt-4">
          <p className="font-semibold">Da Vinci replies:</p>
          <audio controls autoPlay src={answerAudioUrl} onEnded={() => audioRef.current.play()} />
        </div>
      )}
    </div>
  );
}
