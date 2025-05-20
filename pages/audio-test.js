"use client"

import { useState, useEffect, useRef } from "react"
import Head from "next/head"

export default function AudioTest() {
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [testText, setTestText] = useState("This is a test of the audio system.")
  const [selectedVoice, setSelectedVoice] = useState("en-US-Neural2-D")
  const [logs, setLogs] = useState([])
  const [customUrl, setCustomUrl] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [testResults, setTestResults] = useState({
    silentMp3: { exists: false, size: 0, type: "" },
    testAudioMp3: { exists: false, size: 0, type: "" },
  })

  const silentAudioRef = useRef(null)
  const testAudioRef = useRef(null)
  const streamAudioRef = useRef(null)
  const customAudioRef = useRef(null)

  // Add a log entry
  const addLog = (message) => {
    setLogs((prev) => [...prev, { time: new Date().toISOString(), message }])
    console.log(message)
  }

  // Check if audio files exist
  useEffect(() => {
    const checkFile = async (url, key) => {
      try {
        const response = await fetch(url, { method: "HEAD" })
        if (response.ok) {
          const size = response.headers.get("content-length") || "unknown"
          const type = response.headers.get("content-type") || "unknown"
          setTestResults((prev) => ({
            ...prev,
            [key]: { exists: true, size, type },
          }))
          addLog(`✅ ${url} exists (${size} bytes, ${type})`)
        } else {
          setTestResults((prev) => ({
            ...prev,
            [key]: { exists: false, size: 0, type: "" },
          }))
          addLog(`❌ ${url} does not exist (${response.status}: ${response.statusText})`)
        }
      } catch (error) {
        addLog(`❌ Error checking ${url}: ${error.message}`)
        setTestResults((prev) => ({
          ...prev,
          [key]: { exists: false, size: 0, type: "", error: error.message },
        }))
      }
    }

    checkFile("/silent.mp3", "silentMp3")
    checkFile("/test-audio.mp3", "testAudioMp3")
  }, [])

  // Function to unlock audio
  const unlockAudio = async () => {
    if (isUnlocking) return

    setIsUnlocking(true)
    addLog("Attempting to unlock audio...")

    try {
      if (silentAudioRef.current) {
        silentAudioRef.current.volume = 0.1

        // Try to play the silent audio
        const playPromise = silentAudioRef.current.play()

        if (playPromise !== undefined) {
          await playPromise
          addLog("Silent audio played successfully - audio unlocked")
          setAudioUnlocked(true)
        }
      } else {
        addLog("❌ Silent audio element not found")
      }
    } catch (error) {
      addLog(`❌ Error unlocking audio: ${error.message}`)
    } finally {
      setIsUnlocking(false)
    }
  }

  // Function to play test audio
  const playTestAudio = async () => {
    if (!audioUnlocked) {
      addLog("❌ Audio not unlocked yet. Please unlock audio first.")
      return
    }

    addLog("Playing test audio...")

    try {
      if (testAudioRef.current) {
        testAudioRef.current.volume = 1.0
        setIsPlaying(true)

        const playPromise = testAudioRef.current.play()

        if (playPromise !== undefined) {
          await playPromise
          addLog("Test audio playback started")
        }
      } else {
        addLog("❌ Test audio element not found")
      }
    } catch (error) {
      addLog(`❌ Error playing test audio: ${error.message}`)
      setIsPlaying(false)
    }
  }

  // Function to generate and play streaming audio
  const generateStreamingAudio = async () => {
    if (!audioUnlocked) {
      addLog("❌ Audio not unlocked yet. Please unlock audio first.")
      return
    }

    addLog(`Generating streaming audio with text: "${testText}" and voice: ${selectedVoice}`)

    try {
      const timestamp = Date.now()
      const streamUrl = `/api/stream-audio?id=test_${timestamp}&text=${encodeURIComponent(testText)}&voice=${encodeURIComponent(selectedVoice)}`

      addLog(`Stream URL: ${streamUrl}`)

      if (streamAudioRef.current) {
        streamAudioRef.current.src = streamUrl
        streamAudioRef.current.load()
        setIsPlaying(true)

        const playPromise = streamAudioRef.current.play()

        if (playPromise !== undefined) {
          await playPromise
          addLog("Streaming audio playback started")
        }
      } else {
        addLog("❌ Streaming audio element not found")
      }
    } catch (error) {
      addLog(`❌ Error generating streaming audio: ${error.message}`)
      setIsPlaying(false)
    }
  }

  // Function to play custom URL
  const playCustomUrl = async () => {
    if (!audioUnlocked) {
      addLog("❌ Audio not unlocked yet. Please unlock audio first.")
      return
    }

    if (!customUrl) {
      addLog("❌ Please enter a custom URL")
      return
    }

    addLog(`Playing custom URL: ${customUrl}`)

    try {
      if (customAudioRef.current) {
        customAudioRef.current.src = customUrl
        customAudioRef.current.load()
        setIsPlaying(true)

        const playPromise = customAudioRef.current.play()

        if (playPromise !== undefined) {
          await playPromise
          addLog("Custom URL audio playback started")
        }
      } else {
        addLog("❌ Custom audio element not found")
      }
    } catch (error) {
      addLog(`❌ Error playing custom URL: ${error.message}`)
      setIsPlaying(false)
    }
  }

  // Event handlers for audio elements
  useEffect(() => {
    const handleAudioEnd = () => {
      addLog("Audio playback ended")
      setIsPlaying(false)
    }

    const handleAudioError = (e, source) => {
      const errorDetails = e.target.error ? `${e.target.error.code}: ${e.target.error.message}` : "Unknown error"
      addLog(`❌ ${source} error: ${errorDetails}`)
      setIsPlaying(false)
    }

    const elements = [
      { ref: silentAudioRef, name: "Silent audio" },
      { ref: testAudioRef, name: "Test audio" },
      { ref: streamAudioRef, name: "Streaming audio" },
      { ref: customAudioRef, name: "Custom URL audio" },
    ]

    elements.forEach(({ ref, name }) => {
      if (ref.current) {
        ref.current.addEventListener("ended", handleAudioEnd)
        ref.current.addEventListener("error", (e) => handleAudioError(e, name))
      }
    })

    return () => {
      elements.forEach(({ ref, name }) => {
        if (ref.current) {
          ref.current.removeEventListener("ended", handleAudioEnd)
          ref.current.removeEventListener("error", (e) => handleAudioError(e, name))
        }
      })
    }
  }, [])

  // Add event listeners to unlock audio on first user interaction
  useEffect(() => {
    const unlockOnInteraction = () => {
      if (!audioUnlocked && !isUnlocking) {
        unlockAudio()
      }
    }

    window.addEventListener("click", unlockOnInteraction)
    window.addEventListener("touchstart", unlockOnInteraction)
    window.addEventListener("keydown", unlockOnInteraction)

    return () => {
      window.removeEventListener("click", unlockOnInteraction)
      window.removeEventListener("touchstart", unlockOnInteraction)
      window.removeEventListener("keydown", unlockOnInteraction)
    }
  }, [audioUnlocked, isUnlocking])

  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>Audio Test Page</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">Audio Test Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Audio Controls</h2>

          <div className="mb-4">
            <button
              onClick={unlockAudio}
              disabled={audioUnlocked || isUnlocking}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              {isUnlocking ? "Unlocking..." : audioUnlocked ? "Audio Unlocked" : "Unlock Audio"}
            </button>
            <div className="mt-2 text-sm">Status: {audioUnlocked ? "✅ Unlocked" : "❌ Locked"}</div>
          </div>

          <div className="mb-4">
            <h3 className="font-medium mb-2">Test Built-in Audio Files</h3>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <button
                  onClick={playTestAudio}
                  disabled={!audioUnlocked || isPlaying}
                  className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                >
                  Play test-audio.mp3
                </button>
                <div className="mt-1 text-sm">
                  Status:{" "}
                  {testResults.testAudioMp3.exists
                    ? `✅ Exists (${testResults.testAudioMp3.size} bytes)`
                    : "❌ Not found"}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-medium mb-2">Test Streaming Audio</h3>
            <div className="mb-2">
              <label className="block text-sm mb-1">Text to speak:</label>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm mb-1">Voice:</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="en-US-Neural2-D">Default Male (en-US-Neural2-D)</option>
                <option value="en-US-Neural2-F">Default Female (en-US-Neural2-F)</option>
                <option value="en-US-Neural2-A">Alternative Voice A</option>
                <option value="en-US-Neural2-C">Alternative Voice C</option>
              </select>
            </div>
            <button
              onClick={generateStreamingAudio}
              disabled={!audioUnlocked || isPlaying || !testText}
              className="bg-purple-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              Generate & Play Streaming Audio
            </button>
          </div>

          <div className="mb-4">
            <h3 className="font-medium mb-2">Test Custom URL</h3>
            <div className="mb-2">
              <label className="block text-sm mb-1">Custom Audio URL:</label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/audio.mp3"
                className="w-full p-2 border rounded"
              />
            </div>
            <button
              onClick={playCustomUrl}
              disabled={!audioUnlocked || isPlaying || !customUrl}
              className="bg-yellow-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              Play Custom URL
            </button>
          </div>
        </div>

        <div className="bg-gray-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="bg-black text-green-400 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  <span className="text-gray-500">[{log.time.split("T")[1].split(".")[0]}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gray-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Audio Elements (Hidden)</h2>
        <div className="text-sm text-gray-500 mb-2">
          These audio elements are used for testing but are hidden from view.
        </div>

        <audio ref={silentAudioRef} src="/silent.mp3" preload="auto" />
        <audio ref={testAudioRef} src="/test-audio.mp3" preload="auto" />
        <audio ref={streamAudioRef} preload="auto" />
        <audio ref={customAudioRef} preload="auto" />
      </div>
    </div>
  )
}
