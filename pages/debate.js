import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/router"
import Head from "next/head"

export default function DebatePage() {
  const router = useRouter()
  const [debates, setDebates] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPlayingId, setCurrentPlayingId] = useState(null)
  const [statusMessage, setStatusMessage] = useState("")

  // Create audio reference - this is key to fixing the issue
  const debateAudio = useRef(null)

  useEffect(() => {
    // Load debates from localStorage on component mount
    if (typeof window !== "undefined") {
      const storedDebates = localStorage.getItem("debates")
      if (storedDebates) {
        setDebates(JSON.parse(storedDebates))
      }
    }
  }, [])

  const handlePlayAudio = (debate) => {
    // First, make sure we have an audio element
    if (!debateAudio.current) return

    // If we're already playing this debate, pause it
    if (currentPlayingId === debate.id) {
      debateAudio.current.pause()
      setCurrentPlayingId(null)
      return
    }

    // Otherwise, play the new debate audio
    // Stop any currently playing audio
    debateAudio.current.pause()

    // Set the new audio source
    debateAudio.current.src = debate.audioUrl

    // Load and play the audio
    debateAudio.current.load()
    debateAudio.current
      .play()
      .then(() => {
        setCurrentPlayingId(debate.id)
        setStatusMessage("")
      })
      .catch((err) => {
        console.error("Playback error:", err)
        setStatusMessage("❌ Audio playback failed")
        setCurrentPlayingId(null)
      })

    // Set up event handlers
    debateAudio.current.onended = () => {
      setCurrentPlayingId(null)
      setStatusMessage("")
    }

    debateAudio.current.onerror = () => {
      console.error("Audio playback error")
      setStatusMessage("❌ Audio playback error")
      setCurrentPlayingId(null)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Head>
        <title>Historical Debates</title>
      </Head>

      <h1 className="text-3xl font-bold mb-6">Historical Debates</h1>

      {statusMessage && <div className="mb-4 text-center text-amber-500">{statusMessage}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debates.length > 0 ? (
          debates.map((debate) => (
            <div key={debate.id} className="bg-box-accent p-5 rounded-xl shadow-lg border border-border">
              <h2 className="text-xl font-bold mb-2">{debate.topic}</h2>
              <p className="text-sm mb-4">
                {debate.participant1} vs {debate.participant2}
              </p>
              <p className="text-sm mb-4 line-clamp-3">{debate.description}</p>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => router.push(`/debate/${debate.id}`)}
                  className="bg-button-primary hover:bg-button-hover text-white py-1 px-3 rounded-full text-sm"
                >
                  View Details
                </button>

                {debate.audioUrl ? (
                  <button
                    onClick={() => handlePlayAudio(debate)}
                    className="bg-button-primary hover:bg-button-hover text-white py-1 px-3 rounded-full text-sm flex items-center gap-1"
                  >
                    {currentPlayingId === debate.id ? "⏸️ Pause" : "▶️ Play"}
                  </button>
                ) : (
                  <span className="text-sm text-gray-400">No audio</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10">
            <p>No debates found. Create your first debate!</p>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => router.push("/debate/create")}
          className="bg-button-primary hover:bg-button-hover text-white py-2 px-5 rounded-full shadow-lg"
        >
          Create New Debate
        </button>
      </div>

      {/* This is the key element - add the audio element to the DOM */}
      <audio ref={debateAudio} hidden preload="auto" />
    </div>
  )
}