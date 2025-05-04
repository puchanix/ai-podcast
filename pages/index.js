
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
    return () => document.removeEventListener('click', unlock);
  }, [audioUnlocked]);

  const stopAllAudio = () => {
    podcastAudio.current?.pause();
    responseAudio.current?.pause();
    promptAudio.current?.pause();
    choiceAudio.current?.pause();
    setIsPlaying(false);
  };

  const handlePlayPodcast = () => {
    stopAllAudio();
    if (podcastAudio.current) {
      podcastAudio.current.currentTime = storyPosition || 0;
      podcastAudio.current.play();
    }
    setIsPlaying(true);
    setShowOptions(false);
    setStatusMessage('▶️ Playing story...');
  };

  const handlePausePodcast = () => {
    if (podcastAudio.current && !podcastAudio.current.paused) {
      setStoryPosition(podcastAudio.current.currentTime || 0);
    }
    stopAllAudio();
    setIsPlaying(false);
    setStatusMessage('⏸️ Paused');
  };

  const handleAsk = async (question) => {
    stopAllAudio();
    setIsThinking(true);
    setShowOptions(false);
    setStatusMessage('🤔 Thinking...');

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const { answer, audioUrl } = await res.json();
      if (!audioUrl) throw new Error('No audio received');

      responseAudio.current.src = "";
      responseAudio.current.src = audioUrl;
      responseAudio.current.muted = false;

      setStatusMessage('🎙️ Da Vinci replies');
      try {
        await responseAudio.current.play();
      } catch (err) {
        console.error('Playback error:', err);
        setStatusMessage('❌ Playback blocked. Tap to play.');
        responseAudio.current.controls = true;
        responseAudio.current.style.display = 'block';
      }

      responseAudio.current.onended = () => {
        setStatusMessage('🧠 What next?');
        choiceAudio.current.play();
        setShowOptions(true);
        setIsThinking(false);
      };
    } catch (err) {
      console.error(err);
      setStatusMessage('❌ Error answering');
      setIsThinking(false);
    }
  };

  return <div>...</div>; // The rest of your UI code remains unchanged
}
