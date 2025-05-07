
import { useEffect, useRef, useState } from "react";
import { personas } from "../lib/personas";

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState("daVinci");
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isDaVinciSpeaking, setIsDaVinciSpeaking] = useState(false);

  const handleAsk = (question) => {
    setStatusMessage("Thinking...");
    setIsThinking(true);
    // Your logic here
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-copy p-4 space-y-4 text-center">
      <h1 className="text-h1 font-bold uppercase font-[Cinzel] tracking-wide text-heading">
        Talk to the Heroes of History
      </h1>

      <img
        src={personas[selectedPersona].image}
        alt={personas[selectedPersona].name}
        className="w-32 h-32 rounded-full object-cover mb-4 shadow-md"
      />

      <select
        value={selectedPersona}
        onChange={(e) => setSelectedPersona(e.target.value)}
        className="mb-4 p-2 rounded border text-black bg-box-accent"
      >
        {Object.values(personas).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap justify-center gap-4 mb-4">
        {personas[selectedPersona].questions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(item.question)}
            className="bg-secondary hover:bg-secondary-dark text-white py-2 px-4 rounded-full shadow transition"
          >
            {item.question}
          </button>
        ))}
      </div>

      <button className="bg-button hover:bg-button-dark text-white py-2 px-5 rounded-full shadow transition">
        🎤 Ask with your voice
      </button>

      <div className="mt-6 w-full max-w-md bg-box-accent p-4 rounded-lg shadow-lg">
        <h2 className="text-heading font-bold text-lg mb-2">Popular Questions</h2>
        <div className="space-y-2">
          <button className="w-full text-left bg-white hover:bg-neutral-dark py-2 px-3 rounded text-black">
            Who was your favorite painter while you were alive?
          </button>
        </div>
      </div>
    </div>
  );
}
