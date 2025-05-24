"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"

const EmbeddedTopicSelector = dynamic(() => import("./embedded-topic-selector"), { ssr: false })
const VoiceInput = dynamic(() => import("./voice-input").then((mod) => ({ default: mod.VoiceInput })), { ssr: false })
const DebateHeader = dynamic(() => import("./debate-header").then((mod) => ({ default: mod.DebateHeader })), {
  ssr: false,
})

const isBrowser = typeof window !== "undefined"

const staticDebateTopics = [
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
]

export function DebateInterface({ character1, character2, initialTopic, onDebateEnd, embedded = false }) {
  // Core state
  const [personas, setPersonas] = useState({})
  const [debateState, setDebateState] = useState(null)
  const [dependenciesLoaded, setDependenciesLoaded] = useState(false)
  const [loadingError, setLoadingError] = useState(null)
  const [initialStateLoaded, setInitialStateLoaded] = useState(false)
  const [char1, setChar1] = useState("")
  const [char2, setChar2] = useState("")
  const [isDebating, setIsDebating] = useState(false)
  const [debateMessages, setDebateMessages] = useState([])
  const [currentTopic, setCurrentTopic] = useState("")
  const [exchangeCount, setExchangeCount] = useState(0)

  // UI state
  const [debateFormat, setDebateFormat] = useState("pointCounterpoint")
  const [historicalContext, setHistoricalContext] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState(null)
  const [nextSpeaker, setNextSpeaker] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAudioLoaded, setIsAudioLoaded] = useState(false)
  const [volume, setVolume] = useState(1.0)
  const [audioError, setAudioError] = useState(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [isUnlockingAudio, setIsUnlockingAudio] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState(null)
  const [requestData, setRequestData] = useState(null)
  const [nextAudioData, setNextAudioData] = useState(null)
  const [isPreloadingAudio, setIsPreloadingAudio] = useState(false)
  const [maxExchanges, setMaxExchanges] = useState(5)
  const [isAutoplaying, setIsAutoplaying] = useState(true)
  const [debugMode, setDebugMode] = useState(false)
  const [hasIntroduction, setHasIntroduction] = useState(false)
  const [isIntroPlaying, setIsIntroPlaying] = useState(false)
  const [characterSpecificTopics, setCharacterSpecificTopics] = useState([])
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [voiceIds, setVoiceIds] = useState({})
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [displayedSpeaker, setDisplayedSpeaker] = useState(null)

  // New state for dynamic status messages
  const [char1Status, setChar1Status] = useState("Ready")
  const [char2Status, setChar2Status] = useState("Ready")
  const [thinkingMessage, setThinkingMessage] = useState("")

  // Refs
  const audioRef = useRef(null)
  const silentAudioRef = useRef(null)
  const char1AudioRef = useRef(null)
  const char2AudioRef = useRef(null)
  const nextAudioRef = useRef(null)
  const introAudioRef = useRef(null)
  const topicRef = useRef("")
  const isDebatingRef = useRef(false)
  const debateMessagesRef = useRef([])
  const exchangeCountRef = useRef(0)
  const prepareNextTimeoutRef = useRef(null)
  const prepareTimeoutRef = useRef(null)
  const currentAudioRef = useRef(null)
  const renderCountRef = useRef(0)

  const [currentAudioUrls, setCurrentAudioUrls] = useState({ char1: "", char2: "" })

  // Thinking messages for dynamic display
  const thinkingMessages = [
    "Thinking...",
    "Pondering the argument...",
    "Reflecting on this matter...",
    "Considering the response...",
    "Gathering thoughts...",
    "Contemplating...",
    "Preparing a response...",
    "Formulating thoughts...",
    "Weighing the evidence...",
    "Crafting a rebuttal...",
  ]

  // FIXED: Only update render count, don't trigger re-renders
  renderCountRef.current += 1

  // Get character objects
  const character1Obj = personas[char1]
  const character2Obj = personas[char2]

  // Helper functions to update both state and refs - MEMOIZED to prevent infinite loops
  const updateCurrentTopic = useCallback(
    (topic) => {
      console.log("🔍 updateCurrentTopic called with:", topic)
      setCurrentTopic(topic)
      topicRef.current = topic
      if (!embedded && debateState) debateState.saveTopic(topic)
    },
    [embedded, debateState],
  )

  const updateIsDebating = useCallback(
    (debating) => {
      console.log("🔍 updateIsDebating called with:", debating)
      setIsDebating((prev) => {
        if (prev !== debating) {
          console.log("🔍 isDebating state changing from", prev, "to", debating)
          isDebatingRef.current = debating
          if (!embedded && debateState) debateState.saveIsDebating(debating)
          return debating
        }
        return prev
      })
    },
    [embedded, debateState],
  )

  const updateDebateMessages = useCallback(
    (messages) => {
      console.log("🔍 updateDebateMessages called with length:", messages.length)
      setDebateMessages(messages)
      debateMessagesRef.current = messages
      if (!embedded && debateState) debateState.saveMessages(messages)
    },
    [embedded, debateState],
  )

  const updateExchangeCount = useCallback(
    (count) => {
      console.log("🔍 updateExchangeCount called with:", count)
      setExchangeCount(count)
      exchangeCountRef.current = count
      if (!embedded && debateState) debateState.saveExchangeCount(count)
    },
    [embedded, debateState],
  )

  // Thinking message rotation effect
  useEffect(() => {
    let interval
    if (isLoadingAudio && currentSpeaker) {
      let messageIndex = 0
      setThinkingMessage(thinkingMessages[0])

      interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % thinkingMessages.length
        setThinkingMessage(thinkingMessages[messageIndex])
      }, 2000) // Change message every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isLoadingAudio, currentSpeaker])

  // Update character status based on current state
  useEffect(() => {
    if (!isDebating) {
      setChar1Status("Ready")
      setChar2Status("Ready")
      return
    }

    if (currentSpeaker === char1) {
      setChar1Status(isLoadingAudio ? thinkingMessage || "Thinking..." : isPlaying ? "Speaking..." : "Ready")
      setChar2Status("Waiting turn...")
    } else if (currentSpeaker === char2) {
      setChar2Status(isLoadingAudio ? thinkingMessage || "Thinking..." : isPlaying ? "Speaking..." : "Ready")
      setChar1Status("Waiting turn...")
    } else {
      setChar1Status("Ready")
      setChar2Status("Ready")
    }
  }, [currentSpeaker, isLoadingAudio, isPlaying, thinkingMessage, isDebating, char1, char2])

  // Load dependencies - ONLY run once
  useEffect(() => {
    async function loadDependencies() {
      if (!isBrowser || dependenciesLoaded) return

      try {
        console.log("🔍 Loading dependencies...")

        const personasModule = await import("../lib/personas")
        const personasData = personasModule.personas

        const debateStateModule = await import("../lib/debate-state")

        setPersonas(personasData)
        setDebateState(debateStateModule)

        // For embedded mode, use the props directly if provided
        let defaultState
        if (embedded) {
          defaultState = {
            character1: character1 || "",
            character2: character2 || "",
            isDebating: false,
            messages: [],
            topic: initialTopic || "",
            exchangeCount: 0,
          }
          console.log("🔍 Embedded mode - using props:", { character1, character2 })
        } else {
          defaultState = {
            character1: character1 || Object.keys(personasData)[0] || "daVinci",
            character2: character2 || Object.keys(personasData)[1] || "socrates",
            isDebating: false,
            messages: [],
            topic: initialTopic || "",
            exchangeCount: 0,
          }
        }

        console.log("🔍 Setting default state:", defaultState)

        setChar1(defaultState.character1)
        setChar2(defaultState.character2)
        updateIsDebating(defaultState.isDebating)
        updateDebateMessages(defaultState.messages)
        updateCurrentTopic(defaultState.topic)
        updateExchangeCount(defaultState.exchangeCount)
        setInitialStateLoaded(true)
        setDependenciesLoaded(true)

        console.log("🔍 Dependencies loaded successfully!")
      } catch (error) {
        console.error("🔍 Error loading dependencies:", error)
        setLoadingError(error.message)
      }
    }

    loadDependencies()
  }, []) // EMPTY dependency array - only run once

  // Load voice IDs - ONLY when personas change
  useEffect(() => {
    async function loadVoiceIds() {
      if (!personas || Object.keys(personas).length === 0) return

      try {
        const response = await fetch("/api/get-voice-ids")
        if (response.ok) {
          const data = await response.json()
          setVoiceIds(data)
          console.log("🔍 Voice IDs loaded:", data)

          Object.keys(personas).forEach((key) => {
            const voiceKey = key === "daVinci" ? "davinci" : key.toLowerCase()
            if (data[voiceKey]) {
              personas[key].voiceId = data[voiceKey]
            }
          })
        } else {
          console.error("🔍 Failed to load voice IDs")
        }
      } catch (error) {
        console.error("🔍 Error loading voice IDs:", error)
      } finally {
        setIsLoadingVoices(false)
      }
    }

    if (Object.keys(personas).length > 0) {
      loadVoiceIds()
    }
  }, [personas]) // Only when personas changes

  // Initialize audio elements - ONLY run once
  useEffect(() => {
    if (char1AudioRef.current && char2AudioRef.current) {
      char1AudioRef.current.src = "/silent.mp3"
      char2AudioRef.current.src = "/silent.mp3"
      if (introAudioRef.current) {
        introAudioRef.current.src = "/silent.mp3"
      }

      const timer = setTimeout(() => {
        setIsInitializing(false)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, []) // EMPTY dependency array

  // Audio unlock function
  const unlockAudio = useCallback(async () => {
    if (isUnlockingAudio || audioInitialized) {
      return
    }

    console.log("🔍 Attempting to unlock audio...")
    setIsUnlockingAudio(true)
    setAudioError(null)

    try {
      const unlockElement = new Audio()
      unlockElement.src = "/silent.mp3"
      unlockElement.load()

      await unlockElement.play()
      console.log("🔍 Silent audio played successfully - audio unlocked")
      setAudioInitialized(true)

      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (err) {
      console.error("🔍 Failed to play silent audio:", err)
      setAudioError(`Failed to unlock audio: ${err.message}`)
    } finally {
      setIsUnlockingAudio(false)
    }
  }, [isUnlockingAudio, audioInitialized])

  // Initialize audio on user interaction - ONLY run once
  useEffect(() => {
    function handleUserInteraction() {
      if (!audioInitialized && !isUnlockingAudio) {
        unlockAudio()
        document.removeEventListener("click", handleUserInteraction)
        document.removeEventListener("touchstart", handleUserInteraction)
      }
    }

    document.addEventListener("click", handleUserInteraction)
    document.addEventListener("touchstart", handleUserInteraction)

    return () => {
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("touchstart", handleUserInteraction)
    }
  }, [audioInitialized, isUnlockingAudio, unlockAudio])

  // Audio control functions
  const pauseAudio = useCallback(() => {
    console.log("🔍 Pause audio called")
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      currentAudioRef.current.pause()
      setIsPlaying(false)
      console.log("🔍 Audio paused")
    }
  }, [])

  const resumeAudio = useCallback(() => {
    console.log("🔍 Resume audio called")
    if (currentAudioRef.current && currentAudioRef.current.paused) {
      currentAudioRef.current.play()
      setIsPlaying(true)
      console.log("🔍 Audio resumed")
    }
  }, [])

  const stopAudio = useCallback(() => {
    console.log("🔍 Stop audio called")
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      setIsPlaying(false)
      console.log("🔍 Audio stopped")
    }
  }, [])

  // Reset debate state
  const resetDebateState = useCallback(
    (shouldCallOnDebateEnd = true) => {
      console.log("🔍 Resetting debate state, shouldCallOnDebateEnd:", shouldCallOnDebateEnd)

      updateIsDebating(false)
      updateDebateMessages([])
      updateCurrentTopic("")
      setCurrentSpeaker(null)
      setNextSpeaker(null)
      setIsPlaying(false)
      setIsAudioLoaded(false)
      setAudioError(null)
      setCurrentAudioUrls({ char1: "", char2: "" })
      setNextAudioData(null)
      updateExchangeCount(0)
      setIsAutoplaying(true)
      setRetryCount(0)
      setLastError(null)
      setRequestData(null)
      setHasIntroduction(false)
      setIsIntroPlaying(false)
      setIsSettingUp(false)
      setChar1Status("Ready")
      setChar2Status("Ready")
      setThinkingMessage("")

      if (prepareNextTimeoutRef.current) {
        clearTimeout(prepareNextTimeoutRef.current)
        prepareNextTimeoutRef.current = null
      }

      if (!embedded && debateState && shouldCallOnDebateEnd) {
        debateState.clearDebateState()
      }

      if (char1AudioRef.current) {
        char1AudioRef.current.pause()
        char1AudioRef.current.src = "/silent.mp3"
      }

      if (char2AudioRef.current) {
        char2AudioRef.current.pause()
        char2AudioRef.current.src = "/silent.mp3"
      }

      if (introAudioRef.current) {
        introAudioRef.current.pause()
        introAudioRef.current.src = "/silent.mp3"
      }

      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }

      if (prepareTimeoutRef.current) {
        clearTimeout(prepareTimeoutRef.current)
        prepareTimeoutRef.current = null
      }

      if (embedded && onDebateEnd && !audioError && shouldCallOnDebateEnd) {
        onDebateEnd()
      }
    },
    [
      updateIsDebating,
      updateDebateMessages,
      updateCurrentTopic,
      updateExchangeCount,
      embedded,
      debateState,
      onDebateEnd,
      audioError,
    ],
  )

  // Start debate function - FIXED to ensure it actually starts
  const startDebate = useCallback(
    async (topic) => {
      console.log("🔍 === START DEBATE CALLED ===")
      console.log("🔍 startDebate called with topic:", topic)
      console.log("🔍 Current state:", {
        dependenciesLoaded,
        initialStateLoaded,
        char1,
        char2,
        isStarting,
        isDebating,
      })

      if (!dependenciesLoaded || !initialStateLoaded) {
        console.log("🔍 Dependencies not ready, saving topic for later...")
        updateCurrentTopic(topic)
        return
      }

      if (!char1 || !char2) {
        console.log("🔍 Cannot start debate: missing characters", { char1, char2 })
        setAudioError("Cannot start debate: Please ensure both characters are selected")
        return
      }

      if (isStarting || isDebating || isProcessing) {
        console.log("🔍 Debate already starting, in progress, or processing - ignoring duplicate start")
        return
      }

      console.log("🔍 Starting debate with topic:", topic)
      console.log("🔍 Using characters:", { char1, char2 })

      setIsStarting(true)
      setCurrentSpeaker(null)
      setNextSpeaker(null)
      setIsPlaying(false)
      setIsAudioLoaded(false)
      setAudioError(null)
      setStatusMessage("Preparing debate...")

      updateCurrentTopic(topic)
      updateIsDebating(true)
      setIsProcessing(true)
      setIsSettingUp(true)
      setCurrentSpeaker(char1)
      setIsLoadingAudio(true)

      await unlockAudio()

      try {
        const requestBody = {
          character1: char1,
          character2: char2,
          topic,
          format: debateFormat,
          historicalContext,
        }

        console.log("🔍 Sending request to /api/start-debate:", requestBody)

        const response = await fetch("/api/start-debate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        console.log("🔍 Response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("🔍 API error response:", errorText)
          throw new Error(`Failed to start debate: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log("🔍 Debate started with data:", data)

        const messages = [
          {
            character: char1,
            content: data.opening1,
            timestamp: Date.now(),
            audioUrl: data.audioUrl1,
            responseType: "Opening Remarks",
          },
          {
            character: char2,
            content: data.opening2,
            timestamp: Date.now() + 100,
            audioUrl: data.audioUrl2,
            responseType: "Opening Remarks",
          },
        ]

        updateDebateMessages(messages)
        setIsSettingUp(false)
        setIsLoadingAudio(false)
        setNextSpeaker(char2)

        console.log("🔍 Debate setup complete, visuals should now be active")
      } catch (error) {
        console.error("🔍 Error starting debate:", error)
        updateIsDebating(false)
        setIsSettingUp(false)
        setIsLoadingAudio(false)
        setAudioError(`Failed to start debate: ${error.message}`)
      } finally {
        setIsProcessing(false)
        setIsStarting(false)
      }
    },
    [
      dependenciesLoaded,
      initialStateLoaded,
      char1,
      char2,
      isStarting,
      isDebating,
      updateCurrentTopic,
      updateIsDebating,
      updateDebateMessages,
      unlockAudio,
      debateFormat,
      historicalContext,
      isProcessing,
    ],
  )

  // Auto-start when dependencies loaded and topic available - FIXED dependencies
  useEffect(() => {
    console.log("🔍 Auto-start effect triggered")
    console.log("🔍 Conditions:", {
      dependenciesLoaded,
      initialStateLoaded,
      currentTopic: !!currentTopic,
      isDebating,
      isStarting,
      isProcessing,
      char1,
      char2,
      embedded,
    })

    if (
      dependenciesLoaded &&
      initialStateLoaded &&
      currentTopic &&
      !isDebating &&
      !isStarting &&
      !isProcessing &&
      char1 &&
      char2
    ) {
      console.log("🔍 Auto-starting debate with topic:", currentTopic)
      console.log("🔍 Using characters:", char1, "vs", char2)
      const timer = setTimeout(() => {
        startDebate(currentTopic)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [
    dependenciesLoaded,
    initialStateLoaded,
    currentTopic,
    isDebating,
    isStarting,
    isProcessing,
    char1,
    char2,
    startDebate,
  ])

  // DEBUG: Check visual rendering conditions - MEMOIZED
  const shouldShowVisuals = isDebating
  const shouldShowCharacterGrid = isDebating && Object.keys(personas).length > 0
  const shouldShowDebateHeader = !embedded

  // Show loading state
  if (!dependenciesLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
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

  const containerStyle = {
    minHeight: embedded ? "auto" : "calc(100vh - 2rem)",
    display: "flex",
    flexDirection: "column",
  }

  const mainContentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  }

  return (
    <div
      className={`${embedded ? "" : "container mx-auto py-8 px-4 max-w-6xl"} bg-gray-900 text-white`}
      style={containerStyle}
    >
      <div style={mainContentStyle}>
        {isLoadingVoices && (
          <div className="mb-4 p-4 bg-yellow-800 text-yellow-100 rounded-lg text-center">
            <div className="inline-block animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full mr-2"></div>
            Loading voice data... Please wait.
          </div>
        )}

        {audioError && (
          <div className="mb-4 p-4 bg-red-900 text-red-100 rounded-lg">
            <p className="font-bold">Error:</p>
            <p>{audioError}</p>
            {retryCount > 0 && retryCount < 3 && <p className="mt-2">Retrying automatically ({retryCount}/3)...</p>}
          </div>
        )}

        {/* Show ONLY the two selected debaters when debate is active */}
        {shouldShowVisuals && character1Obj && character2Obj && (
          <div className="mb-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-yellow-400">
                  🔥 DEBATE: {character1Obj.name} vs {character2Obj.name} 🔥
                </h2>
                <button
                  onClick={() => resetDebateState(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                >
                  End Debate
                </button>
              </div>

              {currentTopic && <p className="text-gray-300 mb-6">Topic: {currentTopic}</p>}

              {/* Two-character debate interface */}
              <div className="grid grid-cols-2 gap-8">
                {/* Character 1 */}
                <div className="text-center">
                  <div className="relative mb-4">
                    <div
                      className={`w-32 h-32 mx-auto rounded-full overflow-hidden transition-all duration-300 ${
                        currentSpeaker === char1 && isPlaying
                          ? "ring-4 ring-yellow-400 ring-opacity-75 shadow-lg shadow-yellow-400/50"
                          : currentSpeaker === char1 && isLoadingAudio
                            ? "ring-4 ring-blue-400 ring-opacity-75"
                            : "ring-2 ring-gray-600"
                      }`}
                    >
                      <img
                        src={character1Obj.image || "/placeholder.svg"}
                        alt={character1Obj.name}
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          currentSpeaker === char1 && isPlaying
                            ? "scale-110"
                            : currentSpeaker === char1 && isLoadingAudio
                              ? "opacity-75"
                              : ""
                        }`}
                      />
                      {currentSpeaker === char1 && isLoadingAudio && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {currentSpeaker === char1 && isPlaying && (
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-400 opacity-10 animate-pulse"></div>
                      )}
                    </div>

                    {/* Pulsing ring animation when speaking */}
                    {currentSpeaker === char1 && isPlaying && (
                      <div className="absolute inset-0 rounded-full border-4 border-yellow-400 animate-ping opacity-75"></div>
                    )}
                  </div>

                  <h3
                    className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                      currentSpeaker === char1 && isPlaying
                        ? "text-yellow-300"
                        : currentSpeaker === char1
                          ? "text-yellow-400"
                          : "text-gray-300"
                    }`}
                  >
                    {character1Obj.name}
                  </h3>

                  <p
                    className={`text-sm mb-4 transition-colors duration-300 ${
                      currentSpeaker === char1 && isLoadingAudio
                        ? "text-blue-300"
                        : currentSpeaker === char1 && isPlaying
                          ? "text-yellow-200"
                          : "text-gray-400"
                    }`}
                  >
                    {char1Status}
                  </p>

                  {/* Enhanced sound wave animation */}
                  <div className="h-6 flex items-center justify-center mb-4">
                    {currentSpeaker === char1 && isPlaying && (
                      <div className="flex space-x-1">
                        {[...Array(7)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-yellow-500 to-orange-400 rounded-full animate-pulse"
                            style={{
                              height: `${8 + (i % 4) * 4}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audio controls for Character 1 */}
                  {currentSpeaker === char1 && (
                    <div className="flex justify-center space-x-2">
                      {isPlaying ? (
                        <>
                          <button
                            onClick={pauseAudio}
                            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                            title="Pause"
                          >
                            ⏸
                          </button>
                          <button
                            onClick={stopAudio}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            title="Stop"
                          >
                            ⏹
                          </button>
                        </>
                      ) : (
                        currentAudioRef.current &&
                        currentAudioRef.current.currentTime > 0 &&
                        !currentAudioRef.current.ended && (
                          <button
                            onClick={resumeAudio}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            title="Resume"
                          >
                            ▶
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Character 2 */}
                <div className="text-center">
                  <div className="relative mb-4">
                    <div
                      className={`w-32 h-32 mx-auto rounded-full overflow-hidden transition-all duration-300 ${
                        currentSpeaker === char2 && isPlaying
                          ? "ring-4 ring-yellow-400 ring-opacity-75 shadow-lg shadow-yellow-400/50"
                          : currentSpeaker === char2 && isLoadingAudio
                            ? "ring-4 ring-blue-400 ring-opacity-75"
                            : "ring-2 ring-gray-600"
                      }`}
                    >
                      <img
                        src={character2Obj.image || "/placeholder.svg"}
                        alt={character2Obj.name}
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          currentSpeaker === char2 && isPlaying
                            ? "scale-110"
                            : currentSpeaker === char2 && isLoadingAudio
                              ? "opacity-75"
                              : ""
                        }`}
                      />
                      {currentSpeaker === char2 && isLoadingAudio && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {currentSpeaker === char2 && isPlaying && (
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-400 opacity-10 animate-pulse"></div>
                      )}
                    </div>

                    {/* Pulsing ring animation when speaking */}
                    {currentSpeaker === char2 && isPlaying && (
                      <div className="absolute inset-0 rounded-full border-4 border-yellow-400 animate-ping opacity-75"></div>
                    )}
                  </div>

                  <h3
                    className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                      currentSpeaker === char2 && isPlaying
                        ? "text-yellow-300"
                        : currentSpeaker === char2
                          ? "text-yellow-400"
                          : "text-gray-300"
                    }`}
                  >
                    {character2Obj.name}
                  </h3>

                  <p
                    className={`text-sm mb-4 transition-colors duration-300 ${
                      currentSpeaker === char2 && isLoadingAudio
                        ? "text-blue-300"
                        : currentSpeaker === char2 && isPlaying
                          ? "text-yellow-200"
                          : "text-gray-400"
                    }`}
                  >
                    {char2Status}
                  </p>

                  {/* Enhanced sound wave animation */}
                  <div className="h-6 flex items-center justify-center mb-4">
                    {currentSpeaker === char2 && isPlaying && (
                      <div className="flex space-x-1">
                        {[...Array(7)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-yellow-500 to-orange-400 rounded-full animate-pulse"
                            style={{
                              height: `${8 + (i % 4) * 4}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audio controls for Character 2 */}
                  {currentSpeaker === char2 && (
                    <div className="flex justify-center space-x-2">
                      {isPlaying ? (
                        <>
                          <button
                            onClick={pauseAudio}
                            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                            title="Pause"
                          >
                            ⏸
                          </button>
                          <button
                            onClick={stopAudio}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            title="Stop"
                          >
                            ⏹
                          </button>
                        </>
                      ) : (
                        currentAudioRef.current &&
                        currentAudioRef.current.currentTime > 0 &&
                        !currentAudioRef.current.ended && (
                          <button
                            onClick={resumeAudio}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            title="Resume"
                          >
                            ▶
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isDebating && !isIntroPlaying && dependenciesLoaded && (
          <div className="mb-8">
            <EmbeddedTopicSelector onSelectTopic={startDebate} character1={char1} character2={char2} />
          </div>
        )}

        {(isSettingUp || isPreparing) && (
          <div className="flex justify-center items-center mb-8">
            <div className="text-center">
              <div className="inline-block animate-spin h-10 w-10 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-yellow-400 text-lg">
                {isSettingUp
                  ? "Setting up the debate..."
                  : isPreparing
                    ? "Preparing next response..."
                    : "Processing..."}
              </p>
              {statusMessage && <p className="text-yellow-300 text-sm mt-2">{statusMessage}</p>}
            </div>
          </div>
        )}

        {!embedded && (
          <div className="mt-auto mb-4 text-center">
            <a href="/" className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full">
              Return to Home
            </a>
          </div>
        )}
      </div>

      <audio ref={silentAudioRef} preload="auto" className="hidden" />
      <audio ref={introAudioRef} preload="auto" className="hidden" />
      <audio ref={char1AudioRef} preload="auto" className="hidden" />
      <audio ref={char2AudioRef} preload="auto" className="hidden" />
    </div>
  )
}

export default DebateInterface
