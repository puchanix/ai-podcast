"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"

const EmbeddedTopicSelector = dynamic(() => import("./embedded-topic-selector"), { ssr: false })

const isBrowser = typeof window !== "undefined"

export function DebateInterface({ character1, character2, initialTopic, onDebateEnd, embedded = false }) {
  // Core state
  const [personas, setPersonas] = useState({})
  const [debateState, setDebateState] = useState(null)
  const [dependenciesLoaded, setDependenciesLoaded] = useState(false)
  const [loadingError, setLoadingError] = useState(null)

  // Character state - use character keys, not objects
  const [char1, setChar1] = useState("")
  const [char2, setChar2] = useState("")

  // Debate state
  const [isDebating, setIsDebating] = useState(false)
  const [currentTopic, setCurrentTopic] = useState("")
  const [debateMessages, setDebateMessages] = useState([])
  const [exchangeCount, setExchangeCount] = useState(0)

  // Audio/Visual state
  const [currentSpeaker, setCurrentSpeaker] = useState(null)
  const [speakerStatus, setSpeakerStatus] = useState(null) // 'thinking', 'speaking', 'waiting'
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const [debugInfo, setDebugInfo] = useState("")
  const [voiceIds, setVoiceIds] = useState({})

  // Refs
  const currentAudioRef = useRef(null)
  const isDebatingRef = useRef(false)
  const debateMessagesRef = useRef([])
  const exchangeCountRef = useRef(0)

  // Load dependencies
  useEffect(() => {
    async function loadDependencies() {
      if (!isBrowser) return

      try {
        console.log("🔍 Loading dependencies...")

        const personasModule = await import("../lib/personas")
        const personasData = personasModule.personas

        const debateStateModule = await import("../lib/debate-state")

        setPersonas(personasData)
        setDebateState(debateStateModule)

        // Convert character objects to keys if needed
        let defaultChar1, defaultChar2
        if (typeof character1 === "string") {
          defaultChar1 = character1
        } else if (character1 && Object.keys(personasData).includes(character1)) {
          defaultChar1 = character1
        } else {
          defaultChar1 = Object.keys(personasData)[0] || "daVinci"
        }

        if (typeof character2 === "string") {
          defaultChar2 = character2
        } else if (character2 && Object.keys(personasData).includes(character2)) {
          defaultChar2 = character2
        } else {
          defaultChar2 = Object.keys(personasData)[1] || "socrates"
        }

        setChar1(defaultChar1)
        setChar2(defaultChar2)
        setCurrentTopic(initialTopic || "")

        setDependenciesLoaded(true)
        console.log("🔍 Dependencies loaded successfully!")
      } catch (error) {
        console.error("🔍 Error loading dependencies:", error)
        setLoadingError(error.message)
      }
    }

    loadDependencies()
  }, [character1, character2, initialTopic])

  // Load voice IDs
  useEffect(() => {
    async function loadVoiceIds() {
      try {
        const response = await fetch("/api/get-voice-ids")
        if (response.ok) {
          const data = await response.json()
          setVoiceIds(data)
          console.log("🔍 Voice IDs loaded:", data)
        } else {
          console.error("🔍 Failed to load voice IDs")
        }
      } catch (error) {
        console.error("🔍 Error loading voice IDs:", error)
      }
    }

    loadVoiceIds()
  }, [])

  // Auto-start debate when initialTopic is provided
  useEffect(() => {
    if (dependenciesLoaded && initialTopic && char1 && char2 && !isDebating && !isProcessing) {
      console.log("🔍 [DEBATE DEBUG] Auto-starting debate with initial topic:", initialTopic)
      console.log("🔍 [DEBATE DEBUG] Characters:", char1, "vs", char2)
      startDebate(initialTopic)
    }
  }, [dependenciesLoaded, initialTopic, char1, char2, isDebating, isProcessing])

  // Helper functions
  const updateDebateState = (updates) => {
    if (updates.isDebating !== undefined) {
      setIsDebating(updates.isDebating)
      isDebatingRef.current = updates.isDebating
    }
    if (updates.messages !== undefined) {
      setDebateMessages(updates.messages)
      debateMessagesRef.current = updates.messages
    }
    if (updates.exchangeCount !== undefined) {
      setExchangeCount(updates.exchangeCount)
      exchangeCountRef.current = updates.exchangeCount
    }
  }

  // Reset debate
  const resetDebate = () => {
    console.log("🔍 Resetting debate")
    updateDebateState({ isDebating: false, messages: [], exchangeCount: 0 })
    setCurrentTopic("")
    setCurrentSpeaker(null)
    setSpeakerStatus(null)
    setIsPlaying(false)
    setIsProcessing(false)
    setAudioError(null)
    setDebugInfo("")

    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    if (!embedded && debateState) {
      debateState.clearDebateState()
    }

    if (embedded && onDebateEnd) {
      onDebateEnd()
    }
  }

  // Get voice for character - use the voice IDs from the API
  const getVoiceForCharacter = (characterId) => {
    if (!personas[characterId]) return "echo"

    // Use the voiceIds state that was loaded from the API
    const voiceKey = characterId === "daVinci" ? "davinci" : characterId.toLowerCase()

    if (voiceIds[voiceKey]) {
      console.log(`🔍 [DEBATE VOICE DEBUG] Using voice ID for ${characterId}: ${voiceIds[voiceKey]}`)
      return voiceIds[voiceKey] // Return the actual voice ID, not the key
    }

    // Fallback to default voice
    console.log(`🔍 [DEBATE VOICE DEBUG] No voice ID found for ${characterId}, using fallback: echo`)
    return "echo"
  }

  // Play audio for message
  const playAudio = async (message, allMessages, currentIndex) => {
    const { character, content } = message
    console.log(`🔍 Playing audio for ${character}`)

    setCurrentSpeaker(character)
    setSpeakerStatus("thinking")

    try {
      const voice = getVoiceForCharacter(character)

      // Generate audio
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, voice }),
      })

      if (!response.ok) {
        throw new Error(`Audio API returned ${response.status}`)
      }

      const data = await response.json()

      // Play audio
      const audio = new Audio(data.audioUrl)
      currentAudioRef.current = audio

      audio.oncanplaythrough = () => {
        setSpeakerStatus("speaking")
        setIsPlaying(true)
      }

      audio.onended = () => {
        console.log(`🔍 ${character} finished speaking`)
        setIsPlaying(false)
        setSpeakerStatus("waiting")

        // Auto-continue to next message
        const nextIndex = currentIndex + 1
        if (nextIndex < allMessages.length) {
          setTimeout(() => {
            playAudio(allMessages[nextIndex], allMessages, nextIndex)
          }, 500) // Minimal delay
        } else {
          // Check if we need more exchanges
          const currentExchange = Math.floor((currentIndex + 1) / 2)
          if (currentExchange < 4) {
            // Opening + 3 rounds = 4 total exchanges
            setTimeout(() => {
              continueDebate()
            }, 1000)
          } else {
            // Debate finished
            setTimeout(() => {
              resetDebate()
            }, 2000)
          }
        }
      }

      audio.onerror = (e) => {
        throw new Error(`Audio playback failed: ${e.message}`)
      }

      await audio.play()
    } catch (error) {
      console.error(`🔍 Error playing audio for ${character}:`, error)
      setAudioError(`Audio failed for ${character}: ${error.message}`)
      setDebugInfo(`Character: ${character}, Voice: ${getVoiceForCharacter(character)}, Error: ${error.message}`)
      setIsProcessing(false)
      setSpeakerStatus(null)
    }
  }

  // Continue debate with next exchange
  const continueDebate = async () => {
    if (isProcessing) return

    console.log("🔍 Continuing debate...")
    setIsProcessing(true)
    setSpeakerStatus("thinking")

    try {
      const response = await fetch("/api/auto-continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character1: char1,
          character2: char2,
          currentMessages: debateMessagesRef.current,
          topic: currentTopic,
          format: "pointCounterpoint",
          historicalContext: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      const newMessages = [
        {
          character: char1,
          content: data.response1,
          timestamp: Date.now(),
        },
        {
          character: char2,
          content: data.response2,
          timestamp: Date.now() + 100,
        },
      ]

      const allMessages = [...debateMessagesRef.current, ...newMessages]
      updateDebateState({ messages: allMessages })

      setIsProcessing(false)

      // Start playing the first new message
      playAudio(newMessages[0], allMessages, debateMessagesRef.current.length)
    } catch (error) {
      console.error("🔍 Error continuing debate:", error)
      setAudioError(`Failed to continue debate: ${error.message}`)
      setDebugInfo(`Topic: ${currentTopic}, Characters: ${char1} vs ${char2}, Error: ${error.message}`)
      setIsProcessing(false)
      setSpeakerStatus(null)
    }
  }

  // Start debate
  const startDebate = async (topic) => {
    console.log("🔍 Starting debate with topic:", topic)

    if (isProcessing || isDebating) return

    setCurrentTopic(topic)
    updateDebateState({ isDebating: true, messages: [], exchangeCount: 0 })
    setIsProcessing(true)
    setAudioError(null)
    setDebugInfo("")
    setCurrentSpeaker(char1)
    setSpeakerStatus("thinking")

    try {
      const response = await fetch("/api/start-debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character1: char1,
          character2: char2,
          topic,
          format: "pointCounterpoint",
          historicalContext: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to start debate: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      const messages = [
        {
          character: char1,
          content: data.opening1,
          timestamp: Date.now(),
        },
        {
          character: char2,
          content: data.opening2,
          timestamp: Date.now() + 100,
        },
      ]

      updateDebateState({ messages })
      setIsProcessing(false)

      // Start playing first message
      playAudio(messages[0], messages, 0)
    } catch (error) {
      console.error("🔍 Error starting debate:", error)
      setAudioError(`Failed to start debate: ${error.message}`)
      setDebugInfo(`Topic: ${topic}, Characters: ${char1} vs ${char2}, Error: ${error.message}`)
      updateDebateState({ isDebating: false })
      setIsProcessing(false)
      setSpeakerStatus(null)
    }
  }

  // Character change handlers
  const handleCharacter1Change = (newChar) => {
    if (newChar !== char1 && !isDebating) {
      setChar1(newChar)
    }
  }

  const handleCharacter2Change = (newChar) => {
    if (newChar !== char2 && !isDebating) {
      setChar2(newChar)
    }
  }

  // Show loading state
  if (!dependenciesLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-yellow-400">Loading debate interface...</p>
          {loadingError && <p className="text-red-400 mt-2">Error: {loadingError}</p>}
        </div>
      </div>
    )
  }

  // Show error state
  if (loadingError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load debate interface</p>
          <p className="text-gray-400 mb-4">{loadingError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  const character1Obj = personas[char1]
  const character2Obj = personas[char2]

  return (
    <div
      className={`${embedded ? "" : "container mx-auto py-8 px-4 max-w-6xl"} min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white`}
    >
      {/* Header */}
      {!embedded && (
        <div className="mb-8 bg-gray-800 p-6 rounded-lg">
          <h1 className="text-3xl font-bold text-yellow-400 text-center mb-4">Historical Debates</h1>
          {currentTopic && isDebating && <h2 className="text-xl text-center text-gray-300">Topic: {currentTopic}</h2>}
        </div>
      )}

      {/* Error Display */}
      {audioError && (
        <div className="mb-4 p-4 bg-red-900 text-red-100 rounded-lg">
          <p className="font-bold">Debate Error:</p>
          <p>{audioError}</p>
          {debugInfo && (
            <details className="mt-2">
              <summary className="cursor-pointer text-red-300">Debug Info</summary>
              <pre className="text-xs mt-2 bg-red-800 p-2 rounded">{debugInfo}</pre>
            </details>
          )}
          <button
            onClick={resetDebate}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
          >
            Reset Debate
          </button>
        </div>
      )}

      {/* Character Grid - Only show when debating */}
      {isDebating && (
        <div className="mb-8 bg-gray-800 rounded-lg p-6">
          <div className="grid grid-cols-5 gap-4">
            {Object.keys(personas).map((characterId) => {
              const character = personas[characterId]
              const isDebater = characterId === char1 || characterId === char2
              const isCurrentSpeaker = characterId === currentSpeaker
              const isChar1 = characterId === char1
              const isChar2 = characterId === char2

              return (
                <div
                  key={characterId}
                  className={`text-center transition-all duration-300 ${
                    isDebater ? "opacity-100" : "opacity-30 grayscale"
                  }`}
                >
                  {/* Character Avatar */}
                  <div className="relative mb-2">
                    <div
                      className={`w-20 h-20 mx-auto rounded-full overflow-hidden border-4 transition-all duration-300 ${
                        isCurrentSpeaker && isPlaying
                          ? "border-yellow-400 shadow-lg shadow-yellow-400/50"
                          : isCurrentSpeaker && speakerStatus === "thinking"
                            ? "border-blue-400"
                            : isChar1
                              ? "border-blue-600"
                              : isChar2
                                ? "border-red-600"
                                : "border-gray-600"
                      }`}
                    >
                      <img
                        src={character?.image || "/placeholder.svg"}
                        alt={character?.name}
                        className="w-full h-full object-cover"
                      />

                      {/* Loading overlay for thinking */}
                      {isCurrentSpeaker && speakerStatus === "thinking" && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>

                    {/* Speaking animation */}
                    {isCurrentSpeaker && isPlaying && (
                      <div className="absolute inset-0 rounded-full border-4 border-yellow-400 animate-ping opacity-75"></div>
                    )}
                  </div>

                  {/* Character Name */}
                  <p
                    className={`text-sm font-medium mb-1 ${
                      isCurrentSpeaker ? "text-yellow-300" : isDebater ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {character?.name}
                  </p>

                  {/* Status Text */}
                  {isDebater && (
                    <p className="text-xs text-gray-400">
                      {isCurrentSpeaker
                        ? speakerStatus === "thinking"
                          ? "Thinking..."
                          : speakerStatus === "speaking"
                            ? "Speaking..."
                            : "Waiting..."
                        : isDebating
                          ? "Waiting turn"
                          : "Ready"}
                    </p>
                  )}

                  {/* Character Selection (only when not debating) */}
                  {!isDebating && !embedded && (
                    <div className="mt-2">
                      <button
                        onClick={() => handleCharacter1Change(characterId)}
                        className={`text-xs px-2 py-1 rounded mr-1 ${
                          isChar1 ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                        }`}
                      >
                        1
                      </button>
                      <button
                        onClick={() => handleCharacter2Change(characterId)}
                        className={`text-xs px-2 py-1 rounded ${
                          isChar2 ? "bg-red-600 text-white" : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                        }`}
                      >
                        2
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Debate Controls */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center space-x-4">
              <span className="text-yellow-400 font-medium">
                {character1Obj?.name} vs {character2Obj?.name}
              </span>
              <button
                onClick={resetDebate}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
              >
                End Debate
              </button>
            </div>
            {isProcessing && <p className="text-yellow-300 text-sm mt-2">Preparing next exchange...</p>}
          </div>
        </div>
      )}

      {/* Topic Selector */}
      {!isDebating && !embedded && (
        <EmbeddedTopicSelector onSelectTopic={startDebate} character1={char1} character2={char2} />
      )}

      {/* Back to Home */}
      {!embedded && (
        <div className="mt-8 text-center">
          <a href="/" className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full">
            Return to Home
          </a>
        </div>
      )}
    </div>
  )
}

export default DebateInterface
