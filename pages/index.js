import { useState, useRef } from "react";

export default function PodcastApp() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answerAudioUrl, setAnswerAudioUrl] = useState(null);
  const audioRef = useRef(null);

  const handlePlayPause = () => {
    if (!isPlaying) audioRef.current.play();
    else audioRef.current.pause();
    setIsPlaying(!isPlaying);
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setIsAsking(true);
    audioRef.current.pause();
    setIsPlaying(false);

    const gptResponse = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
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
          onClick={handleAsk}
          disabled={isAsking}
          className="bg-green-600 text-white px-4 py-2 rounded mt-2"
        >
          {isAsking ? "Thinking..." : "Ask"}
        </button>
      </div>

      {answerAudioUrl && (
        <div className="mt-4">
          <p className="font-semibold">Da Vinci replies:</p>
          <audio controls src={answerAudioUrl} />
        </div>
      )}
    </div>
  );
}
