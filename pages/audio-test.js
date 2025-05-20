"use client"

import { useRef, useState, useEffect } from "react"

export default function AudioTest() {
  const [status, setStatus] = useState("Ready to test")
  const [errorDetails, setErrorDetails] = useState(null)
  const [audioFiles, setAudioFiles] = useState([])
  const audioRef = useRef(null)
  const silentAudioRef = useRef(null)

  // Check for available audio files on mount
  useEffect(() => {
    const checkFiles = async () => {
      const filesToCheck = ["/silent.mp3", "/test-audio.mp3", "/test-audio.wav"]

      const results = []

      for (const file of filesToCheck) {
        try {
          const response = await fetch(file, { method: "HEAD" })
          results.push({
            file,
            exists: response.ok,
            status: response.status,
            contentType: response.headers.get("content-type"),
            contentLength: response.headers.get("content-length"),
          })
        } catch (err) {
          results.push({
            file,
            exists: false,
            error: err.message,
          })
        }
      }

      setAudioFiles(results)
    }

    checkFiles()
  }, [])

  const unlockAudio = () => {
    setStatus("Attempting to unlock audio...")
    setErrorDetails(null)

    if (silentAudioRef.current) {
      silentAudioRef.current.src = "/silent.mp3"
      silentAudioRef.current.load()

      silentAudioRef.current
        .play()
        .then(() => {
          setStatus("Audio unlocked successfully!")
        })
        .catch((err) => {
          setStatus("Failed to unlock audio")
          setErrorDetails(
            JSON.stringify(
              {
                error: err.toString(),
                name: err.name,
                message: err.message,
              },
              null,
              2,
            ),
          )
        })
    } else {
      setStatus("Silent audio ref not available")
    }
  }

  const testSilentMp3 = () => {
    setStatus("Testing silent.mp3...")
    setErrorDetails(null)

    const audio = new Audio("/silent.mp3")
    audio.volume = 0.5

    audio.oncanplaythrough = () => {
      setStatus("silent.mp3 loaded successfully!")
    }

    audio.onerror = (e) => {
      console.error("Silent.mp3 error:", e)
      setStatus("silent.mp3 failed to load")
      setErrorDetails(
        JSON.stringify(
          {
            error: e,
            code: audio.error ? audio.error.code : "unknown",
            message: audio.error ? audio.error.message : "unknown error",
          },
          null,
          2,
        ),
      )
    }

    audio
      .play()
      .then(() => {
        setStatus("silent.mp3 playing successfully!")
      })
      .catch((err) => {
        setStatus("silent.mp3 play() failed")
        setErrorDetails(
          JSON.stringify(
            {
              error: err.toString(),
              name: err.name,
              message: err.message,
            },
            null,
            2,
          ),
        )
      })
  }

  const testTestAudio = () => {
    setStatus("Testing test-audio.mp3...")
    setErrorDetails(null)

    const audio = new Audio("/test-audio.mp3")
    audio.volume = 0.5

    audio.oncanplaythrough = () => {
      setStatus("test-audio.mp3 loaded successfully!")
    }

    audio.onerror = (e) => {
      console.error("Test audio error:", e)
      setStatus("test-audio.mp3 failed to load")
      setErrorDetails(
        JSON.stringify(
          {
            error: e,
            code: audio.error ? audio.error.code : "unknown",
            message: audio.error ? audio.error.message : "unknown error",
          },
          null,
          2,
        ),
      )
    }

    audio
      .play()
      .then(() => {
        setStatus("test-audio.mp3 playing successfully!")
      })
      .catch((err) => {
        setStatus("test-audio.mp3 play() failed")
        setErrorDetails(
          JSON.stringify(
            {
              error: err.toString(),
              name: err.name,
              message: err.message,
            },
            null,
            2,
          ),
        )
      })
  }

  const testAudioRef = () => {
    setStatus("Testing audio ref...")
    setErrorDetails(null)

    if (!audioRef.current) {
      setStatus("Audio ref not available")
      return
    }

    audioRef.current.src = "/test-audio.mp3"
    audioRef.current.volume = 0.5
    audioRef.current.load()

    audioRef.current
      .play()
      .then(() => {
        setStatus("Audio ref playing successfully!")
      })
      .catch((err) => {
        setStatus("Audio ref play() failed")
        setErrorDetails(
          JSON.stringify(
            {
              error: err.toString(),
              name: err.name,
              message: err.message,
            },
            null,
            2,
          ),
        )
      })
  }

  const testFetch = async () => {
    setStatus("Testing fetch for silent.mp3...")
    setErrorDetails(null)

    try {
      const response = await fetch("/silent.mp3")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const blob = await response.blob()
      setStatus(`Fetch successful! File size: ${blob.size} bytes`)
    } catch (err) {
      setStatus("Fetch failed")
      setErrorDetails(
        JSON.stringify(
          {
            error: err.toString(),
            name: err.name,
            message: err.message,
          },
          null,
          2,
        ),
      )
    }
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Audio Test Page</h1>
      <p>This page helps diagnose audio playback issues in the debate interface.</p>

      <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "5px" }}>
        <h2>Status: {status}</h2>
        {errorDetails && (
          <pre style={{ backgroundColor: "#ffe0e0", padding: "10px", borderRadius: "5px", overflow: "auto" }}>
            {errorDetails}
          </pre>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <button
          onClick={unlockAudio}
          style={{
            padding: "10px 15px",
            backgroundColor: "#FF5722",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Unlock Audio
        </button>

        <button
          onClick={testSilentMp3}
          style={{
            padding: "10px 15px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Test silent.mp3
        </button>

        <button
          onClick={testTestAudio}
          style={{
            padding: "10px 15px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Test test-audio.mp3
        </button>

        <button
          onClick={testAudioRef}
          style={{
            padding: "10px 15px",
            backgroundColor: "#9C27B0",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Test Audio Ref
        </button>

        <button
          onClick={testFetch}
          style={{
            padding: "10px 15px",
            backgroundColor: "#FF9800",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Test Fetch
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>Audio Element (visible for testing)</h3>
        <audio ref={audioRef} controls style={{ width: "100%", marginBottom: "20px" }} />

        <h3>Silent Audio Element (for unlocking)</h3>
        <audio ref={silentAudioRef} controls style={{ width: "100%", marginBottom: "20px" }} />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>Available Audio Files</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>File</th>
              <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Status</th>
              <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Type</th>
              <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Size</th>
            </tr>
          </thead>
          <tbody>
            {audioFiles.map((file, index) => (
              <tr key={index} style={{ backgroundColor: file.exists ? "#e8f5e9" : "#ffebee" }}>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{file.file}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {file.exists ? "✅ Available" : `❌ Not found (${file.status || "Error"})`}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{file.contentType || "N/A"}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{file.contentLength || "N/A"} bytes</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3>Browser Information</h3>
        <pre style={{ backgroundColor: "#e0e0e0", padding: "10px", borderRadius: "5px", overflow: "auto" }}>
          {`User Agent: ${typeof window !== "undefined" ? window.navigator.userAgent : "Not available in SSR"}`}
        </pre>
      </div>

      <div style={{ marginTop: "20px" }}>
        <a href="/debate" style={{ color: "#2196F3", textDecoration: "none" }}>
          ← Back to Debate Interface
        </a>
      </div>
    </div>
  )
}
