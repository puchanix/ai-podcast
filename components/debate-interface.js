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

  // DEBUG STATE - FIXED to prevent infinite loops
  const [debugInfo, setDebugInfo] = useState({
    renderCount: 0,
    lastUpdate: null,
    componentPath: "DebateInterface",
    visualsRendered: false,
    conditionalChecks: {},
  })

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

  // Load dependencies - ONLY run once
  useEffect(() => {
    async function loadDependencies() {
      if (!isBrowser || dependenciesLoaded) return

      try {
        console.log("🔍 Loading dependencies...")

        const personasModule = await import("../lib/personas")
        const personasData = personasModule.personas
        console.log("🔍 Personas loaded:", Object.keys(personasData))

        const debateStateModule = await import("../lib/debate-state")
        console.log("🔍 Debate state module loaded")

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
          console.log("🔍 Non-embedded mode - using default characters")
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
      console.log("🔍 Audio already unlocked or unlocking in progress")
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

  // Start debate function
  const startDebate = useCallback(
    async (topic) => {
      console.log("🔍 === START DEBATE CALLED ===")
      console.log("🔍 startDebate called with topic:", topic)

      if (!dependenciesLoaded || !initialStateLoaded) {
        console.log("🔍 Dependencies not ready, waiting...")
        updateCurrentTopic(topic)
        return
      }

      if (!char1 || !char2) {
        console.log("🔍 Cannot start debate: missing characters", { char1, char2 })
        setAudioError("Cannot start debate: Please ensure both characters are selected")
        return
      }

      if (isStarting || isDebating) {
        console.log("🔍 Debate already starting or in progress, ignoring duplicate start")
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
        setNextSpeaker(char2)

        console.log("🔍 Debate setup complete, visuals should now be active")
      } catch (error) {
        console.error("🔍 Error starting debate:", error)
        updateIsDebating(false)
        setIsSettingUp(false)
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
    ],
  )

  // Auto-start when dependencies loaded and topic available - FIXED dependencies
  useEffect(() => {
    if (dependenciesLoaded && initialStateLoaded && currentTopic && !isDebating && !isStarting && char1 && char2) {
      console.log("🔍 Auto-starting debate with topic:", currentTopic)
      console.log("🔍 Using characters:", char1, "vs", char2)
      const timer = setTimeout(() => {
        startDebate(currentTopic)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [dependenciesLoaded, initialStateLoaded, currentTopic, isDebating, isStarting, char1, char2, startDebate])

  // DEBUG: Check visual rendering conditions - MEMOIZED
  const shouldShowVisuals = isDebating
  const shouldShowCharacterGrid = isDebating && Object.keys(personas).length > 0
  const shouldShowDebateHeader = !embedded

  console.log("🔍 VISUAL RENDER CONDITIONS:")
  console.log("🔍 shouldShowVisuals:", shouldShowVisuals)
  console.log("🔍 shouldShowCharacterGrid:", shouldShowCharacterGrid)
  console.log("🔍 shouldShowDebateHeader:", shouldShowDebateHeader)
  console.log("🔍 isDebating:", isDebating)
  console.log("🔍 embedded:", embedded)
  console.log("🔍 personas count:", Object.keys(personas).length)
  console.log("🔍 char1:", char1, "char2:", char2)
  console.log("🔍 character1Obj:", character1Obj?.name)
  console.log("🔍 character2Obj:", character2Obj?.name)

  // Show loading state
  if (!dependenciesLoaded) {
    console.log("🔍 RENDERING: Loading state")
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
    console.log("🔍 RENDERING: Error state")
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

  console.log("🔍 RENDERING: Main component")

  return (
    <div
      className={`${embedded ? "" : "container mx-auto py-8 px-4 max-w-6xl"} bg-gray-900 text-white`}
      style={containerStyle}
    >
      {/* COMPREHENSIVE DEBUG PANEL - FIXED to not cause re-renders */}
      <div className="mb-4 p-4 bg-purple-900 text-purple-100 rounded-lg text-xs">
        <h3 className="font-bold text-yellow-400 mb-2">🔍 COMPREHENSIVE DEBUG INFO</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p>
              <strong>Component State:</strong>
            </p>
            <p>Render Count: {renderCountRef.current}</p>
            <p>Dependencies Loaded: {dependenciesLoaded ? "✅" : "❌"}</p>
            <p>Initial State Loaded: {initialStateLoaded ? "✅" : "❌"}</p>
            <p>Embedded: {embedded ? "✅" : "❌"}</p>
            <p>Loading Error: {loadingError || "None"}</p>
          </div>
          <div>
            <p>
              <strong>Debate State:</strong>
            </p>
            <p>Is Debating: {isDebating ? "✅" : "❌"}</p>
            <p>Current Speaker: {currentSpeaker || "None"}</p>
            <p>Is Playing: {isPlaying ? "✅" : "❌"}</p>
            <p>Is Loading Audio: {isLoadingAudio ? "✅" : "❌"}</p>
            <p>Current Topic: {currentTopic || "None"}</p>
          </div>
          <div>
            <p>
              <strong>Characters:</strong>
            </p>
            <p>
              Char1: {char1} ({character1Obj?.name || "Not found"})
            </p>
            <p>
              Char2: {char2} ({character2Obj?.name || "Not found"})
            </p>
            <p>Personas Loaded: {Object.keys(personas).length}</p>
            <p>Personas: {Object.keys(personas).join(", ")}</p>
          </div>
          <div>
            <p>
              <strong>Visual Conditions:</strong>
            </p>
            <p>Should Show Visuals: {shouldShowVisuals ? "✅" : "❌"}</p>
            <p>Should Show Character Grid: {shouldShowCharacterGrid ? "✅" : "❌"}</p>
            <p>Should Show Debate Header: {shouldShowDebateHeader ? "✅" : "❌"}</p>
          </div>
        </div>
      </div>

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

        {/* STATIC TEST VISUAL - ALWAYS SHOW */}
        <div className="mb-6 p-8 bg-red-600 text-white text-center text-2xl font-bold border-4 border-yellow-400">
          🚨 STATIC TEST VISUAL - RENDER COUNT: {renderCountRef.current} 🚨
        </div>

        {/* CONDITIONAL TEST VISUAL - ONLY WHEN DEBATING */}
        {isDebating && (
          <div className="mb-6 p-8 bg-green-600 text-white text-center text-2xl font-bold border-4 border-yellow-400">
            ✅ DEBATE ACTIVE TEST VISUAL - DEBATE IS RUNNING ✅
          </div>
        )}

        {/* Show all characters with greyed out non-debaters - ALWAYS show when debating */}
        {shouldShowVisuals && (
          <div className="mb-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-yellow-400">
                  🔥 DEBATE ACTIVE: {character1Obj?.name || char1} vs {character2Obj?.name || char2} 🔥
                </h2>
                <button
                  onClick={() => resetDebateState(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                >
                  End Debate
                </button>
              </div>

              {currentTopic && <p className="text-gray-300 mb-4">Topic: {currentTopic}</p>}

              {/* Show all characters */}
              {shouldShowCharacterGrid && (
                <div className="grid grid-cols-5 gap-4 mb-6">
                  {Object.keys(personas).map((characterId) => {
                    const isDebater = characterId === char1 || characterId === char2
                    const isCurrentSpeaker = characterId === currentSpeaker
                    const character = personas[characterId]

                    return (
                      <div
                        key={characterId}
                        className={`text-center transition-all duration-300 ${
                          isDebater ? "opacity-100" : "opacity-30 grayscale"
                        }`}
                      >
                        <div className="relative">
                          <div
                            className={`w-16 h-16 mx-auto rounded-full overflow-hidden transition-all duration-300 ${
                              isCurrentSpeaker && isPlaying
                                ? "ring-4 ring-yellow-400 ring-opacity-75 shadow-lg shadow-yellow-400/50"
                                : isCurrentSpeaker && isLoadingAudio
                                  ? "ring-4 ring-blue-400 ring-opacity-75"
                                  : isDebater
                                    ? "ring-2 ring-gray-600"
                                    : "ring-1 ring-gray-700"
                            }`}
                          >
                            <img
                              src={character?.image || "/placeholder.svg"}
                              alt={character?.name}
                              className={`w-full h-full object-cover transition-all duration-300 ${
                                isCurrentSpeaker && isPlaying
                                  ? "scale-110"
                                  : isCurrentSpeaker && isLoadingAudio
                                    ? "opacity-75"
                                    : ""
                              }`}
                            />
                            {isCurrentSpeaker && isLoadingAudio && (
                              <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                            {isCurrentSpeaker && isPlaying && (
                              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-400 opacity-10 animate-pulse"></div>
                            )}
                          </div>

                          {/* Pulsing ring animation when speaking */}
                          {isCurrentSpeaker && isPlaying && (
                            <div className="absolute inset-0 rounded-full border-4 border-yellow-400 animate-ping opacity-75"></div>
                          )}
                        </div>

                        <p
                          className={`text-xs mt-2 transition-colors duration-300 ${
                            isCurrentSpeaker && isPlaying
                              ? "text-yellow-300 font-bold"
                              : isDebater
                                ? "text-yellow-400"
                                : "text-gray-500"
                          }`}
                        >
                          {character?.name}
                        </p>

                        {isCurrentSpeaker && (
                          <p
                            className={`text-xs transition-colors duration-300 ${
                              isLoadingAudio ? "text-blue-300" : isPlaying ? "text-yellow-200" : "text-gray-400"
                            }`}
                          >
                            {statusMessage || (isLoadingAudio ? "Thinking..." : isPlaying ? "Speaking..." : "Ready")}
                          </p>
                        )}

                        {/* Enhanced sound wave animation */}
                        {isCurrentSpeaker && (
                          <div className="h-4 flex items-center justify-center mt-1">
                            {isPlaying && (
                              <div className="flex space-x-1">
                                {[...Array(5)].map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-0.5 bg-gradient-to-t from-yellow-500 to-orange-400 rounded-full animate-pulse"
                                    style={{
                                      height: `${4 + (i % 3) * 2}px`,
                                      animationDelay: `${i * 0.1}s`,
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
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
