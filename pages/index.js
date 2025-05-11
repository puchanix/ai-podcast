"use client"

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
  const [isIOS, setIsIOS] = useState(false)
  const mimeType = useRef("")

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const filename = useRef("input.webm")
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const recordingTimeoutRef = useRef(null)
  const processingRef = useRef(false)
  const audioContextRef = useRef(null)
  const audioBufferRef = useRef(null)
  const audioSourceRef = useRef(null)
  const audioProcessorRef = useRef(null)
  const audioDataRef = useRef([])

  const podcastAudio = useRef(null)
  const daVinciAudio = useRef(null)

  const isTouchDevice = false // Treat all devices the same

  useEffect(() => {
    // Check for iOS only on the client side
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    )
  }, [])

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
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
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

  // Function to start recording using Web Audio API for iOS
  const startRecordingWebAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream

      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioContextRef.current = new AudioContext({ sampleRate: 44100 })

      // Create source from microphone stream
      audioSourceRef.current = audioContextRef.current.createMediaStreamSource(stream)

      // Create script processor node
      const bufferSize = 4096
      audioProcessorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1)

      // Reset audio data array
      audioDataRef.current = []

      // Process audio data
      audioProcessorRef.current.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer
        const inputData = inputBuffer.getChannelData(0)

        // Clone the data to avoid reference issues
        const channelData = new Float32Array(inputData)
        audioDataRef.current.push(channelData)
      }

      // Connect nodes
      audioSourceRef.current.connect(audioProcessorRef.current)
      audioProcessorRef.current.connect(audioContextRef.current.destination)

      console.log("Started recording with Web Audio API")
      setIsRecording(true)
      setStatusMessage("🎤 Listening...")
      setRecordingTime(0)

      // Start timer to show recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      // Set a hard limit for recording duration (15 seconds for iOS)
      const maxDuration = 15000 // 15 seconds for iOS
      recordingTimeoutRef.current = setTimeout(() => {
        if (isRecording) {
          console.log("Auto-stopping recording after timeout")
          stopRecordingWebAudio()
        }
      }, maxDuration)
    } catch (err) {
      console.error("Error starting Web Audio recording:", err)
      setStatusMessage("❌ Mic not supported")
      processingRef.current = false
    }
  }

  // Function to stop recording using Web Audio API for iOS
  const stopRecordingWebAudio = async () => {
    console.log("Stopping Web Audio recording...")

    // Clear the auto-stop timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Disconnect and clean up audio nodes
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect()
      audioSourceRef.current.disconnect()
    }

    // Stop all tracks to release the microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }

    setIsRecording(false)
    setStatusMessage("Processing recording...")

    // Process the recorded audio data
    if (audioDataRef.current.length === 0) {
      console.error("No audio data recorded")
      setStatusMessage("⚠️ No audio recorded. Please try again.")
      processingRef.current = false
      return
    }

    try {
      // Concatenate all audio chunks
      let totalLength = 0
      for (const buffer of audioDataRef.current) {
        totalLength += buffer.length
      }

      const mergedBuffer = new Float32Array(totalLength)
      let offset = 0
      for (const buffer of audioDataRef.current) {
        mergedBuffer.set(buffer, offset)
        offset += buffer.length
      }

      // Convert to WAV format
      const wavBuffer = encodeWAV(mergedBuffer, audioContextRef.current.sampleRate)
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" })

      console.log("📦 WAV blob size:", wavBlob.size, "bytes")

      // Check if the blob is too small (likely corrupted or empty)
      if (wavBlob.size < 1000) {
        console.error("Audio blob too small, likely corrupted or empty")
        setStatusMessage("⚠️ Recording too short. Please try again.")
        processingRef.current = false
        return
      }

      // Send to server for transcription
      const formData = new FormData()
      formData.append("file", wavBlob, "recording.wav")
      formData.append("isIOS", "true")

      setStatusMessage("📝 Transcribing...")
      setIsTranscribing(true)

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
      processingRef.current = false
    }
  }

  // Function to encode audio data to WAV format
  function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // RIFF identifier
    writeString(view, 0, "RIFF")
    // RIFF chunk length
    view.setUint32(4, 36 + samples.length * 2, true)
    // RIFF type
    writeString(view, 8, "WAVE")
    // format chunk identifier
    writeString(view, 12, "fmt ")
    // format chunk length
    view.setUint32(16, 16, true)
    // sample format (1 is PCM)
    view.setUint16(20, 1, true)
    // channel count
    view.setUint16(22, 1, true)
    // sample rate
    view.setUint32(24, sampleRate, true)
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true)
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true)
    // bits per sample
    view.setUint16(34, 16, true)
    // data chunk identifier
    writeString(view, 36, "data")
    // data chunk length
    view.setUint32(40, samples.length * 2, true)

    // Write the PCM samples
    floatTo16BitPCM(view, 44, samples)

    return buffer
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]))
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
  }

  const startRecording = async () => {
    // Prevent multiple recordings
    if (processingRef.current) return
    processingRef.current = true

    unlockAudio()
    stopDaVinci()
    stopPodcast()

    try {
      // For iOS, use Web Audio API approach
      if (isIOS) {
        await startRecordingWebAudio()
        processingRef.current = false
        return
      }

      // For non-iOS devices, use MediaRecorder
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream

      try {
        mimeType.current = "audio/webm"
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mimeType.current })
      } catch (e) {
        console.log("Fallback to default recorder")
        mediaRecorderRef.current = new MediaRecorder(stream)
      }

      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
          console.log(`Chunk received: ${e.data.size} bytes, total chunks: ${chunksRef.current.length}`)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        console.log(`Recording stopped. Total chunks: ${chunksRef.current.length}`)

        // Make sure we have chunks to process
        if (chunksRef.current.length === 0) {
          console.error("No audio chunks collected")
          setStatusMessage("⚠️ No audio recorded. Please try again.")
          setIsRecording(false)
          processingRef.current = false
          return
        }

        // Create blob with the appropriate type
        const blob = new Blob(chunksRef.current, { type: mimeType.current || "audio/webm" })
        filename.current = "recording.webm"

        console.log("📦 Audio blob size:", blob.size, "bytes — Chunks:", chunksRef.current.length)
        console.log("📦 Audio filename:", filename.current, "type:", blob.type)

        // Check if the blob is too small (likely corrupted or empty)
        if (blob.size < 1000) {
          console.error("Audio blob too small, likely corrupted or empty")
          setStatusMessage("⚠️ Recording too short. Please try again.")
          setIsRecording(false)
          processingRef.current = false
          return
        }

        const formData = new FormData()
        formData.append("file", blob, filename.current)

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
          processingRef.current = false
        }

        setIsRecording(false)
        setRecordingTime(0)

        // Stop all tracks to release the microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      // Start recording
      mediaRecorderRef.current.start(1000)
      setIsRecording(true)
      setStatusMessage("🎤 Listening...")
      setRecordingTime(0)

      // Start timer to show recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      // Set a hard limit for recording duration (30 seconds)
      const maxDuration = 30000 // 30 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        if (isRecording && mediaRecorderRef.current?.state === "recording") {
          console.log("Auto-stopping recording after timeout")
          stopRecording()
        }
      }, maxDuration)

      processingRef.current = false
    } catch (err) {
      console.error("Mic error:", err)
      setStatusMessage("❌ Mic not supported")
      processingRef.current = false
    }
  }

  const stopRecording = () => {
    console.log("Stopping recording...")

    // For iOS, use Web Audio API approach
    if (isIOS) {
      stopRecordingWebAudio()
      return
    }

    // Clear the auto-stop timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        // Request final data chunk before stopping
        mediaRecorderRef.current.requestData()

        // Give a little time for the final chunk to be processed
        setTimeout(() => {
          try {
            mediaRecorderRef.current.stop()
          } catch (err) {
            console.error("Error stopping media recorder:", err)
          }

          // Clear timer
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
        }, 500) // Longer delay to ensure all audio is captured
      } catch (err) {
        console.error("Error stopping recording:", err)

        // Cleanup even if there's an error
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        setIsRecording(false)
        processingRef.current = false
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
        {Object.keys(personas).map((id) => (
          <option key={id} value={id}>
            {personas[id].name}
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
            src={isRecording ? "/mic-stop.jpg" : "/mic-start.jpg"}
            alt={isRecording ? "Stop recording" : "Start recording"}
            className="w-56 h-auto hover:scale-105 transition-transform duration-200"
          />
        </button>
      )}

      <div className="mt-6 text-center">
        <a
          href="/debate"
          className="bg-button-primary hover:bg-button-hover text-white py-2 px-5 rounded-full shadow-lg transition-all duration-200 ease-in-out inline-block"
        >
          Try Historical Debates
        </a>
      </div>

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
