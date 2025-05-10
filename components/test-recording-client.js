"use client"

import { useState, useRef, useEffect } from "react"

export default function TestRecordingClient() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState("")
  const [transcription, setTranscription] = useState("")
  const [status, setStatus] = useState("")
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [mimeType, setMimeType] = useState("audio/webm")

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    // Check for iOS only on the client side
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    setIsIOS(iOS)

    // Set appropriate mime type
    if (iOS) {
      setMimeType("audio/mp4")
    } else {
      setMimeType("audio/webm")
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    setStatus("Requesting microphone access...")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream
      setStatus(`Microphone access granted. Device: ${isIOS ? "iOS" : "Non-iOS"}`)

      // For iOS, don't specify mimeType
      if (isIOS) {
        try {
          mediaRecorderRef.current = new MediaRecorder(stream)
          setStatus("Using default recorder for iOS")
        } catch (e) {
          setStatus(`iOS recorder error: ${e.message}`)
          return
        }
      } else {
        // Non-iOS devices
        try {
          mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" })
          setStatus("Using audio/webm")
        } catch (e) {
          mediaRecorderRef.current = new MediaRecorder(stream)
          setStatus("Using default recorder")
        }
      }

      chunksRef.current = []

      // Collect data more frequently on iOS
      const timeslice = isIOS ? 100 : 1000

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
          setStatus(`Chunk received: ${e.data.size} bytes, total chunks: ${chunksRef.current.length}`)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        setStatus(`Recording stopped. Total chunks: ${chunksRef.current.length}`)

        // Create blob with the appropriate type
        let blob
        let filename

        if (isIOS) {
          blob = new Blob(chunksRef.current, { type: "audio/mp4" })
          filename = "recording.m4a"
        } else {
          blob = new Blob(chunksRef.current, { type: "audio/webm" })
          filename = "recording.webm"
        }

        setStatus(`Audio blob size: ${blob.size} bytes, filename: ${filename}, type: ${blob.type}`)
        setAudioBlob(blob)

        // Create URL for playback
        const url = URL.createObjectURL(blob)
        setAudioURL(url)
      }

      mediaRecorderRef.current.start(timeslice)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error("Microphone error:", err)
      setStatus(`Microphone error: ${err.message}`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.requestData()
      mediaRecorderRef.current.stop()

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      setIsRecording(false)
    }
  }

  const transcribeAudio = async () => {
    if (!audioBlob) {
      setStatus("No audio to transcribe")
      return
    }

    setStatus("Transcribing...")
    setIsTranscribing(true)

    // Create FormData for API
    const formData = new FormData()

    // Add the audio blob with the correct filename extension
    const filename = isIOS ? "recording.m4a" : "recording.webm"
    formData.append("audio", audioBlob, filename)

    // Add iOS flag
    formData.append("isIOS", isIOS ? "true" : "false")

    // Add mime type information
    formData.append("mimeType", audioBlob.type || mimeType)

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`API returned ${res.status}: ${errorText}`)
      }

      const json = await res.json()
      setTranscription(json.text || "No transcription returned")
      setStatus("Transcription complete")
    } catch (err) {
      console.error("Transcription error:", err)
      setStatus(`Transcription error: ${err.message}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="w-full max-w-md">
      <p>Device: {isIOS ? "iOS" : "Non-iOS"}</p>
      <p className="text-sm max-w-md text-center">{status}</p>

      {isRecording ? (
        <div className="flex flex-col items-center space-y-4">
          <p className="text-xl">Recording... {formatTime(recordingTime)}</p>
          <button
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-full text-lg"
          >
            Stop Recording
          </button>
        </div>
      ) : (
        <button
          onClick={startRecording}
          className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-full text-lg"
        >
          Start Recording
        </button>
      )}

      {audioURL && (
        <div className="mt-8 w-full">
          <h2 className="text-xl font-bold mb-2">Recording Playback</h2>
          <audio src={audioURL} controls className="w-full" />

          <button
            onClick={transcribeAudio}
            disabled={isTranscribing}
            className={`mt-4 ${
              isTranscribing ? "bg-gray-500" : "bg-green-500 hover:bg-green-600"
            } text-white py-2 px-4 rounded-full`}
          >
            {isTranscribing ? "Transcribing..." : "Transcribe Audio"}
          </button>
        </div>
      )}

      {transcription && (
        <div className="mt-8 w-full">
          <h2 className="text-xl font-bold mb-2">Transcription</h2>
          <div className="bg-white text-black p-4 rounded">{transcription}</div>
        </div>
      )}
    </div>
  )
}
