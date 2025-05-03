import { useState, useRef, useEffect } from "react";

export default function PodcastApp() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answerAudioUrl, setAnswerAudioUrl] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const audioRef = useRef(null);
  const currentAudioRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);

  useEffect(() => {
    if (navigator.mediaDevices && window.MediaRecorder) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          streamRef.current = stream;
        })
        .catch(err => console.error("Microphone access error:", err));
    }
  }, []);

  const stopAllAudio = () => {
    if (audioRef.current) audioRef.current.pause();
    if (currentAudioRef.current) currentAudioRef.current.pause();
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    stopAllAudio();
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAsk = async (customQuestion) => {
    const q = customQuestion || question;
    if (!q.trim()) return;
    setIsAsking(true);
    stopAllAudio();

    try {
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
      currentAudioRef.current = answerAudio;

      answerAudio.onended = () => {
        const resumeClip = new Audio("/followup.mp3");
        resumeClip.onended = () => {
          audioRef.current.play();
          setIsPlaying(true);
        };
        resumeClip.play();
      };

      setIsAsking(false);
      answerAudio.play();
    } catch (err) {
      console.error("Ask handling failed:", err);
      setIsAsking(false);
    }
  };

  const startRecordingAndAsk = () => {
    if (!streamRef.current) {
      console.error("No microphone stream available");
      return;
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;
      setRecordedChunks([]);
      stopAllAudio();

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob);

        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          });

          const { transcript } = await response.json();
          setQuestion(transcript);
          handleAsk(transcript);
        } catch (err) {
          console.error("Transcription failed:", err);
        }
      };

      recorder.start();
      setTimeout(() => recorder.stop(), 5000);
    } catch (err) {
      console.error("Recording failed to start:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 flex flex-col items-center justify-start">
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">🎧 Da Vinci Interactive Podcast</h1>

        <audio ref={audioRef} src="/podcast.mp3" preload="auto" onEnded={() => setIsPlaying(false)} />

        <div className="flex justify-center mb-6">
          <button
            onClick={handlePlayPause}
            className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-3 rounded-full text-lg shadow"
          >
            Play Podcast
          </button>
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-700 text-lg">Ask Da Vinci a question:</label>
          <input
            className="border border-gray-300 rounded-lg w-full p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What do you think about AI, Leonardo?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
            <button
              onClick={startRecordingAndAsk}
              disabled={isAsking}
              className="bg-purple-600 hover:bg-purple-700 transition text-white px-5 py-2 rounded-full text-base shadow disabled:opacity-50"
            >
              {isAsking ? "Thinking..." : "🎤 Ask by Voice"}
            </button>
          </div>
        </div>

        {answerAudioUrl && (
          <div className="mt-4">
            <p className="font-semibold mb-2 text-gray-700">Da Vinci replies:</p>
            <audio controls autoPlay src={answerAudioUrl} className="w-full rounded-lg border border-gray-300" />
          </div>
        )}
      </div>
    </div>
  );
}