"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"

// Dynamically import components that use browser APIs
const EmbeddedTopicSelector = dynamic(
  () => import("./embedded-topic-selector").then((mod) => mod.EmbeddedTopicSelector),
  {
    ssr: false,
    loading: () => <div>Loading topic selector...</div>,
  },
)

const VoiceInput = dynamic(() => import("./voice-input").then((mod) => ({ default: mod.VoiceInput })), {
  ssr: false,
})

const DebateHeader = dynamic(() => import("./debate-header").then((mod) => ({ default: mod.DebateHeader })), {
  ssr: false,
})

// Check if we're running in the browser
const isBrowser = typeof window !== "undefined"

// Static debate topics
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
  // Lazy load personas and debate state only on client side
  const [personas, setPersonas] = useState({})
  const [debateState, setDebateState] = useState(null)
  const [dependenciesLoaded, setDependenciesLoaded] = useState(false)
  const [loadingError, setLoadingError] = useState(null)

  // Initialize state from localStorage or defaults
  const [initialStateLoaded, setInitialStateLoaded] = useState(false)
  const [char1, setChar1] = useState("")
  const [char2, setChar2] = useState("")
  const [isDebating, setIsDebating] = useState(false)
  const [debateMessages, setDebateMessages] = useState([])
  const [currentTopic, setCurrentTopic] = useState("")
  const [exchangeCount, setExchangeCount] = useState(0)

  // Add at the top of the component, right after all the state declarations
  const [hasError, setHasError] = useState(false)

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
  // New state for topic introduction
  const [hasIntroduction, setHasIntroduction] = useState(false)
  const [isIntroPlaying, setIsIntroPlaying] = useState(false)
  const [characterSpecificTopics, setCharacterSpecificTopics] = useState([])
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [isPreparing, setIsPreparing] = useState(isDebating ? true : false)
  const [statusMessage, setStatusMessage] = useState("")
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [voiceIds, setVoiceIds] = useState({})
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)

  // Refs
  const audioRef = useRef(null)
  const silentAudioRef = useRef(null)
  const char1AudioRef = useRef(null)
  const char2AudioRef = useRef(null)
  const nextAudioRef = useRef(null)
  const introAudioRef = useRef(null)
  const topicRef = useRef(currentTopic)
  const isDebatingRef = useRef(isDebating)
  const debateMessagesRef = useRef(debateMessages)
  const exchangeCountRef = useRef(exchangeCount)
  const prepareNextTimeoutRef = useRef(null)
  const prepareTimeoutRef = useRef(null)
  const currentAudioRef = useRef(null)

  // Store current audio URLs
  const [currentAudioUrls, setCurrentAudioUrls] = useState({
    char1: "",
    char2: "",
  })

  // Get character objects
  const character1Obj = personas[char1]
  const character2Obj = personas[char2]

  // Load dependencies on client side - FIXED VERSION
  const loadDependencies = useCallback(async () => {
    if (!isBrowser) return

    console.log("Loading dependencies...")

    try {
      console.log("Starting to import personas and debate state...")

      // Import personas
      const personasModule = await import("../lib/personas")
      const personasData = personasModule.personas
      console.log("Personas loaded:", personasData)

      // Import debate state
      const debateStateModule = await import("../lib/debate-state")
      console.log("Debate state module loaded:", debateStateModule)

      setPersonas(personasData)
      setDebateState(debateStateModule)

      // Initialize state with default values after personas are loaded
      const defaultState = {
        character1: character1 || Object.keys(personasData)[0] || "daVinci",
        character2: character2 || Object.keys(personasData)[1] || "socrates",
        isDebating: false,
        messages: [],
        topic: initialTopic || "",
        exchangeCount: 0,
      }

      console.log("Setting initial state:", defaultState)
      setChar1(defaultState.character1)
      setChar2(defaultState.character2)
      setIsDebating(defaultState.isDebating)
      setDebateMessages(defaultState.messages)
      setCurrentTopic(defaultState.topic)
      setExchangeCount(defaultState.exchangeCount)
      setInitialStateLoaded(true)
      setDependenciesLoaded(true)

      console.log("Dependencies loaded successfully!")
    } catch (error) {
      console.error("Error loading dependencies:", error)
      setLoadingError(error.message)
    }
  }, [character1, character2, initialTopic])

  // Load voice IDs when component mounts
  const loadVoiceIds = useCallback(async () => {
    if (!personas || Object.keys(personas).length === 0) return

    try {
      const response = await fetch("/api/get-voice-ids")
      if (response.ok) {
        const data = await response.json()
        setVoiceIds(data)
        console.log("Voice IDs loaded:", data)

        // This is the critical part - directly update the voiceId property in each persona
        Object.keys(personas).forEach((key) => {
          // Map the character keys correctly
          const voiceKey = key === "daVinci" ? "davinci" : key.toLowerCase()

          if (data[voiceKey]) {
            // Directly set the voiceId property
            personas[key].voiceId = data[voiceKey]
            console.log(`Updated voice ID for ${key}: ${data[voiceKey]}`)
          }
        })

        // Also update the global voiceIdMap if it exists
        if (typeof window !== "undefined" && window.voiceIdMap) {
          Object.keys(data).forEach((key) => {
            if (data[key]) {
              window.voiceIdMap[key] = data[key]
              console.log(`Updated global voiceIdMap for ${key}: ${data[key]}`)
            }
          })
        }
      } else {
        console.error("Failed to load voice IDs")
      }
    } catch (error) {
      console.error("Error loading voice IDs:", error)
    } finally {
      setIsLoadingVoices(false)
    }
  }, [personas])

  useEffect(() => {
    loadDependencies()
  }, [loadDependencies])

  useEffect(() => {
    loadVoiceIds()
  }, [loadVoiceIds])

  // Early return for SSR
  if (!isBrowser) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-yellow-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Update refs when state changes
  useEffect(() => {
    topicRef.current = currentTopic
    console.log("Topic updated in ref:", topicRef.current)
    if (!embedded && debateState) debateState.saveTopic(currentTopic)
  }, [currentTopic, embedded, debateState])

  useEffect(() => {
    isDebatingRef.current = isDebating
    console.log("isDebating updated in ref:", isDebatingRef.current)
    if (!embedded && debateState) debateState.saveIsDebating(isDebating)
  }, [isDebating, embedded, debateState])

  useEffect(() => {
    debateMessagesRef.current = debateMessages
    console.log("debateMessages updated in ref, length:", debateMessagesRef.current.length)
    if (!embedded && debateState) debateState.saveMessages(debateMessages)
  }, [debateMessages, embedded, debateState])

  useEffect(() => {
    exchangeCountRef.current = exchangeCount
    console.log("exchangeCount updated in ref:", exchangeCountRef.current)
    if (!embedded && debateState) debateState.saveExchangeCount(exchangeCount)
  }, [exchangeCount, embedded, debateState])

  // Save characters when they change (only if not embedded)
  useEffect(() => {
    if (!embedded && debateState) {
      debateState.saveCharacters(char1, char2)
    }
  }, [char1, char2, embedded, debateState])

  // Log the personas object and voice IDs for debugging
  useEffect(() => {
    if (personas && Object.keys(personas).length > 0) {
      console.log("PERSONAS OBJECT:", personas)
      console.log("Character 1:", char1, personas[char1])
      console.log("Character 1 Voice ID:", personas[char1]?.voiceId)
      console.log("Character 2:", char2, personas[char2])
      console.log("Character 2 Voice ID:", personas[char2]?.voiceId)
    }
  }, [char1, char2, voiceIds, personas])

  // Initialize audio elements with silent.mp3
  useEffect(() => {
    if (char1AudioRef.current && char2AudioRef.current) {
      // Set a default silent audio file to prevent "Empty src attribute" errors
      char1AudioRef.current.src = "/silent.mp3"
      char2AudioRef.current.src = "/silent.mp3"
      if (introAudioRef.current) {
        introAudioRef.current.src = "/silent.mp3"
      }

      // Mark initialization as complete after a short delay
      const timer = setTimeout(() => {
        setIsInitializing(false)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [])

  // Function to unlock audio on iOS
  const unlockAudio = useCallback(async () => {
    // Prevent multiple simultaneous unlock attempts
    if (isUnlockingAudio || audioInitialized) {
      console.log("Audio already unlocked or unlocking in progress")
      return
    }

    console.log("Attempting to unlock audio...")
    setIsUnlockingAudio(true)
    setAudioError(null)

    try {
      // Create a new audio element specifically for unlocking
      const unlockElement = new Audio()
      unlockElement.src = "/silent.mp3"
      unlockElement.load()

      await unlockElement.play()
      console.log("Silent audio played successfully - audio unlocked")
      setAudioInitialized(true)

      // Wait a moment before allowing other audio operations
      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (err) {
      console.error("Failed to play silent audio:", err)
      setAudioError(`Failed to unlock audio: ${err.message}`)
    } finally {
      setIsUnlockingAudio(false)
    }
  }, [audioInitialized, isUnlockingAudio])

  // Initialize audio on component mount
  useEffect(() => {
    // Try to unlock audio on first user interaction
    const handleUserInteraction = () => {
      if (!audioInitialized && !isUnlockingAudio) {
        unlockAudio()
        // Remove event listeners after first interaction
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

  // Reset all debate state
  const resetDebateState = useCallback(
    (shouldCallOnDebateEnd = true) => {
      setIsDebating(false)
      setDebateMessages([])
      setCurrentTopic("")
      setCurrentSpeaker(null)
      setNextSpeaker(null)
      setIsPlaying(false)
      setIsAudioLoaded(false)
      setAudioError(null)
      setCurrentAudioUrls({ char1: "", char2: "" })
      setNextAudioData(null)
      setExchangeCount(0)
      setIsAutoplaying(true)
      setRetryCount(0)
      setLastError(null)
      setRequestData(null)
      setHasIntroduction(false)
      setIsIntroPlaying(false)
      setIsSettingUp(false)

      // Clear any pending timeouts
      if (prepareNextTimeoutRef.current) {
        clearTimeout(prepareNextTimeoutRef.current)
        prepareNextTimeoutRef.current = null
      }

      // Update refs
      topicRef.current = ""
      isDebatingRef.current = false
      debateMessagesRef.current = []
      exchangeCountRef.current = 0

      // Clear localStorage only if not embedded
      if (!embedded && debateState) {
        debateState.clearDebateState()
      }

      // Stop any playing audio
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

      // Clear any prepare timeout
      if (prepareTimeoutRef.current) {
        clearTimeout(prepareTimeoutRef.current)
        prepareTimeoutRef.current = null
      }

      // Only call onDebateEnd if this is actually ending a debate, not starting one
      if (embedded && onDebateEnd && !audioError && shouldCallOnDebateEnd) {
        onDebateEnd()
      }
    },
    [embedded, onDebateEnd, audioError, debateState],
  )

  // Generate character-specific debate topics
  const generateCharacterSpecificTopics = useCallback(async () => {
    if (isGeneratingTopics || !isBrowser) return

    // Check if we already have topics for this character pair
    const topicKey = `${char1}_${char2}_topics`
    let storedTopics

    try {
      storedTopics = localStorage.getItem(topicKey)
    } catch (e) {
      console.error("Error accessing localStorage:", e)
    }

    if (storedTopics) {
      try {
        const parsedTopics = JSON.parse(storedTopics)
        // Limit to 2 topics
        setCharacterSpecificTopics(parsedTopics.slice(0, 2))
        return
      } catch (e) {
        console.error("Error parsing stored topics:", e)
      }
    }

    setIsGeneratingTopics(true)

    try {
      const response = await fetch("/api/generate-character-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1: char1,
          character2: char2,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate topics")

      const data = await response.json()
      // Limit to 2 topics
      const limitedTopics = data.topics.slice(0, 2)
      setCharacterSpecificTopics(limitedTopics)

      // Store in localStorage for future use
      try {
        localStorage.setItem(topicKey, JSON.stringify(limitedTopics))
      } catch (e) {
        console.error("Error storing topics in localStorage:", e)
      }
    } catch (error) {
      console.error("Error generating character-specific topics:", error)
      // Fall back to static topics
      setCharacterSpecificTopics(staticDebateTopics)
    } finally {
      setIsGeneratingTopics(false)
    }
  }, [char1, char2, isGeneratingTopics])

  // Generate debate topics when characters change
  useEffect(() => {
    if (isBrowser && initialStateLoaded) {
      // Reset debate state when characters change
      resetDebateState()

      // Generate character-specific topics
      generateCharacterSpecificTopics()
    }
  }, [char1, char2, generateCharacterSpecificTopics, resetDebateState, initialStateLoaded])

  // Add a useEffect to monitor isDebating state changes
  useEffect(() => {
    console.log("isDebating state changed to:", isDebating)
  }, [isDebating])

  // Add a useEffect to monitor debateMessages changes
  useEffect(() => {
    if (debateMessages.length > 0) {
      console.log("debateMessages updated, length:", debateMessages.length)
    }
  }, [debateMessages])

  // Handle initial topic from URL params or props
  useEffect(() => {
    if (isBrowser && initialStateLoaded) {
      // Check if there's a topic in URL params
      const urlParams = new URLSearchParams(window.location.search)
      const topicFromUrl = urlParams.get("topic")

      if (topicFromUrl && !currentTopic) {
        setCurrentTopic(topicFromUrl)
        // Auto-start debate with the topic
        setTimeout(() => {
          startDebateMain(topicFromUrl)
        }, 1000)
      }
    }
  }, [initialStateLoaded, currentTopic])

  // Get the appropriate voice for a character
  const getVoiceForCharacter = useCallback(
    (characterId) => {
      // First, check if the character exists
      if (!personas[characterId]) {
        console.log(`Character ${characterId} not found in personas`)
        return "echo" // Default OpenAI voice as fallback
      }

      // Log the current state of the character's voice ID
      console.log(`Character ${characterId} voiceId property:`, personas[characterId].voiceId)

      // First priority: Use the direct voiceId property if available
      if (personas[characterId].voiceId) {
        console.log(`Using direct voiceId property for ${characterId}: ${personas[characterId].voiceId}`)
        return personas[characterId].voiceId
      }

      // Second priority: Use the getVoiceId method if available
      if (typeof personas[characterId].getVoiceId === "function") {
        const voiceId = personas[characterId].getVoiceId()
        console.log(`Using getVoiceId() method for ${characterId}: ${voiceId}`)
        return voiceId
      }

      // Third priority: Check voiceIds state
      const voiceKey = characterId === "daVinci" ? "davinci" : characterId.toLowerCase()
      if (voiceIds[voiceKey]) {
        console.log(`Using voiceIds state for ${characterId}: ${voiceIds[voiceKey]}`)
        return voiceIds[voiceKey]
      }

      // Final fallback - use valid OpenAI voices
      console.log(`No voice ID found for ${characterId}, using default`)
      return characterId === "frida" ? "nova" : "echo"
    },
    [voiceIds, personas],
  )

  // Function to play debate audio
  const playDebateAudio = useCallback(
    async (message, allMessages, currentIndex) => {
      // Prevent multiple simultaneous audio plays for the same message
      if (currentAudioRef.current && !currentAudioRef.current.paused) {
        console.log("Audio already playing, skipping duplicate play request")
        return
      }

      // Ensure isDebating is true when playing audio
      if (!isDebatingRef.current) {
        console.log("Setting isDebating to true in playDebateAudio")
        setIsDebating(true)
      }

      const { character, content } = message
      console.log(`Playing audio for ${character}...`)
      setIsLoadingAudio(true)
      setCurrentSpeaker(character)
      setIsAudioLoaded(false)

      // Set status message based on what's happening
      if (message.responseType === "Opening Remarks") {
        setStatusMessage(`${personas[character]?.name} - Opening Remarks`)
      } else {
        setStatusMessage(`${personas[character]?.name} - ${message.responseType || "Speaking"}`)
      }

      // Set the next speaker for the thinking UI
      const nextIndex = currentIndex + 1
      if (nextIndex < allMessages.length && allMessages[nextIndex].character !== "user") {
        setNextSpeaker(allMessages[nextIndex].character)
      } else {
        // If there's no next message, set the next speaker to the opposite character
        setNextSpeaker(character === char1 ? char2 : char1)
      }

      try {
        // Create a new audio element
        const audio = new Audio()
        currentAudioRef.current = audio

        // Get the voice for this character
        const voice = getVoiceForCharacter(character)
        console.log(`Using voice "${voice}" for ${character}`)

        // Use the provided audioUrl if available, otherwise generate new audio
        if (message.audioUrl) {
          // Fix the audio URL - use /api/speak instead of stream-audio-realtime
          if (message.audioUrl.includes("stream-audio-realtime")) {
            console.log("Converting stream-audio-realtime URL to /api/speak")
            // Generate new audio using the correct endpoint
            const response = await fetch("/api/speak", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: content,
                voice,
              }),
            })

            if (!response.ok) {
              throw new Error(`Speak API returned ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()
            audio.src = data.audioUrl
          } else {
            audio.src = message.audioUrl
          }
        } else {
          // Generate audio for the current speaker
          const response = await fetch("/api/speak", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: content,
              voice,
            }),
          })

          if (!response.ok) {
            throw new Error(`Speak API returned ${response.status}: ${response.statusText}`)
          }

          const data = await response.json()
          audio.src = data.audioUrl
        }

        audio.volume = volume

        // Set up event handlers
        audio.oncanplaythrough = () => {
          console.log(`${character} audio loaded successfully`)
          setIsAudioLoaded(true)
          setIsLoadingAudio(false)
        }

        audio.onplay = () => {
          console.log(`${character} audio playing`)
          setIsPlaying(true)
          setStatusMessage(`${personas[character]?.name} is speaking...`)
        }

        audio.onended = () => {
          console.log(`${character} audio playback ended`)
          setIsPlaying(false)
          setIsAudioLoaded(false)
          setStatusMessage("")

          // Play the next message if it exists and is not a user message
          const nextIndex = currentIndex + 1
          if (nextIndex < allMessages.length) {
            const nextMessage = allMessages[nextIndex]
            if (nextMessage.character !== "user") {
              // No delay between speakers
              if (isAutoplaying) {
                playDebateAudio(nextMessage, allMessages, nextIndex)
              } else {
                setCurrentSpeaker(null)
              }
            }
          } else {
            setCurrentSpeaker(null)
            setNextSpeaker(null)

            // Check if we've completed an exchange (both characters have spoken)
            // An exchange is complete when we've heard from both characters
            if (currentIndex > 0 && currentIndex % 2 === 1) {
              // Calculate exchange count - start at 1 instead of 0
              const newExchangeCount = Math.floor((currentIndex + 1) / 2)
              // Ensure we start counting from 1
              const displayExchangeCount = Math.max(1, newExchangeCount)
              setExchangeCount(displayExchangeCount)
              console.log(`Completed exchange ${displayExchangeCount} of ${maxExchanges}`)

              // If we've reached the maximum exchanges, stop auto-playing and end debate
              if (displayExchangeCount >= maxExchanges) {
                setIsAutoplaying(false)
                console.log(`Reached ${maxExchanges} exchanges, ending debate`)
                setTimeout(() => {
                  resetDebateState()
                }, 2000) // Give a moment before resetting
              }
            }
          }
        }

        audio.onerror = (e) => {
          const errorDetails = audio.error ? `${audio.error.code}: ${audio.error.message}` : "Unknown error"
          console.error(`${character} audio error:`, errorDetails)
          setAudioError(`${character} audio error: ${errorDetails}`)
          setIsLoadingAudio(false)
          setIsPlaying(false)
          setIsAudioLoaded(false)
          setCurrentSpeaker(null)
          setStatusMessage("")
        }

        // Load the audio
        audio.load()

        // Play the audio
        await audio.play()
      } catch (err) {
        console.error(`Error playing ${character} audio:`, err)
        setAudioError(`Error playing ${character} audio: ${err.message}`)
        setIsLoadingAudio(false)
        setIsPlaying(false)
        setIsAudioLoaded(false)
        setCurrentSpeaker(null)
        setStatusMessage("")
      }
    },
    [getVoiceForCharacter, isAutoplaying, maxExchanges, volume, char1, char2, resetDebateState, personas],
  )

  // Main debate starting function (without introduction)
  const startDebateMain = useCallback(
    async (topic) => {
      // Prevent multiple simultaneous starts
      if (isStarting || isDebating) {
        console.log("Debate already starting or in progress, ignoring duplicate start")
        return
      }

      console.log("Starting debate with topic:", topic)
      setIsStarting(true)
      resetDebateState(false) // Pass false to prevent calling onDebateEnd
      setCurrentTopic(topic)
      setIsDebating(true)
      setIsProcessing(true)
      setIsSettingUp(true)
      setStatusMessage("Preparing debate...")

      // Set the current speaker to character1 immediately to show the correct image
      setCurrentSpeaker(char1)

      // Ensure audio is unlocked
      await unlockAudio()

      try {
        const response = await fetch("/api/start-debate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            character1: char1,
            character2: char2,
            topic,
            format: debateFormat,
            historicalContext,
          }),
        })

        if (!response.ok) throw new Error("Failed to start debate")

        const data = await response.json()
        console.log("Debate started with data:", data)

        // Store the debate messages
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

        setDebateMessages(messages)
        setIsSettingUp(false)

        // Set the next speaker to be character2 (for the thinking UI)
        setNextSpeaker(char2)

        // Play the first character's audio and preload the second character's audio
        playDebateAudio(messages[0], messages, 0)
      } catch (error) {
        console.error("Error starting debate:", error)
        setIsDebating(false)
        setIsSettingUp(false)
        setAudioError(`Failed to start debate: ${error.message}`)
      } finally {
        setIsProcessing(false)
        setIsStarting(false)
      }
    },
    [
      char1,
      char2,
      debateFormat,
      historicalContext,
      resetDebateState,
      unlockAudio,
      isStarting,
      isDebating,
      playDebateAudio,
    ],
  )

  // Start a debate on a specific topic
  const startDebate = useCallback(
    async (topic) => {
      console.log("startDebate called with topic:", topic)
      console.log("Characters:", char1, char2)
      console.log("Dependencies loaded:", dependenciesLoaded)
      // Skip introduction for faster start
      startDebateMain(topic)
    },
    [startDebateMain],
  )

  // Add this function to toggle auto-play
  const toggleAutoplay = useCallback(() => {
    setIsAutoplaying(!isAutoplaying)

    // If we're pausing, pause the current audio
    if (isAutoplaying && currentAudioRef.current) {
      currentAudioRef.current.pause()
      setIsPlaying(false)
    } else if (!isAutoplaying && currentAudioRef.current) {
      // If we're resuming, play the current audio
      currentAudioRef.current.play()
      setIsPlaying(true)
    }
  }, [isAutoplaying])

  // Handle character changes (only for non-embedded mode)
  const handleCharacter1Change = useCallback(
    (newCharacter) => {
      if (!embedded && newCharacter !== char1) {
        setChar1(newCharacter)
        // Reset debate if a debate is in progress
        if (isDebating) {
          resetDebateState()
        }
      }
    },
    [char1, isDebating, resetDebateState, embedded],
  )

  const handleCharacter2Change = useCallback(
    (newCharacter) => {
      if (!embedded && newCharacter !== char2) {
        setChar2(newCharacter)
        // Reset debate if a debate is in progress
        if (isDebating) {
          resetDebateState()
        }
      }
    },
    [char2, isDebating, resetDebateState, embedded],
  )

  // Submit a custom question to the debate
  const submitCustomQuestion = useCallback(
    async (userQuestion) => {
      if (!userQuestion.trim() || isProcessing) return

      setIsProcessing(true)
      setIsSettingUp(true)

      // If no debate is in progress, start one with the custom question as the topic
      if (!isDebatingRef.current || !topicRef.current) {
        setCurrentTopic(userQuestion)
        setIsDebating(true)

        try {
          const response = await fetch("/api/start-debate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              character1: char1,
              character2: char2,
              topic: userQuestion,
              format: debateFormat,
              historicalContext,
            }),
          })

          if (!response.ok) throw new Error("Failed to start debate")

          const data = await response.json()
          console.log("Debate started with data:", data)

          // Store the debate messages
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

          setDebateMessages(messages)
          setIsSettingUp(false)

          // Set the next speaker to be character2 (for the thinking UI)
          setNextSpeaker(char2)

          // Play the first character's audio and preload the second character's audio
          playDebateAudio(messages[0], messages, 0)
        } catch (error) {
          console.error("Error starting debate:", error)
          setIsDebating(false)
          setIsSettingUp(false)
          setAudioError(`Failed to start debate: ${error.message}`)
        } finally {
          setIsProcessing(false)
        }
        return
      }

      // If a debate is already in progress, add the question to it
      // Add user question as a special message
      const updatedMessages = [
        ...debateMessagesRef.current,
        {
          character: "user",
          content: userQuestion,
          timestamp: Date.now(),
        },
      ]

      setDebateMessages(updatedMessages)

      try {
        const response = await fetch("/api/continue-debate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            character1: char1,
            character2: char2,
            userQuestion,
            currentMessages: debateMessagesRef.current,
            format: debateFormat,
            historicalContext,
          }),
        })

        if (!response.ok) throw new Error("Failed to continue debate")

        const data = await response.json()

        // Calculate the current response number
        const currentExchangeCount = Math.floor(updatedMessages.length / 2) + 1

        // Add responses
        const newMessages = [
          {
            character: char1,
            content: data.response1,
            timestamp: Date.now() + 100,
            audioUrl: data.audioUrl1,
            responseType: `Response ${currentExchangeCount}`,
          },
          {
            character: char2,
            content: data.response2,
            timestamp: Date.now() + 200,
            audioUrl: data.audioUrl2,
            responseType: `Response ${currentExchangeCount}`,
          },
        ]

        const allMessages = [...updatedMessages, ...newMessages]
        setDebateMessages(allMessages)
        setIsSettingUp(false)

        // Set the next speaker to be character2 (for the thinking UI)
        setNextSpeaker(char2)

        // Play the first character's response
        playDebateAudio(newMessages[0], allMessages, updatedMessages.length)
      } catch (error) {
        console.error("Error continuing debate:", error)
        setAudioError(`Failed to continue debate: ${error.message}`)
        setIsSettingUp(false)
      } finally {
        setIsProcessing(false)
      }
    },
    [char1, char2, debateFormat, historicalContext, isProcessing],
  )

  // Function to prepare next exchange during playback
  const prepareNextExchange = useCallback(() => {
    // Only prepare if we're debating and not already processing
    if (!isDebatingRef.current || isProcessing || isPreparing || !isBrowser) return

    console.log("Preparing next exchange...")
    setIsPreparing(true)

    // Use the topic from the ref to ensure it's always available
    const topic = topicRef.current

    // Validate that we have a topic
    if (!topic) {
      console.error("Cannot prepare next exchange: No topic specified")
      setIsPreparing(false)
      return
    }

    // Use the messages from the ref to ensure they're always available
    const messages = debateMessagesRef.current

    // Validate that we have messages
    if (!messages || messages.length === 0) {
      console.error("Cannot prepare next exchange: No previous messages")
      setIsPreparing(false)
      return
    }

    // Get the correct voices for both characters
    const voice1 = getVoiceForCharacter(char1)
    const voice2 = getVoiceForCharacter(char2)
    console.log(`Preparing with voices: ${char1}=${voice1}, ${char2}=${voice2}`)

    // Prepare the request data
    const data = {
      character1: char1,
      character2: char2,
      currentMessages: messages,
      topic: topic,
      format: debateFormat,
      historicalContext,
      isPreparing: true,
      voice1,
      voice2,
    }

    fetch("/api/auto-continue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }
        return response.json()
      })
      .then((responseData) => {
        console.log("Successfully prepared next exchange")
        // Store the prepared responses in localStorage
        const preparedData = {
          response1: responseData.response1,
          response2: responseData.response2,
          audioUrl1: responseData.audioUrl1,
          audioUrl2: responseData.audioUrl2,
          timestamp: Date.now(),
        }
        try {
          localStorage.setItem("preparedExchange", JSON.stringify(preparedData))
        } catch (e) {
          console.error("Error storing prepared exchange:", e)
        }
      })
      .catch((error) => {
        console.error("Error preparing next exchange:", error)
      })
      .finally(() => {
        setIsPreparing(false)
      })
  }, [char1, char2, debateFormat, historicalContext, isProcessing, isPreparing, getVoiceForCharacter])

  // Update the continueDebate function to use prepared exchange if available
  const continueDebate = useCallback(async () => {
    // Check if isDebating is false and log it
    if (!isDebatingRef.current) {
      console.log("isDebating is false, forcing it to true")
      setIsDebating(true)
      // Add a small delay to ensure state updates before proceeding
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (isProcessing) {
      console.log("Cannot continue debate: isProcessing =", isProcessing)
      return
    }

    // Use the topic from the ref to ensure it's always available
    const topic = topicRef.current

    // Validate that we have a topic
    if (!topic) {
      console.error("Cannot continue debate: No topic specified")
      setAudioError("Cannot continue debate: No topic specified. Please select a topic or ask a question.")
      return
    }

    // Use the messages from the ref to ensure they're always available
    const messages = debateMessagesRef.current

    // Validate that we have messages
    if (!messages || messages.length === 0) {
      console.error("Cannot continue debate: No previous messages")
      setAudioError("Cannot continue debate: No previous messages. Please start a new debate.")
      return
    }

    console.log("Starting next exchange with topic:", topic)
    console.log("Current messages length:", messages.length)
    setIsProcessing(true)
    setIsSettingUp(true)
    setAudioError(null) // Clear any previous errors

    // Check if we have a prepared exchange
    let usePreparedExchange = false
    let preparedExchange = null

    if (isBrowser) {
      try {
        const preparedExchangeJson = localStorage.getItem("preparedExchange")
        if (preparedExchangeJson) {
          preparedExchange = JSON.parse(preparedExchangeJson)
          // Check if the prepared exchange is still valid (less than 5 minutes old)
          if (preparedExchange && Date.now() - preparedExchange.timestamp < 5 * 60 * 1000) {
            usePreparedExchange = true
          }
        }
      } catch (e) {
        console.error("Error parsing prepared exchange:", e)
      }
    }

    try {
      let responseData

      if (usePreparedExchange) {
        console.log("Using prepared exchange")
        responseData = preparedExchange
        // Clear the prepared exchange
        try {
          localStorage.removeItem("preparedExchange")
        } catch (e) {
          console.error("Error removing prepared exchange:", e)
        }
      } else {
        // Prepare the request data
        const data = {
          character1: char1,
          character2: char2,
          currentMessages: messages,
          topic: topic,
          format: debateFormat,
          historicalContext,
        }

        // Store the request data for debugging
        setRequestData(data)

        console.log("Sending data to auto-continue API:", JSON.stringify(data, null, 2))

        const response = await fetch("/api/auto-continue", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        // Check for non-200 response
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API returned ${response.status}: ${errorText}`)
          throw new Error(`API returned ${response.status}: ${errorText}`)
        }

        responseData = await response.json()
      }

      console.log("Received new debate responses:", responseData)

      // Calculate the current response number based on total exchanges
      const currentExchangeCount = Math.floor(messages.length / 2) + 1

      // Add responses
      const newMessages = [
        {
          character: char1,
          content: responseData.response1,
          timestamp: Date.now() + 100,
          audioUrl: responseData.audioUrl1,
          responseType: `Response ${currentExchangeCount}`,
        },
        {
          character: char2,
          content: responseData.response2,
          timestamp: Date.now() + 200,
          audioUrl: responseData.audioUrl2,
          responseType: `Response ${currentExchangeCount}`,
        },
      ]

      const allMessages = [...messages, ...newMessages]
      setDebateMessages(allMessages)
      setRetryCount(0) // Reset retry count on success
      setIsSettingUp(false)

      // Set the next speaker to be character2 (for the thinking UI)
      setNextSpeaker(char2)

      // Play the first character's response
      playDebateAudio(newMessages[0], allMessages, messages.length)
    } catch (error) {
      console.error("Error continuing debate:", error)
      setLastError(error.message)
      setIsSettingUp(false)

      // Implement retry logic
      if (retryCount < 3) {
        const newRetryCount = retryCount + 1
        setRetryCount(newRetryCount)
        setAudioError(
          `Failed to continue debate (attempt ${newRetryCount}/3): ${error.message}. Retrying in 3 seconds...`,
        )

        // Retry after a delay
        setTimeout(() => {
          if (isDebatingRef.current) {
            console.log(`Retry attempt ${newRetryCount}/3...`)
            continueDebate()
          }
        }, 3000)
      } else {
        setAudioError(`Failed to continue debate after 3 attempts: ${error.message}. Please try manually continuing.`)
      }
    } finally {
      setIsProcessing(false)
    }
  }, [char1, char2, debateFormat, historicalContext, isProcessing, retryCount])

  // Function to manually force continue the debate
  const forceNextExchange = useCallback(async () => {
    // Reset retry count and clear errors
    setRetryCount(0)
    setAudioError(null)
    setLastError(null)

    // Force isDebating to true
    setIsDebating(true)

    // Wait a moment to ensure state is updated
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Try to continue the debate
    continueDebate()
  }, [continueDebate])

  // Function to download the debate transcript
  const downloadTranscript = useCallback(() => {
    if (!isBrowser || debateMessagesRef.current.length === 0) return

    let transcript = `Debate on ${topicRef.current}\n\n`

    debateMessagesRef.current.forEach((msg) => {
      if (msg.character === "user") {
        transcript += `Question: ${msg.content}\n\n`
      } else {
        const speaker = msg.character === char1 ? character1Obj.name : character2Obj.name
        const responseLabel = msg.responseType || ""
        transcript += `${speaker} ${responseLabel}: ${msg.content}\n\n`
      }
    })

    const blob = new Blob([transcript], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `debate-${topicRef.current.replace(/\s+/g, "-").toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [character1Obj?.name, character2Obj?.name, char1, char2])

  const preloadNextAudio = useCallback(
    async (message, allMessages, nextIndex) => {
      // Check for valid inputs
      if (!message || !message.character || !message.content) {
        console.error("Invalid message for preloading:", message)
        setIsPreloadingAudio(false)
        return
      }

      const { character, content } = message
      console.log(`Preloading audio for next speaker ${character}...`)
      setIsPreloadingAudio(true)

      try {
        // Get the voice for this character
        const voice = getVoiceForCharacter(character)
        console.log(`Using voice "${voice}" for preloading ${character}`)

        // Generate audio for the next speaker
        const response = await fetch("/api/speak", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: content,
            voice,
          }),
        })

        if (!response.ok) {
          throw new Error(`Speak API returned ${response.status} for preloading`)
        }

        const data = await response.json()

        // Store the preloaded audio URL
        setNextAudioData({
          character,
          audioUrl: data.audioUrl,
          index: nextIndex,
        })

        console.log(`Successfully preloaded audio for ${character}`)
      } catch (err) {
        console.error(`Error preloading audio for ${character}`, err)
      } finally {
        setIsPreloadingAudio(false)
      }
    },
    [getVoiceForCharacter],
  )

  // Function to play topic introduction
  const playTopicIntroduction = useCallback(
    async (topic) => {
      if (!introAudioRef.current || !topic) return

      setIsIntroPlaying(true)
      setIsSettingUp(true)
      setStatusMessage("Preparing introduction...")

      // Start preparing the debate in parallel
      const debatePromise = fetch("/api/start-debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1: char1,
          character2: char2,
          topic,
          format: debateFormat,
          historicalContext,
        }),
      })

      try {
        const response = await fetch("/api/generate-topic-introduction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            character1: char1,
            character2: char2,
            topic,
          }),
        })

        if (!response.ok) throw new Error("Failed to generate introduction")

        const data = await response.json()

        // Play the introduction audio
        introAudioRef.current.src = data.audioUrl
        introAudioRef.current.load()

        introAudioRef.current.oncanplaythrough = () => {
          console.log("Introduction audio loaded successfully")
        }

        introAudioRef.current.onplay = () => {
          console.log("Introduction audio playing")
          setStatusMessage("Playing introduction...")
        }

        introAudioRef.current.onended = async () => {
          console.log("Introduction audio ended")
          setIsIntroPlaying(false)
          setHasIntroduction(true)

          // Get the debate data that was being prepared in parallel
          try {
            const debateResponse = await debatePromise
            if (!debateResponse.ok) throw new Error("Failed to start debate")

            const debateData = await debateResponse.json()
            console.log("Debate prepared during intro:", debateData)

            // Continue with the debate using the prepared data
            continueWithPreparedDebate(topic, debateData)
          } catch (error) {
            console.error("Error preparing debate during intro:", error)
            // Fall back to regular debate start
            startDebateAfterIntro(topic)
          }
        }

        introAudioRef.current.onerror = (e) => {
          console.error("Introduction audio error:", e)
          setIsIntroPlaying(false)
          // Start debate anyway if intro fails
          startDebateAfterIntro(topic)
        }

        await introAudioRef.current.play()
      } catch (error) {
        console.error("Error playing introduction:", error)
        setIsIntroPlaying(false)
        // Start debate anyway if intro fails
        startDebateAfterIntro(topic)
      }
    },
    [char1, char2, debateFormat, historicalContext],
  )

  // Add a new function to continue with prepared debate data
  const continueWithPreparedDebate = useCallback(
    (topic, data) => {
      resetDebateState()
      setCurrentTopic(topic)
      setIsDebating(true)
      setIsSettingUp(false)

      // Store the debate messages
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

      setDebateMessages(messages)

      // Set the next speaker to be character2 (for the thinking UI)
      setNextSpeaker(char2)

      // Play the first character's audio and preload the second character's audio
      playDebateAudio(messages[0], messages, 0)
    },
    [char1, char2, resetDebateState],
  )

  // Start debate after introduction
  const startDebateAfterIntro = useCallback((topic) => {
    startDebateMain(topic)
  }, [])

  // Fixed height container for the entire interface
  const containerStyle = {
    minHeight: embedded ? "auto" : "calc(100vh - 2rem)", // Subtract padding
    display: "flex",
    flexDirection: "column",
  }

  // Fixed height for the main content area
  const mainContentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  }

  // Show loading state while dependencies are loading
  if (!dependenciesLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-yellow-400">Loading debate interface...</p>
          {loadingError && <p className="text-red-400 mt-2">Error: {loadingError}</p>}
          <p className="text-gray-400 mt-2 text-sm">Dependencies loaded: {dependenciesLoaded ? "Yes" : "No"}</p>
          <p className="text-gray-400 text-sm">Personas: {Object.keys(personas).length} loaded</p>
          <p className="text-gray-400 text-sm">Debate state: {debateState ? "Loaded" : "Not loaded"}</p>
        </div>
      </div>
    )
  }

  // Show error state if dependencies failed to load
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

  // Add a try-catch block around the return statement
  try {
    return (
      <div
        className={`${embedded ? "" : "container mx-auto py-8 px-4 max-w-6xl"} bg-gray-900 text-white`}
        style={containerStyle}
      >
        {!embedded && (
          <DebateHeader
            character1={char1}
            character2={char2}
            currentSpeaker={currentSpeaker}
            isPlaying={isPlaying}
            isLoadingAudio={isLoadingAudio}
            isPreparing={isPreparing}
            isIntroPlaying={isIntroPlaying}
            debateMessages={debateMessages}
            currentTopic={currentTopic}
            speakerStatus={isLoadingAudio ? "thinking" : isPreparing ? "preparing" : isPlaying ? "speaking" : null}
            isAutoplaying={isAutoplaying}
            isDebating={isDebating}
            onToggleAutoplay={toggleAutoplay}
            onCharacter1Change={handleCharacter1Change}
            onCharacter2Change={handleCharacter2Change}
          />
        )}

        <div style={mainContentStyle}>
          {isLoadingVoices && (
            <div className="mb-4 p-4 bg-yellow-800 text-yellow-100 rounded-lg text-center">
              <div className="inline-block animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full mr-2"></div>
              Loading voice data... Please wait.
            </div>
          )}

          {/* Display any errors */}
          {audioError && (
            <div className="mb-4 p-4 bg-red-900 text-red-100 rounded-lg">
              <p className="font-bold">Error:</p>
              <p>{audioError}</p>
              {retryCount > 0 && retryCount < 3 && <p className="mt-2">Retrying automatically ({retryCount}/3)...</p>}
            </div>
          )}

          {/* Embedded Debate Status - Show for both embedded and non-embedded when debating */}
          {isDebating && (
            <div className="mb-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-yellow-400">
                    {character1Obj?.name} vs {character2Obj?.name}
                  </h2>
                  <button
                    onClick={resetDebateState}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                  >
                    End Debate
                  </button>
                </div>

                {currentTopic && <p className="text-gray-300 mb-4">Topic: {currentTopic}</p>}

                {/* Enhanced Status Display */}
                <div className="flex items-center justify-between">
                  {/* Current Speaker Display */}
                  <div className="flex items-center space-x-4">
                    {currentSpeaker && (
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-yellow-400">
                          <img
                            src={personas[currentSpeaker]?.image || "/placeholder.svg"}
                            alt={personas[currentSpeaker]?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-yellow-400">{personas[currentSpeaker]?.name}</p>
                          <p className="text-xs text-gray-400">
                            {statusMessage || (isLoadingAudio ? "Thinking..." : isPlaying ? "Speaking..." : "Ready")}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Next Speaker Preview */}
                    {nextSpeaker && nextSpeaker !== currentSpeaker && (
                      <div className="flex items-center space-x-2 opacity-60">
                        <span className="text-xs text-gray-500">Next:</span>
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <img
                            src={personas[nextSpeaker]?.image || "/placeholder.svg"}
                            alt={personas[nextSpeaker]?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-gray-500">{personas[nextSpeaker]?.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleAutoplay}
                      className={`px-3 py-1 rounded text-sm ${
                        isAutoplaying ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"
                      } text-white`}
                    >
                      {isAutoplaying ? "Auto" : "Manual"}
                    </button>

                    {exchangeCount > 0 && (
                      <span className="text-sm text-gray-400">
                        Exchange {exchangeCount}/{maxExchanges}
                      </span>
                    )}

                    {(isSettingUp || isPreparing) && (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-yellow-400">
                          {isSettingUp ? "Setting up..." : isPreparing ? "Preparing..." : "Processing..."}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Topic Selector - Only show when not debating and not playing intro */}
          {!isDebating && !isIntroPlaying && !embedded && dependenciesLoaded && (
            <div className="mb-8">
              <EmbeddedTopicSelector onSelectTopic={startDebate} character1={char1} character2={char2} />
            </div>
          )}

          {/* Setup animation with dynamic status */}
          {(isSettingUp || isPreparing) && !embedded && (
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

          {/* Voice Input for Custom Questions */}
          {embedded && isDebating && (
            <div className="mb-8 flex justify-center">
              <VoiceInput onSubmit={() => {}} buttonText="Ask Custom Question" />
            </div>
          )}

          {/* Return to Home button (only for non-embedded) */}
          {!embedded && (
            <div className="mt-auto mb-4 text-center">
              <a href="/" className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full">
                Return to Home
              </a>
            </div>
          )}
        </div>

        {/* Audio elements - hidden by default, visible in debug mode */}
        <audio ref={silentAudioRef} preload="auto" className="hidden" />
        <audio ref={introAudioRef} preload="auto" className="hidden" />
        <audio ref={char1AudioRef} preload="auto" className="hidden" />
        <audio ref={char2AudioRef} preload="auto" className="hidden" />

        <style jsx global>{`
          @keyframes soundwave {
            0%,
            100% {
              height: 4px;
            }
            50% {
              height: 16px;
            }
          }
          
          @keyframes micPass {
            0% {
              transform: translateX(-50px) rotate(-30deg);
              opacity: 0;
            }
            50% {
              transform: translateX(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateX(50px) rotate(30deg);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    )
  } catch (error) {
    console.error("Render error:", error)
    setHasError(true)

    // Fallback UI
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl bg-gray-900 text-white">
        <h1 className="text-3xl font-bold text-center mb-4 text-yellow-400">Historical Debates</h1>
        <div className="bg-red-900 text-white p-4 rounded-lg mb-4">
          <p className="font-bold">An error occurred</p>
          <p>Please refresh the page to continue.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Refresh Page
          </button>
        </div>
        {!embedded && (
          <div className="text-center">
            <a href="/" className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full">
              Return to Home
            </a>
          </div>
        )}
      </div>
    )
  }
}

export default DebateInterface
