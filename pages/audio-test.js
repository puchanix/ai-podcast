"use client"

import { useState, useRef } from "react"
import Head from "next/head"

export default function AudioTest() {
  const [testResult, setTestResult] = useState("")
  const [silentResult, setSilentResult] = useState("")
  const [fileCheckResult, setFileCheckResult] = useState("")
  const [audioRefResult, setAudioRefResult] = useState("")
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)

  const audioRef = useRef(null)
  const silentAudioRef = useRef(null)

  // Function to unlock audio on iOS
  const unlockAudio = () => {
    console.log("Attempting to unlock audio...")
    setTestResult("Attempting to unlock audio...")

    // Play silent audio to unlock audio on iOS
    if (silentAudioRef.current) {
      silentAudioRef.current.src = "/silent.mp3"
      silentAudioRef.current.load()

      silentAudioRef.current
        .play()
        .then(() => {
          console.log("Silent audio played successfully - audio unlocked")
          setTestResult("Silent audio played successfully - audio unlocked")
          setIsAudioInitialized(true)
        })
        .catch((err) => {
          console.error("Failed to play silent audio:", err)
          setTestResult(`Failed to unlock audio: ${err.message}`)
        })
    }
  }

  // Test silent.mp3
  const testSilentMp3 = () => {
    const audio = new Audio("/silent.mp3")
    setSilentResult("Testing silent.mp3...")

    audio.oncanplaythrough = () => {
      setSilentResult("silent.mp3 loaded successfully")
    }

    audio.onerror = (e) => {
      const errorDetails = audio.error ? `${audio.error.code}: ${audio.error.message}` : "Unknown error"
      setSilentResult(`Error loading silent.mp3: ${errorDetails}`)
    }

    audio.load()
    audio
      .play()
      .then(() => {
        setSilentResult("silent.mp3 played successfully")
      })
      .catch((err) => {
        setSilentResult(`Error playing silent.mp3: ${err.message}`)
      })
  }

  // Test test-audio.mp3
  const testAudioMp3 = () => {
    const audio = new Audio("/test-audio.mp3")
    setTestResult("Testing test-audio.mp3...")

    audio.oncanplaythrough = () => {
      setTestResult("test-audio.mp3 loaded successfully")
    }

    audio.onerror = (e) => {
      const errorDetails = audio.error ? `${audio.error.code}: ${audio.error.message}` : "Unknown error"
      setTestResult(`Error loading test-audio.mp3: ${errorDetails}`)
    }

    audio.load()
    audio
      .play()
      .then(() => {
        setTestResult("test-audio.mp3 played successfully")
      })
      .catch((err) => {
        setTestResult(`Error playing test-audio.mp3: ${err.message}`)
      })
  }

  // Check if files exist
  const checkFiles = async () => {
    setFileCheckResult("Checking files...")

    try {
      // Check silent.mp3
      const silentResponse = await fetch("/silent.mp3")
      const silentStatus = silentResponse.ok
        ? `silent.mp3 exists (${silentResponse.headers.get("content-length") || "unknown"} bytes)`
        : `silent.mp3 not found: ${silentResponse.status} ${silentResponse.statusText}`

      // Check test-audio.mp3
      const testResponse = await fetch("/test-audio.mp3")
      const testStatus = testResponse.ok
        ? `test-audio.mp3 exists (${testResponse.headers.get("content-length") || "unknown"} bytes)`
        : `test-audio.mp3 not found: ${testResponse.status} ${testResponse.statusText}`

      setFileCheckResult(`${silentStatus}\n${testStatus}`)
    } catch (err) {
      setFileCheckResult(`Error checking files: ${err.message}`)
    }
  }

  // Test audio ref
  const testAudioRef = () => {
    setAudioRefResult("Testing audio ref...")

    if (audioRef.current) {
      audioRef.current.src = "/test-audio.mp3"
      audioRef.current.load()

      audioRef.current
        .play()
        .then(() => {
          setAudioRefResult("Audio ref played successfully")
        })
        .catch((err) => {
          setAudioRefResult(`Error playing audio ref: ${err.message}`)
        })
    } else {
      setAudioRefResult("Audio ref not available")
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Head>
        <title>Audio Test Page</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">Audio Test Page</h1>

      <div className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Audio Initialization</h2>
        <p className="mb-2">Status: {isAudioInitialized ? "✅ Initialized" : "❌ Not Initialized"}</p>
        <button onClick={unlockAudio} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Unlock Audio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test silent.mp3</h2>
          <button onClick={testSilentMp3} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4">
            Test silent.mp3
          </button>
          <pre className="bg-gray-200 p-2 rounded whitespace-pre-wrap">{silentResult}</pre>
        </div>

        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test test-audio.mp3</h2>
          <button onClick={testAudioMp3} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4">
            Test test-audio.mp3
          </button>
          <pre className="bg-gray-200 p-2 rounded whitespace-pre-wrap">{testResult}</pre>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Check File Existence</h2>
          <button onClick={checkFiles} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 mb-4">
            Check Files
          </button>
          <pre className="bg-gray-200 p-2 rounded whitespace-pre-wrap">{fileCheckResult}</pre>
        </div>

        <div className="p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test Audio Ref</h2>
          <button
            onClick={testAudioRef}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 mb-4"
          >
            Test Audio Ref
          </button>
          <pre className="bg-gray-200 p-2 rounded whitespace-pre-wrap">{audioRefResult}</pre>
        </div>
      </div>

      <div className="p-4 bg-gray-100 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Direct Audio Elements</h2>
        <div className="mb-4">
          <h3 className="font-medium mb-2">Silent Audio:</h3>
          <audio ref={silentAudioRef} controls src="/silent.mp3" className="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>

        <div>
          <h3 className="font-medium mb-2">Test Audio:</h3>
          <audio ref={audioRef} controls src="/test-audio.mp3" className="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>

      <div className="p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Browser Information</h2>
        <pre className="bg-gray-200 p-2 rounded whitespace-pre-wrap" id="browser-info">
          JavaScript is required to display browser information.
        </pre>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.getElementById('browser-info').textContent = 
            'User Agent: ' + navigator.userAgent + '\\n' +
            'Platform: ' + navigator.platform + '\\n' +
            'Vendor: ' + navigator.vendor + '\\n' +
            'Audio Context Support: ' + (window.AudioContext || window.webkitAudioContext ? 'Yes' : 'No');
        `,
        }}
      />
    </div>
  )
}
