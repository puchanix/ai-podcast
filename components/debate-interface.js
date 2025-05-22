"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { personas } from "../lib/personas"
import {
  initializeDebateState,
  saveTopic,
  saveMessages,
  saveIsDebating,
  saveCharacters,
  saveExchangeCount,
  clearDebateState,
} from "../lib/debate-state"
import { DebateHeader } from "./debate-header"
import { EmbeddedTopicSelector } from "./embedded-topic-selector"

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

export function DebateInterface() {
  // Initialize state with default values first
  const defaultState = {
    character1: Object.keys(personas)[0],
    character2: Object.keys(personas)[1],
    isDebating: false,
    messages: [],
    topic: "",
    exchangeCount: 0,
  }

  // Initialize state from localStorage or defaults
  const [initialStateLoaded, setInitialStateLoaded] = useState(false)
  const [character1, setCharacter1] = useState(defaultState.character1)
  const [character2, setCharacter2] = useState(defaultState.character2)
  const [isDebating, setIsDebating] = useState(defaultState.isDebating)
  const [debateMessages, setDebateMessages] = useState(defaultState.messages)
  const [currentTopic, setCurrentTopic] = useState(defaultState.topic)
  const [exchangeCount, setExchangeCount] = useState(defaultState.exchangeCount)

  // Voice state
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [voiceIds, setVoiceIds] = useState({})

  // Load initial state from localStorage on client-side only
  useEffect(() => {
    if (isBrowser && !initialStateLoaded) {
      const savedState = initializeDebateState()
      if (savedState.character1) setCharacter1(savedState.character1)
      if (savedState.character2) setCharacter2(savedState.character2)
      setIsDebating(savedState.isDebating)
      setDebateMessages(savedState.messages)
      setCurrentTopic(savedState.topic)
      setExchangeCount(savedState.exchangeCount)
      setInitialStateLoaded(true)
    }
  }, [initialStateLoaded])

  // UI state
  const [customQuestion, setCustomQuestion] = useState("")
  const [debateFormat, setDebateFormat] = useState("pointCounterpoint")
  const [historicalContext, setHistoricalContext] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState(null)
  const [nextSpeaker, setNextSpeaker] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAudioLoaded, setIsAudioLoaded] = useState(false)
  const [volume, setVolume] = useState(1.0)
  const [showTranscript, setShowTranscript] = useState(false)
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
  const [isPreparing, setIsPreparing] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

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
  const char1 = personas[character1]
  const char2 = personas[character2]

  // Load voice IDs when component mounts
  useEffect(() => {
    async function loadVoiceIds() {
      try {
        const response = await fetch("/api/get-voice-ids")
        if (response.ok) {
          const data = await response.json()
          setVoiceIds(data)
          console.log("Voice IDs loaded:", data)

          // This is the critical part - directly update the voiceId property in each persona
          Object.keys(personas).forEach((key) => {
            const lowerKey = key.toLowerCase()
            if (data[lowerKey]) {
              // Directly set the voiceId property
              personas[key].voiceId = data[lowerKey]
              console.log(`Updated voice ID for ${key}: ${data[lowerKey]}`)
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
    }

    loadVoiceIds()
  }, [])

  // Update refs when state changes
  useEffect(() => {
    topicRef.current = currentTopic
    console.log("Topic updated in ref:", topicRef.current)
    saveTopic(currentTopic)
  }, [currentTopic])

  useEffect(() => {
    isDebatingRef.current = isDebating
    console.log("isDebating updated in ref:", isDebatingRef.current)
    saveIsDebating(isDebating)
  }, [isDebating])

  useEffect(() => {
    debateMessagesRef.current = debateMessages
    console.log("debateMessages updated in ref, length:", debateMessagesRef.current.length)
    saveMessages(debateMessages)
  }, [debateMessages])

  useEffect(() => {
    exchangeCountRef.current = exchangeCount
    console.log("exchangeCount updated in ref:", exchangeCountRef.current)
    saveExchangeCount(exchangeCount)
  }, [exchangeCount])

  // Save characters when they change
  useEffect(() => {
    saveCharacters(character1, character2)
  }, [character1, character2])

  // Log the personas object and voice IDs for debugging
  useEffect(() => {
    console.log("PERSONAS OBJECT:", personas)
    console.log("Character 1:", character1, personas[character1])
    console.log("Character 1 Voice ID:", personas[character1]?.voiceId)
    console.log("Character 2:", character2, personas[character2])
    console.log("Character 2 Voice ID:", personas[character2]?.voiceId)
  }, [character1, character2, voiceIds])

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
  const resetDebateState = useCallback(() => {
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

    // Clear localStorage
    clearDebateState()

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
  }, [])

  // Generate character-specific debate topics
  const generateCharacterSpecificTopics = useCallback(async () => {
    if (isGeneratingTopics || !isBrowser) return

    // Check if we already have topics for this character pair
    const topicKey = `${character1}_${character2}_topics`
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
          character1,
          character2,
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
  }, [character1, character2, isGeneratingTopics])

  // Generate debate topics when characters change
  useEffect(() => {
    if (isBrowser && initialStateLoaded) {
      // Reset debate state when characters change
      resetDebateState()

      // Generate character-specific topics
      generateCharacterSpecificTopics()
    }
  }, [character1, character2, generateCharacterSpecificTopics, resetDebateState, initialStateLoaded])

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
      const lowerCaseId = characterId.toLowerCase()
      if (voiceIds[lowerCaseId]) {
        console.log(`Using voiceIds state for ${characterId}: ${voiceIds[lowerCaseId]}`)
        return voiceIds[lowerCaseId]
      }

      // Final fallback
      console.log(`No voice ID found for ${characterId}, using default`)
      return personas[characterId]?.gender === "female" ? "nova" : "echo"
    },
    [voiceIds],
  )

  // Function to play topic introduction
  const playTopicIntroduction = useCallback(
    async (topic) => {
      if (!introAudioRef.current || !topic) return

      setIsIntroPlaying(true)
      setStatusMessage("Preparing introduction...")

      // Start preparing the debate in parallel
      const debatePromise = fetch("/api/start-debate", {
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

      try {
        const response = await fetch("/api/generate-topic-introduction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            character1,
            character2,
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
    [character1, character2, debateFormat, historicalContext],
  )

  // Add a new function to continue with prepared debate data
  const continueWithPreparedDebate = useCallback(
    (topic, data) => {
      resetDebateState()
      setCurrentTopic(topic)
      setIsDebating(true)

      // Store the debate messages
      const messages = [
        {
          character: character1,
          content: data.opening1,
          timestamp: Date.now(),
          audioUrl: data.audioUrl1,
          responseType: "Opening Remarks",
        },
        {
          character: character2,
          content: data.opening2,
          timestamp: Date.now() + 100,
          audioUrl: data.audioUrl2,
          responseType: "Opening Remarks",
        },
      ]

      setDebateMessages(messages)

      // Set the next speaker to be character2 (for the thinking UI)
      setNextSpeaker(character2)

      // Play the first character's audio and preload the second character's audio
      playDebateAudio(messages[0], messages, 0)
    },
    [character1, character2, resetDebateState],
  )

  // Start debate after introduction
  const startDebateAfterIntro = useCallback((topic) => {
    startDebateMain(topic)
  }, [])

  // Main debate starting function (without introduction)
  const startDebateMain = useCallback(
    async (topic) => {
      resetDebateState()
      setCurrentTopic(topic)
      setIsDebating(true)
      setIsProcessing(true)

      // Set the current speaker to character1 immediately to show the correct image
      setCurrentSpeaker(character1)

      // Ensure audio is unlocked
      await unlockAudio()

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
        console.log("Debate started with data:", data)

        // Store the debate messages
        const messages = [
          {
            character: character1,
            content: data.opening1,
            timestamp: Date.now(),
            audioUrl: data.audioUrl1,
            responseType: "Opening Remarks",
          },
          {
            character: character2,
            content: data.opening2,
            timestamp: Date.now() + 100,
            audioUrl: data.audioUrl2,
            responseType: "Opening Remarks",
          },
        ]

        setDebateMessages(messages)

        // Set the next speaker to be character2 (for the thinking UI)
        setNextSpeaker(character2)

        // Play the first character's audio and preload the second character's audio
        playDebateAudio(messages[0], messages, 0)
      } catch (error) {
        console.error("Error starting debate:", error)
        setIsDebating(false)
        setAudioError(`Failed to start debate: ${error.message}`)
      } finally {
        setIsProcessing(false)
      }
    },
    [character1, character2, debateFormat, historicalContext, resetDebateState, unlockAudio],
  )

  // Start a debate on a specific topic
  const startDebate = useCallback(
    async (topic) => {
      // Play introduction first
      playTopicIntroduction(topic)
    },
    [playTopicIntroduction],
  )

  // Submit a custom question to the debate
  const submitCustomQuestion = useCallback(async () => {
    if (!customQuestion.trim() || isProcessing) return

    const userQuestion = customQuestion.trim()
    setCustomQuestion("")
    setIsProcessing(true)

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
            character1,
            character2,
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
            character: character1,
            content: data.opening1,
            timestamp: Date.now(),
            audioUrl: data.audioUrl1,
            responseType: "Opening Remarks",
          },
          {
            character: character2,
            content: data.opening2,
            timestamp: Date.now() + 100,
            audioUrl: data.audioUrl2,
            responseType: "Opening Remarks",
          },
        ]

        setDebateMessages(messages)

        // Set the next speaker to be character2 (for the thinking UI)
        setNextSpeaker(character2)

        // Play the first character's audio and preload the second character's audio
        playDebateAudio(messages[0], messages, 0)
      } catch (error) {
        console.error("Error starting debate:", error)
        setIsDebating(false)
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
          character1,
          character2,
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
          character: character1,
          content: data.response1,
          timestamp: Date.now() + 100,
          audioUrl: data.audioUrl1,
          responseType: `Answer ${currentExchangeCount}`,
        },
        {
          character: character2,
          content: data.response2,
          timestamp: Date.now() + 200,
          audioUrl: data.audioUrl2,
          responseType: `Answer ${currentExchangeCount}`,
        },
      ]

      const allMessages = [...updatedMessages, ...newMessages]
      setDebateMessages(allMessages)

      // Set the next speaker to be character2 (for the thinking UI)
      setNextSpeaker(character2)

      // Play the first character's response
      playDebateAudio(newMessages[0], allMessages, updatedMessages.length)
    } catch (error) {
      console.error("Error continuing debate:", error)
      setAudioError(`Failed to continue debate: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }, [character1, character2, customQuestion, debateFormat, historicalContext, isProcessing])

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

    // Prepare the request data
    const data = {
      character1,
      character2,
      currentMessages: messages,
      topic: topic,
      format: debateFormat,
      historicalContext,
      isPreparing: true,
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
  }, [character1, character2, debateFormat, historicalContext, isProcessing, isPreparing])

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
          character1,
          character2,
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

      // Calculate the current response number
      const currentExchangeCount = Math.floor(messages.length / 2) + 1

      // Add responses
      const newMessages = [
        {
          character: character1,
          content: responseData.response1,
          timestamp: Date.now() + 100,
          audioUrl: responseData.audioUrl1,
          responseType: `Answer ${currentExchangeCount}`,
        },
        {
          character: character2,
          content: responseData.response2,
          timestamp: Date.now() + 200,
          audioUrl: responseData.audioUrl2,
          responseType: `Answer ${currentExchangeCount}`,
        },
      ]

      const allMessages = [...messages, ...newMessages]
      setDebateMessages(allMessages)
      setRetryCount(0) // Reset retry count on success

      // Set the next speaker to be character2 (for the thinking UI)
      setNextSpeaker(character2)

      // Play the first character's response
      playDebateAudio(newMessages[0], allMessages, messages.length)
    } catch (error) {
      console.error("Error continuing debate:", error)
      setLastError(error.message)

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
  }, [character1, character2, debateFormat, historicalContext, isProcessing, retryCount])

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
        const speaker = msg.character === character1 ? char1.name : char2.name
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
  }, [char1?.name, char2?.name, character1, character2])

  // Preload the next speaker's audio
  const preloadNextAudio = useCallback(
    async (message, allMessages, nextIndex) => {
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

  // Function to play debate audio
  const playDebateAudio = useCallback(
    async (message, allMessages, currentIndex) => {
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

      // Set the next speaker for the thinking UI
      const nextIndex = currentIndex + 1
      if (nextIndex < allMessages.length && allMessages[nextIndex].character !== "user") {
        setNextSpeaker(allMessages[nextIndex].character)
      } else {
        // If there's no next message, set the next speaker to the opposite character
        setNextSpeaker(character === character1 ? character2 : character1)
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
          audio.src = message.audioUrl
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

        // Preload the next speaker's audio if available
        const nextIndex = currentIndex + 1
        if (nextIndex < allMessages.length && allMessages[nextIndex].character !== "user") {
          preloadNextAudio(allMessages[nextIndex], allMessages, nextIndex)
        }

        // Set up event handlers
        audio.oncanplaythrough = () => {
          console.log(`${character} audio loaded successfully`)
          setIsAudioLoaded(true)
        }

        audio.onplay = () => {
          console.log(`${character} audio playing`)
          setIsPlaying(true)
          setIsLoadingAudio(false)

          // Start preparing the next exchange halfway through this audio
          if (character !== "moderator" && !isPreparing) {
            const halfwayPoint = Math.max(5000, (audio.duration * 1000) / 2)
            console.log(`Scheduling next exchange preparation in ${halfwayPoint}ms`)

            prepareNextTimeoutRef.current = setTimeout(() => {
              prepareNextExchange()
            }, halfwayPoint)
          }
        }

        // Add this debug log right after the audio.onended function to track state changes
        audio.onended = () => {
          console.log(`${character} audio playback ended`)
          setIsPlaying(false)
          setIsAudioLoaded(false)

          // Clear any prepare timeout
          if (prepareNextTimeoutRef.current) {
            clearTimeout(prepareNextTimeoutRef.current)
            prepareNextTimeoutRef.current = null
          }

          // Add this debug log to track state
          console.log(
            `After audio ended - isDebating: ${isDebatingRef.current}, isProcessing: ${isProcessing}, isAutoplaying: ${isAutoplaying}`,
          )

          // Play the next message if it exists and is not a user message
          const nextIndex = currentIndex + 1
          if (nextIndex < allMessages.length) {
            const nextMessage = allMessages[nextIndex]
            if (nextMessage.character !== "user") {
              // Small delay before playing next audio
              setTimeout(() => {
                if (isAutoplaying) {
                  playDebateAudio(nextMessage, allMessages, nextIndex)
                } else {
                  setCurrentSpeaker(null)
                }
              }, 500)
            }
          } else {
            setCurrentSpeaker(null)
            setNextSpeaker(null)

            // Check if we've completed an exchange (both characters have spoken)
            // An exchange is complete when we've heard from both characters
            if (currentIndex > 0 && currentIndex % 2 === 1) {
              // Calculate exchange count - start at 1 instead of 0
              const newExchangeCount = Math.floor((currentIndex + 1) / 2)
              setExchangeCount(newExchangeCount)
              console.log(`Completed exchange ${newExchangeCount} of ${maxExchanges}`)

              // If we've reached the maximum exchanges, stop auto-playing
              if (newExchangeCount >= maxExchanges) {
                setIsAutoplaying(false)
                console.log(`Reached ${maxExchanges} exchanges, stopping auto-play`)
              } else if (isAutoplaying) {
                // Otherwise, continue the debate automatically after a short delay
                console.log(`Automatically continuing to next exchange...`)
                setTimeout(() => {
                  // Add this debug log to check state right before continuing
                  console.log(
                    `Before continuing - isDebating: ${isDebatingRef.current}, isProcessing: ${isProcessing}, isAutoplaying: ${isAutoplaying}`,
                  )

                  if (isAutoplaying && !isProcessing && isDebatingRef.current) {
                    console.log(`Triggering next exchange...`)
                    continueDebate()
                  }
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

          // Clear any prepare timeout
          if (prepareNextTimeoutRef.current) {
            clearTimeout(prepareNextTimeoutRef.current)
            prepareNextTimeoutRef.current = null
          }
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

        // Clear any prepare timeout
        if (prepareNextTimeoutRef.current) {
          clearTimeout(prepareNextTimeoutRef.current)
          prepareNextTimeoutRef.current = null
        }
      }
    },
    [
      continueDebate,
      getVoiceForCharacter,
      isAutoplaying,
      isProcessing,
      isPreparing,
      maxExchanges,
      preloadNextAudio,
      prepareNextExchange,
      volume,
    ],
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

  // Handle character changes
  const handleCharacter1Change = useCallback(
    (newCharacter) => {
      if (newCharacter !== character1) {
        setCharacter1(newCharacter)
        // Reset debate if a debate is in progress
        if (isDebating) {
          resetDebateState()
        }
      }
    },
    [character1, isDebating, resetDebateState],
  )

  const handleCharacter2Change = useCallback(
    (newCharacter) => {
      if (newCharacter !== character2) {
        setCharacter2(newCharacter)
        // Reset debate if a debate is in progress
        if (isDebating) {
          resetDebateState()
        }
      }
    },
    [character2, isDebating, resetDebateState],
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl bg-gray-900 text-white min-h-screen">
      <DebateHeader
        character1={character1}
        character2={character2}
        currentSpeaker={currentSpeaker}
        isPlaying={isPlaying}
        exchangeCount={exchangeCount}
        maxExchanges={maxExchanges}
        onCharacter1Change={handleCharacter1Change}
        onCharacter2Change={handleCharacter2Change}
      />

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
          {retryCount >= 3 && (
            <button
              onClick={forceNextExchange}
              className="mt-2 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Force Continue
            </button>
          )}
        </div>
      )}

      {/* Current Debate Status */}
      <div className="mb-8 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">
          {currentTopic ? `Debate: ${currentTopic}` : "Select a topic to begin"}
        </h2>

        {/* Voice-only interface */}
        <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-lg">
          {isIntroPlaying ? (
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 relative mb-6">
                {/* Left half circle (Character 1) */}
                <div className="absolute top-0 left-0 w-24 h-48 overflow-hidden border-4 border-yellow-500 rounded-l-full">
                  <div className="w-48 h-48 absolute top-0 left-0">
                    <img
                      src={char1?.image || "/placeholder.png"}
                      alt={char1?.name || "Character 1"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Right half circle (Character 2) */}
                <div className="absolute top-0 right-0 w-24 h-48 overflow-hidden border-4 border-yellow-500 rounded-r-full">
                  <div className="w-48 h-48 absolute top-0 right-0">
                    <img
                      src={char2?.image || "/placeholder.png"}
                      alt={char2?.name || "Character 2"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Overlay with pulsing effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-red-500/30 rounded-full animate-pulse"></div>
              </div>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">Setting the stage...</h3>
              <p className="text-gray-300">
                Introducing the debate between {char1?.name} and {char2?.name}
              </p>
            </div>
          ) : !isDebating ? (
            <div className="w-full">
              <EmbeddedTopicSelector onSelectTopic={startDebate} character1={character1} character2={character2} />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {isPlaying && isAudioLoaded ? (
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-yellow-500 p-2">
                    <img
                      src={
                        (currentSpeaker === character1 ? char1 : currentSpeaker === character2 ? char2 : null)?.image ||
                        "/placeholder.png"
                      }
                      alt={
                        (currentSpeaker === character1 ? char1 : currentSpeaker === character2 ? char2 : "Moderator")
                          ?.name || "Speaking"
                      }
                      className="w-full h-full object-cover rounded-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-pulse rounded-full"></div>
                  </div>
                </div>
              ) : isLoadingAudio || isPreparing ? (
                <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-gray-600 p-2">
                  <img
                    src={
                      (nextSpeaker === character1 ? char1 : nextSpeaker === character2 ? char2 : null)?.image ||
                      "/placeholder.png"
                    }
                    alt={
                      (nextSpeaker === character1 ? char1 : nextSpeaker === character2 ? char2 : "Moderator")?.name ||
                      "Thinking"
                    }
                    className="w-full h-full object-cover rounded-full"
                  />
                  <div className="absolute inset-0 bg-gray-800 opacity-50 flex items-center justify-center">
                    <div className="h-16 w-16 text-yellow-400 animate-spin">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-gray-600 p-2 flex items-center justify-center bg-gray-800">
                  <div className="h-16 w-16 text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                  </div>
                </div>
              )}

              <div className="text-center mb-4">
                {isLoadingAudio ? (
                  <div>
                    <h3 className="text-xl font-bold text-yellow-400">
                      {nextSpeaker === "moderator"
                        ? "Moderator"
                        : nextSpeaker === character1
                          ? `${char1.name}`
                          : `${char2.name}`}{" "}
                      is thinking...
                    </h3>
                    <div className="mt-2">
                      <div className="h-8 w-8 animate-spin mx-auto text-yellow-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : isPlaying && isAudioLoaded ? (
                  <div>
                    <h3 className="text-xl font-bold text-yellow-400">
                      {currentSpeaker === "moderator"
                        ? "Moderator"
                        : currentSpeaker === character1
                          ? `${char1.name}`
                          : `${char2.name}`}{" "}
                      is speaking...
                    </h3>
                    {/* Add response type label */}
                    {debateMessages.find((m) => m.character === currentSpeaker)?.responseType && (
                      <p className="text-sm text-gray-400 mb-2">
                        {debateMessages.find((m) => m.character === currentSpeaker)?.responseType}
                      </p>
                    )}
                    <div className="flex justify-center mt-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-8 bg-blue-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]"></div>
                        <div className="w-2 h-12 bg-yellow-500 rounded-full animate-[soundwave_0.7s_ease-in-out_infinite_0.1s]"></div>
                        <div className="w-2 h-6 bg-green-500 rounded-full animate-[soundwave_0.4s_ease-in-out_infinite_0.2s]"></div>
                        <div className="w-2 h-10 bg-red-500 rounded-full animate-[soundwave_0.6s_ease-in-out_infinite_0.3s]"></div>
                        <div className="w-2 h-4 bg-purple-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.4s]"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-bold text-gray-400">
                      {isDebating ? "Preparing next response..." : "Select a topic to begin"}
                    </h3>
                    {isDebating && !isPlaying && !isLoadingAudio && (
                      <div className="mt-2 text-gray-500">
                        <p className="animate-pulse">The debaters are formulating their thoughts...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
            disabled={isProcessing}
            className="flex-1 p-2 rounded border bg-gray-700 text-white border-gray-600 placeholder-gray-400"
          />
          <button
            onClick={submitCustomQuestion}
            disabled={isProcessing || !customQuestion.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-600 disabled:text-gray-400"
          >
            {isProcessing ? "Processing..." : "Submit"}
          </button>
        </div>
      </div>

      {/* Replace the Continue Debate button with Pause/Continue button */}
      {isDebating && (
        <div className="flex justify-center mb-8">
          {isPlaying ? (
            <button
              onClick={toggleAutoplay}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-full font-bold"
            >
              {isAutoplaying ? "⏸️ Pause Debate" : "▶️ Resume Debate"}
            </button>
          ) : (
            <button
              onClick={exchangeCount >= maxExchanges ? continueDebate : toggleAutoplay}
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
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : exchangeCount >= maxExchanges ? (
                "Continue Debate"
              ) : (
                "Resume Debate"
              )}
            </button>
          )}
        </div>
      )}

      {/* Manual Continue Button */}
      {isDebating && !isPlaying && !isProcessing && debateMessages.length >= 2 && (
        <div className="flex justify-center mb-8">
          <button
            onClick={forceNextExchange}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-bold"
          >
            Force Next Exchange
          </button>
        </div>
      )}

      {/* Add transcript display */}
      {showTranscript && (
        <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-lg max-h-96 overflow-y-auto">
          <h3 className="text-lg font-bold mb-2">Debate Transcript</h3>
          {debateMessages.map((msg, idx) => {
            if (msg.character === "user") return null

            let speaker = ""
            let speakerClass = ""

            if (msg.character === "moderator") {
              speaker = "Moderator"
              speakerClass = "text-yellow-400"
            } else if (msg.character === character1) {
              speaker = `${char1.name}${msg.responseType ? ` (${msg.responseType})` : ""}`
              speakerClass = "text-blue-400"
            } else if (msg.character === character2) {
              speaker = `${char2.name}${msg.responseType ? ` (${msg.responseType})` : ""}`
              speakerClass = "text-red-400"
            }

            return (
              <div key={idx} className="mb-4">
                <p className={`font-bold ${speakerClass}`}>{speaker}:</p>
                <p className="text-gray-300">{msg.content}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Add a transcript toggle button */}
      {isDebating && debateMessages.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
          >
            {showTranscript ? "Hide Transcript" : "Show Transcript"}
          </button>
        </div>
      )}

      {/* Return to Home button */}
      <div className="mt-8 mb-4 text-center">
        <a href="/" className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full">
          Return to Home
        </a>
      </div>

      {debugMode && (
        <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Debug Panel</h3>

          <div className="mb-4">
            <p>Voice IDs Ready: {!isLoadingVoices ? "Yes" : "No"}</p>
            <p>Current Speaker: {currentSpeaker || "None"}</p>
            <p>Next Speaker: {nextSpeaker || "None"}</p>
            <p>Is Playing: {isPlaying ? "Yes" : "No"}</p>
            <p>Is Loading: {isLoadingAudio ? "Yes" : "No"}</p>
            <p>Audio Loaded: {isAudioLoaded ? "Yes" : "No"}</p>
            <p>Audio Initialized: {audioInitialized ? "Yes" : "No"}</p>
            <p>Is Unlocking Audio: {isUnlockingAudio ? "Yes" : "No"}</p>
            <p>Is Initializing: {isInitializing ? "Yes" : "No"}</p>
            <p>Exchange Count: {exchangeCount}</p>
            <p>Max Exchanges: {maxExchanges}</p>
            <p>Is Autoplaying: {isAutoplaying ? "Yes" : "No"}</p>
            <p>Is Preparing Next: {isPreparing ? "Yes" : "No"}</p>
            <p>Has Introduction: {hasIntroduction ? "Yes" : "No"}</p>
            <p>Retry Count: {retryCount}/3</p>
            <p>Current Topic (state): "{currentTopic}"</p>
            <p>Current Topic (ref): "{topicRef.current}"</p>
            <p>Is Debating (state): {isDebating ? "Yes" : "No"}</p>
            <p>Is Debating (ref): {isDebatingRef.current ? "Yes" : "No"}</p>
            <p>Debate Messages Count (state): {debateMessages.length}</p>
            <p>Debate Messages Count (ref): {debateMessagesRef.current.length}</p>
            {lastError && <p>Last Error: {lastError}</p>}
          </div>

          <div className="mb-4">
            <button
              onClick={() => {
                console.log("Clearing localStorage and resetting state")
                clearDebateState()
                resetDebateState()
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Clear Storage & Reset
            </button>
          </div>
        </div>
      )}

      {/* Add a debug mode toggle button */}
      <div className="mt-4 text-center">
        <button onClick={() => setDebugMode(!debugMode)} className="text-sm text-gray-500 hover:text-gray-300">
          {debugMode ? "Hide Debug Panel" : "Show Debug Panel"}
        </button>
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
      `}</style>
    </div>
  )
}
