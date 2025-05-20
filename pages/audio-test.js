"use client"

import { useState, useEffect, useRef } from "react"
import Head from "next/head"
import { webkitAudioContext } from "webkit-audio-context"

export default function AudioTest() {
  const [testResults, setTestResults] = useState([])
  const [customUrl, setCustomUrl] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState("")
  const [testText, setTestText] = useState("This is a test of the audio system.")
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const audioRef = useRef(null)
  const silentAudioRef = useRef(null)

  // Function to unlock audio on iOS
  const unlockAudio = () => {
    console.log("Attempting to unlock audio...")
    addTestResult("Attempting to unlock audio...")

    // Play silent audio to unlock audio on iOS
    if (silentAudioRef.current) {
      silentAudioRef.current.src = "/silent.mp3"
      silentAudioRef.current.load()

      silentAudioRef.current
        .play()
        .then(() => {
          console.log("Silent audio played successfully - audio unlocked")
          addTestResult("✅ Silent audio played successfully - audio unlocked")
          setAudioInitialized(true)
        })
        .catch((err) => {
          console.error("Failed to play silent audio:", err)
          addTestResult(`❌ Failed to unlock audio: ${err.message}`)
        })
    }
  }

  // Add a test result
  const addTestResult = (message) => {
    setTestResults((prev) => [...prev, { id: Date.now(), message }])
  }

  // Check if a file exists
  const checkFile = async (url, name) => {
    try {
      addTestResult(`Checking ${name} at ${url}...`)
      const response = await fetch(url)

      if (response.ok) {
        const contentType = response.headers.get("content-type")
        const contentLength = response.headers.get("content-length") || "unknown"
        addTestResult(`✅ ${name} exists: ${contentType}, ${contentLength} bytes`)

        // For audio files, check if they have content
        if (contentType && contentType.includes("audio")) {
          const blob = await response.blob()
          if (blob.size > 0) {
            addTestResult(`✅ ${name} has content: ${blob.size} bytes`)
          } else {
            addTestResult(`❌ ${name} is empty (0 bytes)`)
          }
        }

        return true
      } else {
        addTestResult(`❌ ${name} not found: ${response.status} ${response.statusText}`)
        return false
      }
    } catch (err) {
      addTestResult(`❌ Error checking ${name}: ${err.message}`)
      return false
    }
  }

  // Play a test audio file
  const playTestAudio = (url, name) => {
    if (!audioRef.current) return

    addTestResult(`Playing ${name} from ${url}...`)

    audioRef.current.src = url
    audioRef.current.load()

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true)
        addTestResult(`✅ ${name} playback started`)
      })
      .catch((err) => {
        addTestResult(`❌ Error playing ${name}: ${err.message}`)
      })
  }

  // Generate a test audio file
  const generateTestAudio = async () => {
    if (!testText.trim()) {
      addTestResult("❌ Please enter some text to generate")
      return
    }

    setIsGenerating(true)
    setErrorMessage("")
    addTestResult("Generating test audio...")

    try {
      const response = await fetch("/api/debate-tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: testText,
          characterId: "einstein", // Use Einstein as a test character
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setGeneratedAudioUrl(data.audioUrl)
      addTestResult(`✅ Generated audio URL: ${data.audioUrl}`)

      // Check if the file exists
      await checkFile(data.audioUrl, "Generated audio")
    } catch (error) {
      setErrorMessage(error.message)
      addTestResult(`❌ Error generating audio: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Check custom URL
  const checkCustomUrl = async () => {
    if (!customUrl.trim()) return
    await checkFile(customUrl, "Custom URL")
  }

  // Initialize audio element event listeners
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onplay = () => {
        setIsPlaying(true)
        addTestResult("Audio playback started")
      }

      audioRef.current.onpause = () => {
        setIsPlaying(false)
        addTestResult("Audio playback paused")
      }

      audioRef.current.onended = () => {
        setIsPlaying(false)
        addTestResult("Audio playback ended")
      }

      audioRef.current.onerror = (e) => {
        const errorDetails = audioRef.current.error
          ? `${audioRef.current.error.code}: ${audioRef.current.error.message}`
          : "Unknown error"
        addTestResult(`❌ Audio playback error: ${errorDetails}`)
        setIsPlaying(false)
      }
    }
  }, [])

  // Run initial tests
  useEffect(() => {
    const runInitialTests = async () => {
      addTestResult("Starting audio tests...")

      // Check browser audio support
      addTestResult(`Browser: ${navigator.userAgent}`)

      if (typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined") {
        addTestResult("✅ AudioContext is supported")
      } else {
        addTestResult("❌ AudioContext is NOT supported")
      }

      // Check if silent.mp3 exists
      await checkFile("/silent.mp3", "silent.mp3")

      // Check if test-audio.mp3 exists
      await checkFile("/test-audio.mp3", "test-audio.mp3")
    }

    runInitialTests()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <Head>
        <title>Audio Debug Page</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">Audio Debug Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Audio Controls</h2>

          <div className="space-y-4">
            <div>
              <button
                onClick={unlockAudio}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mr-2"
              >
                Unlock Audio
              </button>

              <button
                onClick={() => playTestAudio("/test-audio.mp3", "Test Audio")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-2"
                disabled={isPlaying}
              >
                Play Test Audio
              </button>

              <button
                onClick={() => playTestAudio("/silent.mp3", "Silent Audio")}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
                disabled={isPlaying}
              >
                Play Silent Audio
              </button>
            </div>

            {isPlaying && (
              <div>
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.pause()
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                  Stop Playback
                </button>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-2">Check Custom URL</h3>
              <div className="flex">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="Enter URL to check"
                  className="flex-1 px-3 py-2 bg-gray-700 rounded-l text-white"
                />
                <button
                  onClick={checkCustomUrl}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-r"
                >
                  Check
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Generate Test Audio</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Test Text</label>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                rows={3}
              />
            </div>

            <div>
              <button
                onClick={generateTestAudio}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                disabled={isGenerating || !testText.trim()}
              >
                {isGenerating ? "Generating..." : "Generate Audio"}
              </button>
            </div>

            {errorMessage && (
              <div className="bg-red-900 p-3 rounded">
                <p className="text-red-300">{errorMessage}</p>
              </div>
            )}

            {generatedAudioUrl && (
              <div className="bg-gray-700 p-3 rounded">
                <p className="mb-2">Generated Audio:</p>
                <div className="flex items-center">
                  <span className="truncate flex-1">{generatedAudioUrl}</span>
                  <button
                    onClick={() => playTestAudio(generatedAudioUrl, "Generated Audio")}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded ml-2"
                    disabled={isPlaying}
                  >
                    Play
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Test Results</h2>

        <div className="bg-black p-4 rounded h-96 overflow-y-auto font-mono text-sm">
          {testResults.map((result) => (
            <div key={result.id} className="mb-1">
              {result.message}
            </div>
          ))}
        </div>
      </div>

      {/* Audio elements */}
      <audio ref={audioRef} className="hidden" controls />
      <audio ref={silentAudioRef} className="hidden" />
    </div>
  )
}
