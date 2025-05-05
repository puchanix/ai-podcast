
import { useEffect, useRef, useState } from 'react';


  
async function playAudioFromAskStream(question) {
  try {
    const response = await fetch('/api/ask-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    if (!response.ok || !response.body) {
      console.error("Streaming playback failed: response not ok");
      return;
    }

    const blob = await response.blob();
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);
    audio.play().catch(err => console.error("Audio play error:", err));
  } catch (err) {
    console.error("Streaming audio error", err);
  }
}

