"use client"

import { useState, useEffect, useRef } from "react"
import { personas } from "../lib/personas"

// Add this to prevent prerendering errors
export const config = {
  unstable_runtimeJS: true,
}

export function DebateInterface() {
  const [character1, setCharacter1] = useState(Object.keys(personas)[0])
  const [character2, setCharacter2] = useState(Object.keys(personas)[1])
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [isDebating, setIsDebating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [debateMessages, setDebateMessages] = useState([])
  const [suggestedTopics, setSuggestedTopics] = useState([])
  const [customQuestion, setCustomQuestion] = useState("")
  const [currentTopic, setCurrentTopic] = useState(null)
  const [debateFormat, setDebateFormat] = useState("pointCounterpoint")
  const [historicalContext, setHistoricalContext] = useState(true)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState(null)

  const audioRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Get character objects
  const char1 = personas[character1]
  const char2 = personas[character2]

  // Generate debate topics when characters change
  useEffect(() => {
    generateDebateTopics()
  }, [character1, character2])

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [debateMessages])

  // Handle audio playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onplay = () => setIsPlaying(true)
      audioRef.current.onpause = () => setIsPlaying(false)
      audioRef.current.onended = () => {
        setIsPlaying(false)
        setCurrentSpeaker(null)
      }
    }
  }, [audioUrl])

  // Function to generate debate topics based on selected characters
  const generateDebateTopics = async () => {
    if (character1 === character2) return

    setIsGeneratingTopics(true)

    try {
      const response = await fetch("/api/generate-debate-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate topics")

      const data = await response.json()
      setSuggestedTopics(data.topics)
    } catch (error) {
      console.error("Error generating debate topics:", error)
      // Fallback topics if API fails
      setSuggestedTopics([
        {
          id: "science-method",
          title: "Scientific Method",
          description: "Approaches to scientific discovery and experimentation",
          category: "science",
        },
        {
          id: "human-nature",
          title: "Human Nature",
          description: "The fundamental characteristics of humanity",
          category: "philosophy",
        },
        {
          id: "technology-progress",
          title: "Technological Progress",
          description: "The benefits and risks of advancing technology",
          category: "technology",
        },
      ])
    } finally {
      setIsGeneratingTopics(false)
    }
  }

  // Start a debate on a specific topic
  const startDebate = async (topic) => {
    setCurrentTopic(topic)
    setIsDebating(true)
    setIsProcessing(true)
    setDebateMessages([])

    try {
      const response = await fetch("/api/start-debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
          topic,
          format: debateFormat,
          historicalContext,
        }),
      })

      if (!response.ok) throw new Error("Failed to start debate")

      const data = await response.json()

      // Add initial messages
      const messages = [
        {
          character: character1,
          content: data.opening1,
          timestamp: Date.now(),
          audioUrl: data.audioUrl1,
        },
        {
          character: character2,
          content: data.opening2,
          timestamp: Date.now() + 100,
          audioUrl: data.audioUrl2,
        },
      ]

      setDebateMessages(messages)

      // Play first audio
      if (data.audioUrl1) {
        setAudioUrl(data.audioUrl1)
        setCurrentSpeaker(character1)
        if (audioRef.current) {
          audioRef.current.play().catch((err) => console.error("Audio playback error:", err))
        }
      }
    } catch (error) {
      console.error("Error starting debate:", error)
      setIsDebating(false)
    } finally {
      setIsProcessing(false)
    }
  }

  // Submit a custom question to the debate
  const submitCustomQuestion = async () => {
    if (!customQuestion.trim() || !isDebating || isProcessing) return

    const userQuestion = customQuestion.trim()
    setCustomQuestion("")
    setIsProcessing(true)

    // Add user question as a special message
    setDebateMessages((prev) => [
      ...prev,
      {
        character: "user",
        content: userQuestion,
        timestamp: Date.now(),
      },
    ])

    try {
      const response = await fetch("/api/continue-debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
          userQuestion,
          currentMessages: debateMessages,
          format: debateFormat,
          historicalContext,
        }),
      })

      if (!response.ok) throw new Error("Failed to continue debate")

      const data = await response.json()

      // Add responses
      const newMessages = [
        {
          character: character1,
          content: data.response1,
          timestamp: Date.now() + 100,
          audioUrl: data.audioUrl1,
        },
        {
          character: character2,
          content: data.response2,
          timestamp: Date.now() + 200,
          audioUrl: data.audioUrl2,
        },
      ]

      setDebateMessages((prev) => [...prev, ...newMessages])

      // Play first audio
      if (data.audioUrl1) {
        setAudioUrl(data.audioUrl1)
        setCurrentSpeaker(character1)
        if (audioRef.current) {
          audioRef.current.play().catch((err) => console.error("Audio playback error:", err))
        }
      }
    } catch (error) {
      console.error("Error continuing debate:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Play audio for a specific message
  const playMessageAudio = (audioUrl, character) => {
    if (!audioUrl) return

    setAudioUrl(audioUrl)
    setCurrentSpeaker(character)

    if (audioRef.current) {
      audioRef.current.play().catch((err) => console.error("Audio playback error:", err))
    }
  }

  // Continue the debate with AI-generated follow-up
  const continueDebate = async () => {
    if (!isDebating || isProcessing) return

    setIsProcessing(true)

    try {
      const response = await fetch("/api/auto-continue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
          currentMessages: debateMessages,
          topic: currentTopic,
          format: debateFormat,
          historicalContext,
        }),
      })

      if (!response.ok) throw new Error("Failed to continue debate")

      const data = await response.json()

      // Add responses
      const newMessages = [
        {
          character: character1,
          content: data.response1,
          timestamp: Date.now() + 100,
          audioUrl: data.audioUrl1,
        },
        {
          character: character2,
          content: data.response2,
          timestamp: Date.now() + 200,
          audioUrl: data.audioUrl2,
        },
      ]

      setDebateMessages((prev) => [...prev, ...newMessages])

      // Play first audio
      if (data.audioUrl1) {
        setAudioUrl(data.audioUrl1)
        setCurrentSpeaker(character1)
        if (audioRef.current) {
          audioRef.current.play().catch((err) => console.error("Audio playback error:", err))
        }
      }
    } catch (error) {
      console.error("Error continuing debate:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-yellow-400">Historical Debates</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Character 1 Selection */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-blue-500">
            <img
              src={char1?.image || "/placeholder.png"}
              alt={char1?.name || "Character 1"}
              className="w-full h-full object-cover"
            />
          </div>
          <select
            value={character1}
            onChange={(e) => setCharacter1(e.target.value)}
            className="w-[200px] p-2 rounded border bg-gray-800 text-white border-gray-600"
          >
            {Object.keys(personas).map((id) => (
              <option key={id} value={id}>
                {personas[id].name}
              </option>
            ))}
          </select>
          {currentSpeaker === character1 && isPlaying && (
            <div className="mt-2 text-blue-400 flex items-center">
              <span className="animate-pulse mr-2">●</span> Speaking...
            </div>
          )}
        </div>

        {/* Character 2 Selection */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-red-500">
            <img
              src={char2?.image || "/placeholder.png"}
              alt={char2?.name || "Character 2"}
              className="w-full h-full object-cover"
            />
          </div>
          <select
            value={character2}
            onChange={(e) => setCharacter2(e.target.value)}
            className="w-[200px] p-2 rounded border bg-gray-800 text-white border-gray-600"
          >
            {Object.keys(personas).map((id) => (
              <option key={id} value={id}>
                {personas[id].name}
              </option>
            ))}
          </select>
          {currentSpeaker === character2 && isPlaying && (
            <div className="mt-2 text-red-400 flex items-center">
              <span className="animate-pulse mr-2">●</span> Speaking...
            </div>
          )}
        </div>
      </div>

      {/* Debate Format Options */}
      <div className="mb-8 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">Debate Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium mb-2 text-gray-300">Format</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDebateFormat("pointCounterpoint")}
                className={`p-2 rounded ${
                  debateFormat === "pointCounterpoint"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Point/Counterpoint
              </button>
              <button
                onClick={() => setDebateFormat("moderated")}
                className={`p-2 rounded ${
                  debateFormat === "moderated"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Moderated
              </button>
              <button
                onClick={() => setDebateFormat("freeform")}
                className={`p-2 rounded ${
                  debateFormat === "freeform" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Free Discussion
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 text-gray-300">Historical Context</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setHistoricalContext(true)}
                className={`p-2 rounded ${
                  historicalContext ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Historical Knowledge Only
              </button>
              <button
                onClick={() => setHistoricalContext(false)}
                className={`p-2 rounded ${
                  !historicalContext ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Include Modern Knowledge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Topics */}
      <div className="mb-8 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">Suggested Debate Topics</h2>
        {isGeneratingTopics ? (
          <div className="flex justify-center items-center p-8 text-white">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2">Generating topics...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestedTopics.map((topic) => (
              <div
                key={topic.id}
                className="border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors bg-gray-800"
                onClick={() => startDebate(topic.title)}
              >
                <div className="flex items-start">
                  <div className={`p-2 rounded-full mr-3 ${getCategoryColor(topic.category)}`}>
                    {getCategoryIcon(topic.category)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{topic.title}</h3>
                    <p className="text-sm text-gray-300">{topic.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debate Content */}
      <div className="mb-8 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">
          {currentTopic ? `Debate: ${currentTopic}` : "Select a topic to begin"}
        </h2>

        <div className="bg-gray-900 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
          {debateMessages.length === 0 && !isDebating ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p>Select a topic above to start the debate</p>
            </div>
          ) : (
            <div className="space-y-4">
              {debateMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.character === "user" ? "justify-center" : ""}`}>
                  {msg.character !== "user" && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img
                          src={(msg.character === character1 ? char1 : char2)?.image || "/placeholder.png"}
                          alt={(msg.character === character1 ? char1 : char2)?.name || "Character"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <div className={`flex-1 ${getMessageStyle(msg.character, character1, character2)}`}>
                    {msg.character === "user" ? (
                      <div className="text-center py-2 px-4 bg-gray-700 rounded-lg inline-block text-white">
                        <span className="font-medium">You asked:</span> {msg.content}
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-white">
                            {msg.character === character1 ? char1?.name : char2?.name}
                          </p>
                          {msg.audioUrl && (
                            <button
                              onClick={() => playMessageAudio(msg.audioUrl, msg.character)}
                              className="text-gray-300 hover:text-white"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                        <p className="text-gray-100">{msg.content}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Custom Question Input */}
      <div className="mb-8 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">Ask Your Own Question</h2>
        <div className="flex gap-2">
          <input
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Enter a debate question or topic..."
            disabled={!isDebating || isProcessing}
            className="flex-1 p-2 rounded border bg-gray-700 text-white border-gray-600 placeholder-gray-400"
          />
          <button
            onClick={submitCustomQuestion}
            disabled={!isDebating || isProcessing || !customQuestion.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-600 disabled:text-gray-400"
          >
            {isProcessing ? "Processing..." : "Submit"}
          </button>
        </div>
      </div>

      {/* Continue Debate Button */}
      {isDebating && debateMessages.length > 0 && (
        <div className="flex justify-center mb-8">
          <button
            onClick={continueDebate}
            disabled={isProcessing}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-full disabled:bg-gray-600 disabled:text-gray-400 font-bold"
          >
            {isProcessing ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Continue Debate"
            )}
          </button>
        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} className="hidden" />
    </div>
  )
}

// Helper function to get message style based on character
function getMessageStyle(messageCharacter, character1, character2) {
  if (messageCharacter === "user") return "text-center"
  if (messageCharacter === character1) return "bg-blue-900 p-4 rounded-lg"
  if (messageCharacter === character2) return "bg-red-900 p-4 rounded-lg"
  return "p-4 rounded-lg bg-gray-800"
}

// Helper function to get category color
function getCategoryColor(category) {
  switch (category) {
    case "science":
      return "bg-blue-900 text-blue-300"
    case "philosophy":
      return "bg-purple-900 text-purple-300"
    case "politics":
      return "bg-red-900 text-red-300"
    case "arts":
      return "bg-yellow-900 text-yellow-300"
    case "technology":
      return "bg-green-900 text-green-300"
    case "history":
      return "bg-orange-900 text-orange-300"
    default:
      return "bg-gray-700 text-gray-300"
  }
}

// Helper function to get category icon
function getCategoryIcon(category) {
  switch (category) {
    case "science":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 2v8L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45L14 10V2"></path>
          <path d="M8.5 2h7"></path>
          <path d="M7 16h10"></path>
        </svg>
      )
    case "philosophy":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
      )
    case "politics":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 20h.01"></path>
          <path d="M7 20v-4"></path>
          <path d="M12 20v-8"></path>
          <path d="M17 20V8"></path>
          <path d="M22 4v16"></path>
        </svg>
      )
    case "arts":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="13.5" cy="6.5" r="2.5"></circle>
          <path d="M17 4c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
          <path d="M19 8c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
          <path d="M15 10c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
          <path d="M11 12c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
          <path d="m3 16 2 2 4-4"></path>
          <path d="M3 12h.01"></path>
          <path d="M7 12h.01"></path>
          <path d="M11 16h.01"></path>
          <path d="M15 16h.01"></path>
          <path d="M19 16h.01"></path>
        </svg>
      )
    case "technology":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="4" width="16" height="16" rx="2"></rect>
          <rect x="9" y="9" width="6" height="6"></rect>
          <path d="M15 2v2"></path>
          <path d="M15 20v2"></path>
          <path d="M2 15h2"></path>
          <path d="M20 15h2"></path>
        </svg>
      )
    case "history":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      )
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      )
  }
}
