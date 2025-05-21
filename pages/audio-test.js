// pages/audio-test.js
import { useState, useRef, useEffect } from "react"

export default function AudioTestPage() {
  const [status, setStatus] = useState("Ready")
  const [audioUrl, setAudioUrl] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  const testDirectAudio = () => {
    setStatus("Testing direct audio...")
    const audio = new Audio("/silent.mp3")
    audio.oncanplaythrough = () => setStatus("Direct audio loaded")
    audio.onplay = () => setStatus("Direct audio playing")
    audio.onended = () => setStatus("Direct audio ended")
    audio.onerror = (e) => setStatus(`Direct audio error: ${e.message}`)
    audio.play().catch(err => setStatus(`Direct audio play error: ${err.message}`))
  }

  const testApiAudio = async () => {
    setStatus("Testing API audio...")
    try {
      const response = await fetch("/api/test-audio")
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.load()
        audioRef.current.play()
          .then(() => setStatus("API audio playing"))
          .catch(err => setStatus(`API audio play error: ${err.message}`))
      }
    } catch (err) {
      setStatus(`API audio error: ${err.message}`)
    }
  }

  const testStreamAudio = async () => {
    setStatus("Testing stream audio...")
    const testUrl = `/api/stream-audio?id=test&text=This is a test&voice=en-US-Neural2-D`
    
    try {
      // First, let's check what the endpoint returns
      const checkResponse = await fetch(testUrl, { method: 'HEAD' })
      setStatus(`Stream endpoint returned ${checkResponse.status} ${checkResponse.statusText}`)
      
      if (checkResponse.redirected) {
        setStatus(`Stream endpoint redirected to ${checkResponse.url}`)
      }
      
      // Now try to play it
      if (audioRef.current) {
        audioRef.current.src = testUrl
        audioRef.current.load()
        audioRef.current.play()
          .then(() => setStatus("Stream audio playing"))
          .catch(err => setStatus(`Stream audio play error: ${err.message}`))
      }
    } catch (err) {
      setStatus(`Stream audio error: ${err.message}`)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => setStatus(`Play error: ${err.message}`))
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Audio Testing Page</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="text-xl font-semibold mb-2">Status</h2>
        <pre className="bg-gray-800 text-white p-3 rounded">{status}</pre>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button 
          onClick={testDirectAudio}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          Test Direct Audio
        </button>
        
        <button 
          onClick={testApiAudio}
          className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
        >
          Test API Audio
        </button>
        
        <button 
          onClick={testStreamAudio}
          className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded"
        >
          Test Stream Audio
        </button>
      </div>
      
      {audioUrl && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Audio Player</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={togglePlay}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <span>{isPlaying ? "Playing" : "Paused"}</span>
          </div>
        </div>
      )}
      
      <audio ref={audioRef} controls className="w-full mt-4" />
      
      <div className="mt-8 bg-yellow-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Debug Information</h2>
        <p>This page tests different audio playback methods to help diagnose issues.</p>
        <ul className="list-disc pl-5 mt-2">
          <li><strong>Direct Audio</strong>: Tests playing a static audio file directly</li>
          <li><strong>API Audio</strong>: Tests playing audio from the test-audio API endpoint</li>
          <li><strong>Stream Audio</strong>: Tests playing audio from the stream-audio API endpoint</li>
        </ul>
      </div>
    </div>
  )
}