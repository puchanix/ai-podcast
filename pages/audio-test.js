"use client"

import { useState, useEffect, useRef } from "react"
import Head from "next/head"
import { AudioContext, webkitAudioContext } from "some-audio-context-library" // Placeholder for importing AudioContext and webkitAudioContext

export default function AudioTest() {
  const [testResults, setTestResults] = useState([])
  const [silentMp3Exists, setSilentMp3Exists] = useState(null)
  const [testAudioExists, setTestAudioExists] = useState(null)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [browserInfo, setBrowserInfo] = useState({})

  const audioRef = useRef(null)
  const silentAudioRef = useRef(null)

  // Add a test result
  const addResult = (test, result, success = true) => {
    setTestResults((prev) => [
      ...prev,
      {
        id: Date.now(),
        test,
        result,
        success,
        timestamp: new Date().toLocaleTimeString(),
      },
    ])
  }

  // Get browser information
  useEffect(() => {
    setBrowserInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      audioContext: typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined",
    })
  }, [])

  // Check if silent.mp3 exists
  const checkSilentMp3 = async () => {
    try {
      addResult("Checking silent.mp3", "Fetching...")
      const response = await fetch("/silent.mp3")

      if (response.ok) {
        const size = response.headers.get("content-length") || "unknown size"
        setSilentMp3Exists(true)
        addResult("silent.mp3 check", `File exists (${size} bytes)`, true)
      } else {
        setSilentMp3Exists(false)
        addResult("silent.mp3 check", `File not found: ${response.status} ${response.statusText}`, false)
      }
    } catch (err) {
      setSilentMp3Exists(false)
      addResult("silent.mp3 check", `Error: ${err.message}`, false)
    }
  }

  // Check if test-audio.mp3 exists
  const checkTestAudio = async () => {
    try {
      addResult("Checking test-audio.mp3", "Fetching...")
      const response = await fetch("/test-audio.mp3")

      if (response.ok) {
        const size = response.headers.get("content-length") || "unknown size"
        setTestAudioExists(true)
        addResult("test-audio.mp3 check", `File exists (${size} bytes)`, true)
      } else {
        setTestAudioExists(false)
        addResult("test-audio.mp3 check", `File not found: ${response.status} ${response.statusText}`, false)
      }
    } catch (err) {
      setTestAudioExists(false)
      addResult("test-audio.mp3 check", `Error: ${err.message}`, false)
    }
  }

  // Unlock audio (for iOS)
  const unlockAudio = () => {
    addResult("Unlocking audio", "Attempting to unlock audio...")

    if (silentAudioRef.current) {
      silentAudioRef.current.src = "/silent.mp3"
      silentAudioRef.current.load()

      silentAudioRef.current
        .play()
        .then(() => {
          setAudioInitialized(true)
          addResult("Audio unlock", "Audio unlocked successfully", true)
        })
        .catch((err) => {
          addResult("Audio unlock", `Failed: ${err.message}`, false)
        })
    } else {
      addResult("Audio unlock", "Silent audio ref not available", false)
    }
  }

  // Play test audio using Audio constructor
  const playTestAudio = () => {
    addResult("Test audio", "Attempting to play test audio...")

    const audio = new Audio("/test-audio.mp3")

    audio.oncanplaythrough = () => {
      addResult("Test audio", "Audio loaded and can play through", true)
    }

    audio.onerror = (e) => {
      const errorDetails = audio.error ? `${audio.error.code}: ${audio.error.message}` : "Unknown error"
      addResult("Test audio", `Error: ${errorDetails}`, false)
    }

    audio
      .play()
      .then(() => {
        addResult("Test audio", "Playback started successfully", true)
      })
      .catch((err) => {
        addResult("Test audio", `Playback failed: ${err.message}`, false)
      })
  }

  // Play test audio using audio ref
  const playTestAudioWithRef = () => {
    addResult("Test audio (ref)", "Attempting to play test audio with ref...")

    if (audioRef.current) {
      audioRef.current.src = "/test-audio.mp3"
      audioRef.current.load()

      audioRef.current
        .play()
        .then(() => {
          addResult("Test audio (ref)", "Playback started successfully", true)
        })
        .catch((err) => {
          addResult("Test audio (ref)", `Playback failed: ${err.message}`, false)
        })
    } else {
      addResult("Test audio (ref)", "Audio ref not available", false)
    }
  }

  // Run all tests
  const runAllTests = () => {
    setTestResults([])
    checkSilentMp3()
    checkTestAudio()
    unlockAudio()
    setTimeout(() => {
      playTestAudio()
    }, 1000)
    setTimeout(() => {
      playTestAudioWithRef()
    }, 2000)
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Head>
        <title>Audio Test Page</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">Audio Test Page</h1>

      <div className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Browser Information</h2>
        <div className="space-y-2">
          <p>
            <strong>User Agent:</strong> {browserInfo.userAgent}
          </p>
          <p>
            <strong>Platform:</strong> {browserInfo.platform}
          </p>
          <p>
            <strong>Vendor:</strong> {browserInfo.vendor}
          </p>
          <p>
            <strong>AudioContext Support:</strong> {browserInfo.audioContext ? "Yes" : "No"}
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Audio Tests</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={unlockAudio} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Unlock Audio
          </button>
          <button onClick={checkSilentMp3} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Check silent.mp3
          </button>
          <button onClick={checkTestAudio} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Check test-audio.mp3
          </button>
          <button onClick={playTestAudio} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
            Play Test Audio
          </button>
          <button onClick={playTestAudioWithRef} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Play Test Audio (Ref)
          </button>
          <button onClick={runAllTests} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">
            Run All Tests
          </button>
        </div>

        <div className="mb-4">
          <h3 className="font-medium mb-2">Audio Status:</h3>
          <p>Audio Initialized: {audioInitialized ? "Yes" : "No"}</p>
          <p>silent.mp3 Exists: {silentMp3Exists === null ? "Unknown" : silentMp3Exists ? "Yes" : "No"}</p>
          <p>test-audio.mp3 Exists: {testAudioExists === null ? "Unknown" : testAudioExists ? "Yes" : "No"}</p>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 text-left">Time</th>
                <th className="py-2 px-4 text-left">Test</th>
                <th className="py-2 px-4 text-left">Result</th>
              </tr>
            </thead>
            <tbody>
              {testResults.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-4 px-4 text-center text-gray-500">
                    No tests run yet. Click a button above to start testing.
                  </td>
                </tr>
              ) : (
                testResults.map((result) => (
                  <tr key={result.id} className="border-t">
                    <td className="py-2 px-4 text-sm text-gray-600">{result.timestamp}</td>
                    <td className="py-2 px-4">{result.test}</td>
                    <td className={`py-2 px-4 ${result.success ? "text-green-600" : "text-red-600"}`}>
                      {result.result}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden audio elements */}
      <audio ref={audioRef} className="hidden" controls={false} preload="auto" />
      <audio ref={silentAudioRef} className="hidden" controls={false} preload="auto" />

      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>This page is used for testing audio playback functionality.</p>
      </div>
    </div>
  )
}
