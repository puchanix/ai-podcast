"use client"

import { useState, useCallback } from "react"

export function useMobileAudioUnlock() {
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  const unlockAudio = useCallback(async () => {
    if (audioUnlocked) return // Already unlocked

    try {
      console.log("🔊 [MOBILE AUDIO] Attempting to unlock audio...")

      // Create and play silent audio to unlock iOS audio context
      const silentAudio = new Audio("/silent.mp3")
      silentAudio.volume = 0
      silentAudio.muted = true

      // Try to play the silent audio
      await silentAudio.play()

// Also create and resume AudioContext if available
if (typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined") {
  const AudioContextClass = AudioContext || webkitAudioContext
  
  // Create global audio context that persists
  if (!window.audioContext) {
    window.audioContext = new AudioContextClass()
  }
  
  if (window.audioContext.state === "suspended") {
    await window.audioContext.resume()
  }
  
  console.log("🔊 [MOBILE AUDIO] Global audio context state:", window.audioContext.state)
}

      setAudioUnlocked(true)
      console.log("🔊 [MOBILE AUDIO] Audio successfully unlocked!")
    } catch (error) {
      console.error("🔊 [MOBILE AUDIO] Failed to unlock audio:", error)
      // Don't throw error, just log it - we'll try again on next interaction
    }
  }, [audioUnlocked])

  return {
    audioUnlocked,
    unlockAudio,
  }
}