
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [storyPosition, setStoryPosition] = useState(0);
  const playbackMonitor = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const podcastAudio = useRef(null);
  const responseAudio = useRef(null);
  const promptAudio = useRef(null);
  const choiceAudio = useRef(null);
  const unlockAudio = useRef(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const suggestedQuestions = [
    "If you were living today, what would you be doing?",
    "Do you think AI can create true art?",
    "Do you think we will ever have a colony on Mars?",
    "What inspired you to paint the Mona Lisa?",
    "What is your favorite animal?"
  ];

  useEffect(() => {
    const unlock = () => {
      if (!audioUnlocked && unlockAudio.current) {
        unlockAudio.current.play().catch(() => {});
        setAudioUnlocked(true);
      }
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);
    
  const handleAskStream = async (question) => {
    stopAllAudio();
    setIsThinking(true);
    setStatusMessage('🤔 Thinking (streaming)...');
    try {
      const response = await fetch('/api/ask-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok || !response.body) throw new Error('Stream failed');

      const mediaSource = new MediaSource();
      responseAudio.current.src = URL.createObjectURL(mediaSource);
      responseAudio.current.load();
      
      responseAudio.current.play().catch(err => console.error('Playback failed', err));
    
    playbackMonitor.current = setInterval(() => {
      const audio = responseAudio.current;
      if (audio && audio.paused && !audio.ended && !audio.seeking && audio.currentTime > 0) {
        clearInterval(playbackMonitor.current);
        setIsThinking(false);
        setStatusMessage('');
        setShowOptions(true);
      }
    }, 500);

    responseAudio.current.onended = () => {
      clearInterval(playbackMonitor.current);
      setIsThinking(false);
      setStatusMessage('');
      setShowOptions(true);
    };
    
      
    playbackMonitor.current = setInterval(() => {
      const audio = responseAudio.current;
      if (audio && audio.paused && !audio.ended && !audio.seeking && audio.currentTime > 0) {
        clearInterval(playbackMonitor.current);
        setIsThinking(false);
        setStatusMessage('');
        setShowOptions(true);
      }
    }, 500);

    responseAudio.current.onended = () => {
      clearInterval(playbackMonitor.current);
      setIsThinking(false);
      setStatusMessage('');
      setShowOptions(true);
    };
    
    

      mediaSource.addEventListener('sourceopen', () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        const reader = response.body.getReader();
        const queue = [];

        const pump = () => {
          if (queue.length && !sourceBuffer.updating) {
            sourceBuffer.appendBuffer(queue.shift());
          }
        };

        sourceBuffer.addEventListener('updateend', pump);

        const readLoop = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              sourceBuffer.removeEventListener('updateend', pump);
              mediaSource.endOfStream();
              setIsThinking(false);
              setStatusMessage('');
              // setShowOptions moved to onended
              return;
            }
            if (value) {
              queue.push(value);
              pump();
            }
            readLoop();
          });
        };

        readLoop();
      });
    } catch (err) {
      console.error(err);
      setStatusMessage('❌ Streaming error');
      setIsThinking(false);
    }
  };
      <p className="mb-4 text-gray-700 font-medium text-lg">{statusMessage}</p>

      
      {!showOptions && (<>

  
  <div className="mb-4 flex gap-4">
        {!isPlaying && storyPosition === 0 ? (
          <button onClick={() => { setShowOptions(false); handlePlayPodcast(); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition transform hover:scale-105 active:scale-95">
            ▶️ Start Conversation
          </button>
        ) : (
          isPlaying ? (
            <button onClick={handlePausePodcast} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition transform hover:scale-105 active:scale-95">
              ⏸️ Pause
            </button>
          ) : (
            <button onClick={() => { setShowOptions(false); handlePlayPodcast(); }} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-semibold shadow-md transition transform hover:scale-105 active:scale-95">
              ▶️ Resume
            </button>
          )
        )}
      </div>

      
  <h2 className="text-xl font-semibold mb-4 text-gray-800">💡 Suggested Questions</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-items-center">
        {suggestedQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleAskStream(q)}
            className="bg-white hover:bg-indigo-100 text-indigo-800 px-6 py-3 rounded-xl text-sm font-medium shadow transition transform hover:scale-105 active:scale-95 border border-indigo-300"
          >
            {q}
          </button>
        ))}
      </div>


      
      <div className="mt-6">
        <button
          onClick={() => handleAskStream("What is your greatest invention?")}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-full shadow font-medium transition transform hover:scale-105 active:scale-95"
        >
          🧪 Test Streaming (Hardcoded)
        </button>
    
        <button
          onClick={handleVoiceQuestion}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow font-medium transition transform hover:scale-105 active:scale-95"
        >
          🎤 Ask Your Own Question
        </button>
      </div>

      {showOptions && (
        <div className="mt-6 flex flex-col gap-4 items-center">
          <button
            onClick={() => { setShowOptions(false); handlePlayPodcast(); }}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow font-medium transition transform hover:scale-105 active:scale-95"
          >
            ▶️ Back to Story
          </button>
          <button
            onClick={handleVoiceQuestion}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow font-medium transition transform hover:scale-105 active:scale-95"
          >
            🎤 Ask Another Question
          </button>
        </div>
      )}

      <audio ref={podcastAudio} src="/podcast.mp3" preload="auto" playsInline />
      <audio ref={responseAudio} preload="auto" playsInline controls style={{ display: 'none' }} />
      <audio ref={promptAudio} src="/acknowledge.mp3" hidden preload="auto" playsInline />
      <audio ref={choiceAudio} src="/choice.mp3" hidden preload="auto" playsInline />
      <audio ref={unlockAudio} src="/unlock.mp3" hidden preload="auto" playsInline />
    </div>
  );
}
