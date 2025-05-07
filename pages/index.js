
import { useState } from "react";
import { personas } from "../lib/personas";

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState("daVinci");

  const handleAsk = (question) => {
    console.log("Asked:", question);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background-top to-background text-copy space-y-6">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-wide text-heading drop-shadow-sm text-center">
        Talk to the Heroes of History
      </h1>

      <img
        src={personas[selectedPersona].image}
        alt={personas[selectedPersona].name}
        className="w-32 h-32 rounded-full object-cover shadow-md"
      />

      <select
        value={selectedPersona}
        onChange={(e) => setSelectedPersona(e.target.value)}
        className="mt-2 mb-6 p-2 rounded border border-border text-black bg-dropdown-bg bg-opacity-90 shadow-sm"
      >
        {Object.values(personas).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap justify-center gap-4">
        {personas[selectedPersona].questions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(item.question)}
            className="bg-button-primary hover:bg-button-hover text-white py-2 px-4 rounded-full shadow-md transition-transform transform hover:scale-105"
          >
            {item.question}
          </button>
        ))}
      </div>

      <button className="mt-4 bg-button-primary hover:bg-button-hover text-white py-2 px-5 rounded-full shadow-md transition-transform transform hover:scale-105">
        🎤 Ask with your voice
      </button>

      <div className="mt-8 w-full max-w-md bg-box-accent p-4 rounded-xl shadow-lg border border-border">
        <h2 className="text-heading font-bold text-lg mb-2 text-center">Popular Questions</h2>
        <div className="space-y-2">
          {personas[selectedPersona].questions.slice(0, 3).map((q, idx) => (
            <button key={idx} className="w-full text-left bg-white hover:bg-neutral-dark py-2 px-3 rounded text-black">
              {q.question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
