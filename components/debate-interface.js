"use client"

import { useState, useEffect, useRef } from "react"
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

  // Helper functions to update both state and refs
  const updateCurrentTopic = (topic) => {
    setCurrentTopic(topic)
    topicRef.current = topic
    console.log("Topic updated to:", topic)
    if (!embedded && debateState) debateState.saveTopic(topic)
  }

  const updateIsDebating = (debating) => {
    setIsDebating(debating)
    isDebatingRef.current = debating
    console.log("isDebating updated to:", debating)
    if (!embedded && debateState) debateState.saveIsDebating(debating)
  }

  const updateDebateMessages = (messages) => {
    setDebateMessages(messages)
    debateMessagesRef.current = messages
    console.log("debateMessages updated, length:", messages.length)
    if (!embedded && debateState) debateState.saveMessages(messages)
  }

  const updateExchangeCount = (count) => {
    setExchangeCount(count)
    exchangeCountRef.current = count
    console.log("exchangeCount updated to:", count)
    if (!embedded && debateState) debateState.saveExchangeCount(count)
  }

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

  // Refs - these should maintain state during debates
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

  const [currentAudioUrls, setCurrentAudioUrls] = useState({ char1: "", char2: "" })

  // Get character objects
  const character1Obj = personas[char1]
  const character2Obj = personas[char2]

  // Update refs ONLY when state actually changes and we're not resetting

  useEffect(() => {
    if (!embedded && debateState) {
      debateState.saveCharacters(char1, char2)
    }
  }, [char1, char2, embedded, debateState])

  // Track speaker changes for visual feedback
  useEffect(() => {
    if (currentSpeaker && displayedSpeaker !== currentSpeaker) {
      setDisplayedSpeaker(currentSpeaker)
    }
  }, [currentSpeaker, displayedSpeaker])

  // Load dependencies
  useEffect(() => {
    async function loadDependencies() {
      if (!isBrowser) return

      try {
        console.log("Loading dependencies...")

        const personasModule = await import("../lib/personas")
        const personasData = personasModule.personas
        console.log("Personas loaded:", personasData)

        const debateStateModule = await import("../lib/debate-state")
        console.log("Debate state module loaded:", debateStateModule)

        setPersonas(personasData)
        setDebateState(debateStateModule)

        const defaultState = {
          character1: character1 || Object.keys(personasData)[0] || "daVinci",
          character2: character2 || Object.keys(personasData)[1] || "socrates",
          isDebating: false,
          messages: [],
          topic: initialTopic || "",
          exchangeCount: 0,
        }

        setChar1(defaultState.character1)
        setChar2(defaultState.character2)
        updateIsDebating(defaultState.isDebating)
        updateDebateMessages(defaultState.messages)
        updateCurrentTopic(defaultState.topic)
        updateExchangeCount(defaultState.exchangeCount)
        setInitialStateLoaded(true)
        setDependenciesLoaded(true)

        console.log("Dependencies loaded successfully!")
      } catch (error) {
        console.error("Error loading dependencies:", error)
        setLoadingError(error.message)
      }
    }

    loadDependencies()
  }, [character1, character2, initialTopic])

  // Load voice IDs
  useEffect(() => {
    async function loadVoiceIds() {
      if (!personas || Object.keys(personas).length === 0) return

      try {
        const response = await fetch("/api/get-voice-ids")
        if (response.ok) {
          const data = await response.json()
          setVoiceIds(data)
          console.log("Voice IDs loaded:", data)

          Object.keys(personas).forEach((key) => {
            const voiceKey = key === "daVinci" ? "davinci" : key.toLowerCase()
            if (data[voiceKey]) {
              personas[key].voiceId = data[voiceKey]
              console.log(`Updated voice ID for ${key}: ${data[voiceKey]}`)
            }
          })

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
    }

    loadVoiceIds()
  }, [personas])

  // Initialize audio elements
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
  }, [])

  // Audio unlock function
  async function unlockAudio() {
    if (isUnlockingAudio || audioInitialized) {
      console.log("Audio already unlocked or unlocking in progress")
      return
    }

    console.log("Attempting to unlock audio...")
    setIsUnlockingAudio(true)
    setAudioError(null)

    try {
      const unlockElement = new Audio()
      unlockElement.src = "/silent.mp3"
      unlockElement.load()

      await unlockElement.play()
      console.log("Silent audio played successfully - audio unlocked")
      setAudioInitialized(true)

      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (err) {
      console.error("Failed to play silent audio:", err)
      setAudioError(`Failed to unlock audio: ${err.message}`)
    } finally {
      setIsUnlockingAudio(false)
    }
  }

  // Initialize audio on user interaction
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
  }, [audioInitialized, isUnlockingAudio])

  // Reset debate state - ONLY clear refs when actually ending debate
  function resetDebateState(shouldCallOnDebateEnd = true) {
    console.log("Resetting debate state, shouldCallOnDebateEnd:", shouldCallOnDebateEnd)

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
  }

  // Generate character-specific topics
  async function generateCharacterSpecificTopics() {
    if (isGeneratingTopics || !isBrowser) return

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
      const limitedTopics = data.topics.slice(0, 2)
      setCharacterSpecificTopics(limitedTopics)

      try {
        localStorage.setItem(topicKey, JSON.stringify(limitedTopics))
      } catch (e) {
        console.error("Error storing topics in localStorage:", e)
      }
    } catch (error) {
      console.error("Error generating character-specific topics:", error)
      setCharacterSpecificTopics(staticDebateTopics)
    } finally {
      setIsGeneratingTopics(false)
    }
  }

  // Generate topics when characters change
  useEffect(() => {
    if (isBrowser && initialStateLoaded && !isDebating) {
      // Only reset if we're not currently debating
      resetDebateState(true) // Full reset when characters change
      generateCharacterSpecificTopics()
    }
  }, [char1, char2, initialStateLoaded, isDebating])

  // Get voice for character
  function getVoiceForCharacter(characterId) {
    if (!personas[characterId]) {
      console.log(`Character ${characterId} not found in personas`)
      return "echo"
    }

    if (personas[characterId].voiceId) {
      console.log(`Using direct voiceId property for ${characterId}: ${personas[characterId].voiceId}`)
      return personas[characterId].voiceId
    }

    if (typeof personas[characterId].getVoiceId === "function") {
      const voiceId = personas[characterId].getVoiceId()
      console.log(`Using getVoiceId() method for ${characterId}: ${voiceId}`)
      return voiceId
    }

    const voiceKey = characterId === "daVinci" ? "davinci" : characterId.toLowerCase()
    if (voiceIds[voiceKey]) {
      console.log(`Using voiceIds state for ${characterId}: ${voiceIds[voiceKey]}`)
      return voiceIds[voiceKey]
    }

    console.log(`No voice ID found for ${characterId}, using default`)
    return characterId === "frida" ? "nova" : "echo"
  }

  // Enhanced play debate audio with visuals and auto-continue
  async function playDebateAudio(message, allMessages, currentIndex) {
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      console.log("Audio already playing, skipping duplicate play request")
      return
    }

    const { character, content } = message
    console.log(`Playing audio for ${character}...`)

    setIsLoadingAudio(true)
    setCurrentSpeaker(character)
    setIsAudioLoaded(false)

    if (message.responseType === "Opening Remarks") {
      setStatusMessage(`${personas[character]?.name} - Opening Remarks`)
    } else {
      setStatusMessage(`${personas[character]?.name} - ${message.responseType || "Speaking"}`)
    }

    const nextIndex = currentIndex + 1
    if (nextIndex < allMessages.length && allMessages[nextIndex].character !== "user") {
      setNextSpeaker(allMessages[nextIndex].character)
    } else {
      setNextSpeaker(character === char1 ? char2 : char1)
    }

    try {
      const audio = new Audio()
      currentAudioRef.current = audio

      const voice = getVoiceForCharacter(character)
      console.log(`Using voice "${voice}" for ${character}`)

      if (message.audioUrl) {
        if (message.audioUrl.includes("stream-audio-realtime")) {
          console.log("Converting stream-audio-realtime URL to /api/speak")
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

        const nextIndex = currentIndex + 1
        if (nextIndex < allMessages.length) {
          const nextMessage = allMessages[nextIndex]
          if (nextMessage.character !== "user") {
            if (isAutoplaying) {
              // Small delay for better UX
              setTimeout(() => {
                playDebateAudio(nextMessage, allMessages, nextIndex)
              }, 1000)
            } else {
              setCurrentSpeaker(null)
            }
          }
        } else {
          setCurrentSpeaker(null)
          setNextSpeaker(null)

          if (currentIndex > 0 && currentIndex % 2 === 1) {
            const newExchangeCount = Math.floor((currentIndex + 1) / 2)
            const displayExchangeCount = Math.max(1, newExchangeCount)
            updateExchangeCount(displayExchangeCount)
            console.log(`Completed exchange ${displayExchangeCount} of ${maxExchanges}`)

            if (displayExchangeCount >= maxExchanges) {
              setIsAutoplaying(false)
              console.log(`Reached ${maxExchanges} exchanges, ending debate`)
              setTimeout(() => {
                resetDebateState(true) // Full reset when ending
              }, 2000)
            } else {
              // Auto-continue to next exchange
              console.log("Auto-continuing to next exchange...")
              setTimeout(() => {
                continueDebate()
              }, 2000)
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

      audio.load()
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
  }

  // Continue debate function for auto-progression
  async function continueDebate() {
    console.log("=== CONTINUE DEBATE CALLED ===")
    console.log("Current topic ref:", topicRef.current)
    console.log("Current isDebating ref:", isDebatingRef.current)
    console.log("Current messages ref length:", debateMessagesRef.current.length)

    if (isProcessing) {
      console.log("Cannot continue debate: isProcessing =", isProcessing)
      return
    }

    const topic = topicRef.current
    if (!topic) {
      console.error("Cannot continue debate: No topic specified, topicRef.current:", topicRef.current)
      setAudioError("Cannot continue debate: No topic specified. Please select a topic or ask a question.")
      return
    }

    const messages = debateMessagesRef.current
    if (!messages || messages.length === 0) {
      console.error("Cannot continue debate: No previous messages")
      setAudioError("Cannot continue debate: No previous messages. Please start a new debate.")
      return
    }

    console.log("Starting next exchange with topic:", topic)
    console.log("Current messages length:", messages.length)
    setIsProcessing(true)
    setIsSettingUp(true)
    setAudioError(null)

    try {
      const data = {
        character1: char1,
        character2: char2,
        currentMessages: messages,
        topic: topic,
        format: debateFormat,
        historicalContext,
      }

      setRequestData(data)
      console.log("Sending data to auto-continue API:", JSON.stringify(data, null, 2))

      const response = await fetch("/api/auto-continue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API returned ${response.status}: ${errorText}`)
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      const responseData = await response.json()
      console.log("Received new debate responses:", responseData)

      const currentExchangeCount = Math.floor(messages.length / 2) + 1

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
      updateDebateMessages(allMessages)
      setRetryCount(0)
      setIsSettingUp(false)
      setNextSpeaker(char2)

      playDebateAudio(newMessages[0], allMessages, messages.length)
    } catch (error) {
      console.error("Error continuing debate:", error)
      setLastError(error.message)
      setIsSettingUp(false)

      if (retryCount < 3) {
        const newRetryCount = retryCount + 1
        setRetryCount(newRetryCount)
        setAudioError(
          `Failed to continue debate (attempt ${newRetryCount}/3): ${error.message}. Retrying in 3 seconds...`,
        )

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
  }

  // Start debate main function
  async function startDebateMain(topic) {
    if (isStarting || isDebating) {
      console.log("Debate already starting or in progress, ignoring duplicate start")
      return
    }

    console.log("Starting debate with topic:", topic)
    setIsStarting(true)

    // Don't call resetDebateState here - just clear UI state
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

      playDebateAudio(messages[0], messages, 0)
    } catch (error) {
      console.error("Error starting debate:", error)
      updateIsDebating(false)
      setIsSettingUp(false)
      setAudioError(`Failed to start debate: ${error.message}`)
    } finally {
      setIsProcessing(false)
      setIsStarting(false)
    }
  }

  // Start debate function
  async function startDebate(topic) {
    console.log("=== START DEBATE CALLED ===")
    console.log("startDebate called with topic:", topic)

    if (!dependenciesLoaded || !initialStateLoaded) {
      console.log("Dependencies not ready, waiting...")
      updateCurrentTopic(topic)
      return
    }

    console.log("Starting debate immediately...")
    setTimeout(() => {
      startDebateMain(topic)
    }, 100)
  }

  // Toggle autoplay
  function toggleAutoplay() {
    setIsAutoplaying(!isAutoplaying)

    if (isAutoplaying && currentAudioRef.current) {
      currentAudioRef.current.pause()
      setIsPlaying(false)
    } else if (!isAutoplaying && currentAudioRef.current) {
      currentAudioRef.current.play()
      setIsPlaying(true)
    }
  }

  // Handle character changes
  function handleCharacter1Change(newCharacter) {
    if (!embedded && newCharacter !== char1) {
      setChar1(newCharacter)
      if (isDebating) {
        resetDebateState(true) // Full reset when changing characters
      }
    }
  }

  function handleCharacter2Change(newCharacter) {
    if (!embedded && newCharacter !== char2) {
      setChar2(newCharacter)
      if (isDebating) {
        resetDebateState(true) // Full reset when changing characters
      }
    }
  }

  // Submit custom question
  async function submitCustomQuestion(userQuestion) {
    if (!userQuestion.trim() || isProcessing) return

    setIsProcessing(true)
    setIsSettingUp(true)

    if (!isDebatingRef.current || !topicRef.current) {
      updateCurrentTopic(userQuestion)
      updateIsDebating(true)

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

        playDebateAudio(messages[0], messages, 0)
      } catch (error) {
        console.error("Error starting debate:", error)
        updateIsDebating(false)
        setIsSettingUp(false)
        setAudioError(`Failed to start debate: ${error.message}`)
      } finally {
        setIsProcessing(false)
      }
      return
    }

    // Continue existing debate logic would go here...
    setIsProcessing(false)
  }

  // Auto-start when dependencies loaded and topic available
  useEffect(() => {
    if (dependenciesLoaded && initialStateLoaded && currentTopic && !isDebating && !isStarting) {
      console.log("Auto-starting debate with topic:", currentTopic)
      setTimeout(() => {
        startDebateMain(currentTopic)
      }, 100)
    }
  }, [dependenciesLoaded, initialStateLoaded, currentTopic, isDebating, isStarting])

  // Show loading state
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
      {!embedded && (
        <DebateHeader
          character1={char1}
          character2={char2}
          currentSpeaker={displayedSpeaker}
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

        {audioError && (
          <div className="mb-4 p-4 bg-red-900 text-red-100 rounded-lg">
            <p className="font-bold">Error:</p>
            <p>{audioError}</p>
            {retryCount > 0 && retryCount < 3 && <p className="mt-2">Retrying automatically ({retryCount}/3)...</p>}
          </div>
        )}

        {isDebating && (
          <div className="mb-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-yellow-400">
                  {character1Obj?.name} vs {character2Obj?.name}
                </h2>
                <button
                  onClick={() => resetDebateState(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                >
                  End Debate
                </button>
              </div>

              {currentTopic && <p className="text-gray-300 mb-4">Topic: {currentTopic}</p>}

              <div className="flex items-center justify-between">
                {currentSpeaker && (
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div
                        className={`w-16 h-16 rounded-full overflow-hidden transition-all duration-300 ${
                          isPlaying
                            ? "ring-4 ring-yellow-400 ring-opacity-75 shadow-lg shadow-yellow-400/50"
                            : isLoadingAudio
                              ? "ring-4 ring-blue-400 ring-opacity-75"
                              : "ring-2 ring-gray-600"
                        }`}
                      >
                        <img
                          src={personas[currentSpeaker]?.image || "/placeholder.svg"}
                          alt={personas[currentSpeaker]?.name}
                          className={`w-full h-full object-cover transition-all duration-300 ${
                            isPlaying ? "scale-110" : isLoadingAudio ? "opacity-75" : ""
                          }`}
                        />
                        {isLoadingAudio && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        {isPlaying && (
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-400 opacity-10 animate-pulse"></div>
                        )}
                      </div>

                      {/* Pulsing ring animation when speaking */}
                      {isPlaying && (
                        <div className="absolute inset-0 rounded-full border-4 border-yellow-400 animate-ping opacity-75"></div>
                      )}
                    </div>

                    <div className="flex-1">
                      <p
                        className={`text-lg font-bold transition-colors duration-300 ${
                          isPlaying ? "text-yellow-300" : "text-yellow-400"
                        }`}
                      >
                        {personas[currentSpeaker]?.name}
                      </p>
                      <p
                        className={`text-sm transition-colors duration-300 ${
                          isLoadingAudio ? "text-blue-300" : isPlaying ? "text-yellow-200" : "text-gray-400"
                        }`}
                      >
                        {statusMessage || (isLoadingAudio ? "Thinking..." : isPlaying ? "Speaking..." : "Ready")}
                      </p>

                      {/* Enhanced sound wave animation */}
                      <div className="h-6 flex items-center mt-2">
                        {isPlaying && (
                          <div className="flex space-x-1">
                            {[...Array(8)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-1 bg-gradient-to-t from-yellow-500 to-orange-400 rounded-full animate-[soundwave_${0.4 + i * 0.1}s_ease-in-out_infinite_${i * 0.05}s]`}
                                style={{
                                  height: `${8 + (i % 3) * 4}px`,
                                  animationDelay: `${i * 0.1}s`,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DebateInterface
