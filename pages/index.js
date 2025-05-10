"use client"

// index.js with improved mobile voice recording for iOS
// Fixes the issue of recordings getting truncated after ~5 seconds on mobile

import { useEffect, useRef, useState } from "react"
import { personas } from "../lib/personas"

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState("daVinci")
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isDaVinciSpeaking, setIsDaVinciSpeaking] = useState(false)
  const [daVinciPaused, setDaVinciPaused] = useState(false)
  const [popularQuestions, setPopularQuestions] = useState([])
  const [recordingTime, setRecordingTime] = useState(0)
  const mimeType = useRef("")

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const filename = useRef("input.webm")
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  const podcastAudio = useRef(null)
  const daVinciAudio = useRef(null)

  const isTouchDevice = false // Treat all devices the same
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))

  const handleTouchStart = () => {
    if (isTouchDevice && !isRecording && !isThinking) startRecording()
  }

  const handleTouchEnd = () => {
    if (isTouchDevice && isRecording && mediaRecorderRef.current?.state === "recording") {
      stopRecording()
    }
  }

  const handleClickRecord = () => {
    if (!isTouchDevice) {
      if (!isRecording) {
        startRecording()
      } else {
        stopRecording()
      }
    }
  }

  const fetchPopularQuestions = async () => {
    try {
      const res = await fetch(`/api/question-count?character=${selectedPersona}`)
      const data = await res.json()
      setPopularQuestions(data.questions || [])
    } catch (err) {
      console.error("Failed to fetch popular questions", err)
    }
  }

  useEffect(() => {
    fetchPopularQuestions()
  }, [selectedPersona])

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions && navigator.mediaDevices) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((res) => {
          if (res.state === "prompt") {
            navigator.mediaDevices
              .getUserMedia({ audio: true })
              .then((stream) => stream.getTracks().forEach((track) => track.stop()))
              .catch(() => {})
          }
        })
        .catch(() => {})
    }
  }, [])

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const recordQuestion = async (question) => {
    if (!question) return
    try {
      await fetch(`/api/question-count`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: selectedPersona, question }),
      })
      await fetchPopularQuestions()
    } catch (err) {
      console.error("Failed to record question click", err)
    }
  }

  useEffect(() => {
    if (!isThinking) return
    const messages = [
      "Pondering your question…",
      "Almost there…",
      "Just a moment more…",
      `${personas[selectedPersona].name} is working on your question…`,
    ]
    let idx = 0
    setStatusMessage(messages[0])
    const iv = setInterval(() => {
      idx = (idx + 1) % messages.length
      setStatusMessage(messages[idx])
    }, 3000)
    return () => clearInterval(iv)
  }, [isThinking, selectedPersona])

  const unlockAudio = () => {
    const dummy = new Audio("/silent.mp3")
    dummy.play().catch(() => {})
  }

  const stopDaVinci = () => {
    if (daVinciAudio.current) {
      daVinciAudio.current.pause()
      daVinciAudio.current.src = ""
      setIsDaVinciSpeaking(false)
      setDaVinciPaused(true)
    }
  }

  const stopPodcast = () => {
    if (podcastAudio.current && !podcastAudio.current.paused) {
      podcastAudio.current.pause()
      setIsPodcastPlaying(false)
    }
  }

  const startRecording = async () => {
    unlockAudio()
    stopDaVinci()
    stopPodcast()

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream

      // For iOS, don't specify mimeType
      if (isIOS) {
        try {
          mediaRecorderRef.current = new MediaRecorder(stream)
          console.log("Using default recorder for iOS")
        } catch (e) {
          console.error("iOS recorder error:", e)
          setStatusMessage("❌ Mic not supported on this device")
          return
        }
      } else {
        // Non-iOS devices
        try {
          mimeType.current = "audio/webm"
          mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mimeType.current })
        } catch (e) {
          console.log("Fallback to default recorder")
          mediaRecorderRef.current = new MediaRecorder(stream)
        }
      }

      chunksRef.current = []

      // Collect data more frequently on iOS
      const timeslice = isIOS ? 100 : 1000

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
          console.log(`Chunk received: ${e.data.size} bytes`)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        console.log(`Recording stopped. Total chunks: ${chunksRef.current.length}`)

        // Create blob without specifying type for iOS
        let blob
        if (isIOS) {
          blob = new Blob(chunksRef.current)
          filename.current = "recording.m4a"
        } else {
          blob = new Blob(chunksRef.current, { type: mimeType.current || "audio/webm" })
          filename.current = "recording.webm"
        }

        console.log("📦 Audio blob size:", blob.size, "bytes — Chunks:", chunksRef.current.length)

        chunksRef.current = []

        const formData = new FormData()
        formData.append("audio", blob, filename.current)
        if (isIOS) {
          formData.append("isIOS", "true")
        }

        setStatusMessage("📝 Transcribing...")
        setIsTranscribing(true)

        try {
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          })

          if (!res.ok) {
            const errorText = await res.text()
            console.error("Transcription API error:", errorText)
            throw new Error(`API returned ${res.status}: ${errorText}`)
          }

          const json = await res.json()
          const transcript = json.text?.trim()
          if (!transcript) throw new Error("No transcript")

          console.log("Transcription result:", transcript)
          setStatusMessage("🎧 Answering...")
          await recordQuestion(transcript)
          handleAsk(transcript)
        } catch (err) {
          console.error("❌ Transcription failed:", err)
          setStatusMessage("⚠️ Could not understand your voice.")
        } finally {
          setIsTranscribing(false)
        }

        setIsRecording(false)
        setRecordingTime(0)

        // Stop all tracks to release the microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      // Start recording with more frequent intervals for iOS
      mediaRecorderRef.current.start(timeslice)
      setIsRecording(true)
      setStatusMessage("🎤 Listening...")
      setRecordingTime(0)

      // Start timer to show recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)

        // Auto-stop after 30 seconds to prevent issues
        if (recordingTime >= 29) {
          stopRecording()
        }
      }, 1000)
    } catch (err) {
      console.error("Mic error:", err)
      setStatusMessage("❌ Mic not supported")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // Request final data chunk before stopping
      mediaRecorderRef.current.requestData()
      mediaRecorderRef.current.stop()

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const handleAsk = async (question) => {
    if (question === "Tell me Your Story") {
      togglePodcast()
      return
    }
    await recordQuestion(question)
    unlockAudio()
    stopDaVinci()
    stopPodcast()
    setIsThinking(true)
    setDaVinciPaused(false)

    const encoded = encodeURIComponent(question)
    const url = `/api/ask-audio?character=${selectedPersona}&question=${encoded}`

    const audio = daVinciAudio.current
    audio.src = url
    audio.load()
    audio
      .play()
      .then(() => {
        setIsDaVinciSpeaking(true)
        setIsThinking(false)
        setStatusMessage("")
      })
      .catch((err) => {
        console.error("Playback error:", err)
        setStatusMessage("❌ Audio playback failed")
        setIsThinking(false)
      })

    audio.onended = () => {
      setIsDaVinciSpeaking(false)
      setIsThinking(false)
      setStatusMessage("")
    }

    audio.onerror = () => {
      console.error("Audio playback error")
      setStatusMessage("❌ Audio playback error")
      setIsThinking(false)
    }
  }

  const togglePodcast = () => {
    if (!podcastAudio.current) return
    if (podcastAudio.current.paused) {
      podcastAudio.current.src = personas[selectedPersona].podcast
      podcastAudio.current.play()
      setIsPodcastPlaying(true)
      setHasStarted(true)
    } else {
      podcastAudio.current.pause()
      setIsPodcastPlaying(false)
    }
  }

  const toggleDaVinci = () => {
    const da = daVinciAudio.current
    if (!da) return
    if (da.paused) {
      da.play()
      setIsDaVinciSpeaking(true)
      setDaVinciPaused(false)
    } else {
      da.pause()
      setIsDaVinciSpeaking(false)
      setDaVinciPaused(true)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const uiQuestions = ["Tell me Your Story", ...personas[selectedPersona].questions]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background-top to-background text-copy p-4 space-y-6 text-center">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-wide text-heading drop-shadow-sm uppercase">
        Talk to the Heroes of History
      </h1>

      <img
        src={personas[selectedPersona].image || "/placeholder.svg"}
        alt={personas[selectedPersona].name}
        className="w-32 h-32 rounded-full object-cover shadow-md"
      />

      <select
        value={selectedPersona}
        onChange={(e) => setSelectedPersona(e.target.value)}
        className="mt-2 mb-6 p-2 rounded border border-border text-white bg-dropdown-bg bg-opacity-95 shadow-sm"
      >
        {Object.values(personas).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <p className="text-neutral-dark font-medium">
        {isRecording ? `🎤 Recording... ${formatTime(recordingTime)}` : statusMessage}
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {uiQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleAsk(q)}
            disabled={isThinking || isRecording}
            className="bg-button-primary hover:bg-button-hover disabled:bg-neutral-dark text-white py-2 px-5 rounded-full shadow-lg transition-all duration-200 ease-in-out"
          >
            {q}
          </button>
        ))}
      </div>

      {!isThinking && !isTranscribing && (
        <button
          onClick={handleClickRecord}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="mt-6"
          disabled={isThinking || isTranscribing}
        >
          <img
            src={isRecording ? "/mic-stop.gif" : "/mic-start.gif"}
            alt={isRecording ? "Stop recording" : "Start recording"}
            className="w-20 h-20 hover:scale-105 transition-transform duration-200"
          />
        </button>
      )}

      {(isDaVinciSpeaking || daVinciPaused) && (
        <button
          onClick={toggleDaVinci}
          className="bg-button-primary hover:bg-button-hover text-white py-2 px-5 rounded-full shadow-md"
        >
          {isDaVinciSpeaking ? "⏸️ Pause Response" : "▶️ Resume Response"}
        </button>
      )}

      <div className="mt-10 w-full max-w-md bg-box-accent p-5 rounded-xl shadow-lg border border-border">
        <h2 className="text-heading font-heading font-bold text-lg uppercase tracking-wider drop-shadow-sm opacity-90 mb-4">
          Popular Questions
        </h2>
        <div className="space-y-2">
          {popularQuestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(item.question)}
              className="w-full text-left bg-white hover:bg-neutral-dark py-2 px-3 rounded text-black"
            >
              {item.question}
            </button>
          ))}
        </div>
      </div>

      <audio ref={podcastAudio} hidden preload="auto" />
      <audio ref={daVinciAudio} hidden preload="auto" />
      <audio hidden preload="auto" src="/silent.mp3" />

      <footer className="mt-10 text-sm text-copy-soft">
        <div className="flex space-x-6 justify-center">
          <a href="/about" className="hover:underline">
            About
          </a>
          <a href="/feedback" className="hover:underline">
            Feedback
          </a>
        </div>
      </footer>
    </div>
  )
}
