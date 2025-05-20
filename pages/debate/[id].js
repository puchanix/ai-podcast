import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/router"
import Head from "next/head"

export default function DebateDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [debate, setDebate] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  // Create audio reference - this is key to fixing the issue
  const debateAudio = useRef(null)

  useEffect(() => {
    if (id && typeof window !== "undefined") {
      // Try to load from localStorage
      const storedDebates = localStorage.getItem("debates")
      if (storedDebates) {
        const parsedDebates = JSON.parse(storedDebates)
        const storedDebate = parsedDebates.find((d) => d.id === id)

        if (storedDebate) {
          setDebate(storedDebate)
        } else {
          setStatusMessage("Debate not found")
          router.push("/debate")
        }
      } else {
        setStatusMessage("Debate not found")
        router.push("/debate")
      }
    }
  }, [id, router])

  const handleGenerateAudio = async () => {
    if (!debate) return

    setIsLoading(true)
    setStatusMessage("Generating audio...")

    try {
      // Call the API to generate audio
      const response = await fetch("/api/generate-debate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: debate.id,
          topic: debate.topic,
          description: debate.description,
          participant1: debate.participant1,
          participant2: debate.participant2,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate audio")
      }

      const result = await response.json()

      if (result.success) {
        // Update the debate with the new audio URL
        const updatedDebate = { ...debate, audioUrl: result.audioUrl }
        setDebate(updatedDebate)

        // Update in localStorage
        const storedDebates = localStorage.getItem("debates")
        if (storedDebates) {
          const parsedDebates = JSON.parse(storedDebates)
          const updatedDebates = parsedDebates.map((d) => (d.id === debate.id ? updatedDebate : d))
          localStorage.setItem("debates", JSON.stringify(updatedDebates))
        }

        setStatusMessage("Audio generated successfully!")
        setTimeout(() => setStatusMessage(""), 3000)
      } else {
        throw new Error(result.error || "Failed to generate audio")
      }
    } catch (error) {
      console.error("Error generating audio:", error)
      setStatusMessage("Failed to generate audio. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const togglePlayAudio = () => {
    if (!debate?.audioUrl || !debateAudio.current) return

    if (isPlaying) {
      // Pause the audio
      debateAudio.current.pause()
      setIsPlaying(false)
    } else {
      // Play the audio
      debateAudio.current.src = debate.audioUrl
      debateAudio.current.load()
      debateAudio.current
        .play()
        .then(() => {
          setIsPlaying(true)
          setStatusMessage("")
        })
        .catch((err) => {
          console.error("Playback error:", err)
          setStatusMessage("❌ Audio playback failed")
        })

      // Set up event handlers
      debateAudio.current.onended = () => {
        setIsPlaying(false)
        setStatusMessage("")
      }

      debateAudio.current.onerror = () => {
        console.error("Audio playback error")
        setStatusMessage("❌ Audio playback error")
        setIsPlaying(false)
      }
    }
  }

  if (!debate) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Head>
        <title>{debate.topic} - Debate</title>
      </Head>

      <button
        onClick={() => router.push("/debate")}
        className="mb-6 bg-button-primary hover:bg-button-hover text-white py-1 px-4 rounded-full"
      >
        ← Back to Debates
      </button>

      <div className="bg-box-accent p-6 rounded-xl shadow-lg border border-border">
        <h1 className="text-2xl font-bold mb-2">{debate.topic}</h1>
        <p className="text-sm mb-6">
          {debate.participant1} vs {debate.participant2}
        </p>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p>{debate.description}</p>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Debate Audio</h2>

          {statusMessage && <div className="mb-4 text-amber-500">{statusMessage}</div>}

          {debate.audioUrl ? (
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlayAudio}
                className="bg-button-primary hover:bg-button-hover text-white py-2 px-4 rounded-full"
              >
                {isPlaying ? "⏸️ Pause" : "▶️ Play"}
              </button>

              <button
                onClick={handleGenerateAudio}
                disabled={isLoading}
                className="bg-button-primary hover:bg-button-hover disabled:bg-neutral-dark text-white py-2 px-4 rounded-full"
              >
                {isLoading ? "Generating..." : "Regenerate Audio"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateAudio}
              disabled={isLoading}
              className="bg-button-primary hover:bg-button-hover disabled:bg-neutral-dark text-white py-2 px-4 rounded-full"
            >
              {isLoading ? "Generating..." : "Generate Audio"}
            </button>
          )}
        </div>
      </div>

      {/* This is the key element - add the audio element to the DOM */}
      <audio ref={debateAudio} hidden preload="auto" />
    </div>
  )
}