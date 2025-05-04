
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [storyPosition, setStoryPosition] = useState(0);
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
    if (podcastAudio.current && !podcastAudio.current.paused) {
      setStoryPosition(podcastAudio.current.currentTime);
    }
    stopAllAudio();
    setIsThinking(true);
    setShowOptions(false);
    setStatusMessage('🤔 Thinking (streaming)...');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      await playStreamedAudio(data.answer);
    } catch (err) {
      console.error(err);
      setStatusMessage('❌ Error answering');
      setIsThinking(false);
    }
  };

  const playStreamedAudio = async (text) => {
    try {
      const response = await fetch('/api/speak-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok || !response.body) throw new Error('Stream failed');

      const mediaSource = new MediaSource();
      responseAudio.current.src = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener('sourceopen', () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        const reader = response.body.getReader();

        const pump = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              mediaSource.endOfStream();
              return;
            }
            sourceBuffer.appendBuffer(value);
            pump();
          });
        };

        pump();
      });

      responseAudio.current.play();
      responseAudio.current.onended = () => {
        setStatusMessage('🧠 What next?');
        choiceAudio.current.play();
        setShowOptions(true);
        setIsThinking(false);
      };
    } catch (err) {
      console.error('Stream playback error:', err);
      setStatusMessage('❌ Error during audio streaming');
      setIsThinking(false);
    }
  };


  return () => document.removeEventListener('click', unlock);
  }, [audioUnlocked]);

  const stopAllAudio = () => {
    podcastAudio.current?.pause();
    responseAudio.current?.pause();
    promptAudio.current?.pause();
    choiceAudio.current?.pause();
    setIsPlaying(false);
  };

const handleAskStream = async (question) => {
  if (podcastAudio.current && !podcastAudio.current.paused) {
    setStoryPosition(podcastAudio.current.currentTime);
  }
  stopAllAudio();
  setIsThinking(true);
  setStatusMessage('🤔 Thinking (streaming)...');
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    await playStreamedAudio(data.answer);
  } catch (err) {
    console.error(err);
    setStatusMessage('❌ Error answering');
    setIsThinking(false);
  }
};

const playStreamedAudio = async (text) => {
  try {
    const response = await fetch('/api/speak-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok || !response.body) throw new Error('Stream failed');

    const mediaSource = new MediaSource();
    responseAudio.current.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', () => {
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      const reader = response.body.getReader();

      const pump = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            mediaSource.endOfStream();
            return;
          }
          sourceBuffer.appendBuffer(value);
          pump();
        });
      };

      pump();
    });

    responseAudio.current.play();
    responseAudio.current.onended = () => {
      setIsThinking(false);
      setStatusMessage('');
      setShowOptions(true);
    };
  } catch (err) {
    console.error('Stream playback error:', err);
    setStatusMessage('❌ Error during audio streaming');
    setIsThinking(false);
  }
};

  return null;
}