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
import { VoiceInput } from "./voice-input"

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

export default function DebateInterface() {
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

  // Add at the top of the component, right after all the state declarations
  const [hasError, setHasError] = useState(false)

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
  const [debateFormat, setDebateFormat] = useState("pointCounterpoint")
  const [historicalContext, setHistoricalContext] = useState(true)
  const [isProcessing, setIsProcessing] = useState(isDebating ? true : false)
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
    [voiceIds],
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
      setIsSettingUp(false)

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
      setIsSettingUp(true)

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
        setIsSettingUp(false)

        // Set the next speaker to be character2 (for the thinking UI)
        setNextSpeaker(character2)

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
    },
    [character1, character2, debateFormat, historicalContext, resetDebateState, unlockAudio],
  )

  // Start a debate on a specific topic
  const startDebate = useCallback(
    async (topic) => {
      // Skip introduction for faster start
      startDebateMain(topic)
    },
    [startDebateMain],
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
          setIsSettingUp(false)

          // Set the next speaker to be character2 (for the thinking UI)
          setNextSpeaker(character2)

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
            responseType: `Response ${currentExchangeCount}`, // Changed from "Answer" to "Response"
          },
          {
            character: character2,
            content: data.response2,
            timestamp: Date.now() + 200,
            audioUrl: data.audioUrl2,
            responseType: `Response ${currentExchangeCount}`, // Changed from "Answer" to "Response"
          },
        ]

        const allMessages = [...updatedMessages, ...newMessages]
        setDebateMessages(allMessages)
        setIsSettingUp(false)

        // Set the next speaker to be character2 (for the thinking UI)
        setNextSpeaker(character2)

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
    [character1, character2, debateFormat, historicalContext, isProcessing],
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
    const voice1 = getVoiceForCharacter(character1)
    const voice2 = getVoiceForCharacter(character2)
    console.log(`Preparing with voices: ${character1}=${voice1}, ${character2}=${voice2}`)

    // Prepare the request data
    const data = {
      character1,
      character2,
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
  }, [character1, character2, debateFormat, historicalContext, isProcessing, isPreparing, getVoiceForCharacter])

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

      // Calculate the current response number based on total exchanges
      const currentExchangeCount = Math.floor(messages.length / 2) + 1

      // Add responses
      const newMessages = [
        {
          character: character1,
          content: responseData.response1,
          timestamp: Date.now() + 100,
          audioUrl: responseData.audioUrl1,
          responseType: `Response ${currentExchangeCount}`,
        },
        {
          character: character2,
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
      setNextSpeaker(character2)

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
        if (
          nextIndex < allMessages.length &&
          allMessages[nextIndex] &&
          allMessages[nextIndex].character !== "user" &&
          allMessages[nextIndex].character &&
          allMessages[nextIndex].content
        ) {
          preloadNextAudio(allMessages[nextIndex], allMessages, nextIndex)
        }

        // Set up event handlers
        audio.oncanplaythrough = () => {
          console.log(`${character} audio loaded successfully`)
          setIsAudioLoaded(true)
          setIsLoadingAudio(false) // Set to false when audio is loaded, not when it starts playing
        }

        audio.onplay = () => {
          console.log(`${character} audio playing`)
          setIsPlaying(true)

          // Start preparing the next exchange immediately
          if (character !== "moderator" && !isPreparing) {
            console.log(`Starting next exchange preparation immediately`)
            // Use a minimal timeout to allow the current execution to complete
            prepareNextTimeoutRef.current = setTimeout(() => {
              prepareNextExchange()
            }, 100)
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

              // If we've reached the maximum exchanges, stop auto-playing
              if (displayExchangeCount >= maxExchanges) {
                setIsAutoplaying(false)
                console.log(`Reached ${maxExchanges} exchanges, stopping auto-play`)
              } else if (isAutoplaying) {
                // Otherwise, continue the debate automatically after a shorter delay
                console.log(`Automatically continuing to next exchange...`)
                setTimeout(() => {
                  console.log(
                    `Before continuing - isDebating: ${isDebatingRef.current}, isProcessing: ${isProcessing}, isAutoplaying: ${isAutoplaying}`,
                  )

                  if (isAutoplaying && !isProcessing && isDebatingRef.current) {
                    console.log(`Triggering next exchange...`)
                    continueDebate()
                  }
                }, 100) // Reduced to minimal delay
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

  // Fixed height container for the entire interface
  const containerStyle = {
    minHeight: "calc(100vh - 2rem)", // Subtract padding
    display: "flex",
    flexDirection: "column",
  }

  // Fixed height for the main content area
  const mainContentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  }

  // Add this useEffect to catch and recover from errors
  useEffect(() => {
    if (hasError) {
      // Try to recover from error
      const recoverFromError = async () => {
        try {
          // Stop any playing audio
          if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current = null
          }

          // Clear any timeouts
          if (prepareNextTimeoutRef.current) {
            clearTimeout(prepareNextTimeoutRef.current)
            prepareNextTimeoutRef.current = null
          }

          // Reset error state
          setHasError(false)
          setAudioError("An error occurred. The application has recovered.")
        } catch (e) {
          console.error("Failed to recover from error:", e)
        }
      }

      recoverFromError()
    }
  }, [hasError])

  // Add a try-catch block around the return statement
  try {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl bg-gray-900 text-white" style={containerStyle}>
        <DebateHeader
          character1={character1}
          character2={character2}
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

          {/* Topic Selector - Only show when not debating and not playing intro */}
          {!isDebating && !isIntroPlaying && (
            <div className="mb-8">
              <EmbeddedTopicSelector onSelectTopic={startDebate} character1={character1} character2={character2} />
            </div>
          )}

          {/* Setup animation with dynamic status */}
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

          {/* Voice Input for Custom Questions */}
          {isDebating && (
            <div className="mb-8 flex justify-center">
              <VoiceInput onSubmit={submitCustomQuestion} buttonText="Ask Custom Question" />
            </div>
          )}

          {/* Return to Home button */}
          <div className="mt-auto mb-4 text-center">
            <a href="/" className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full">
              Return to Home
            </a>
          </div>
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
        <div className="text-center">
          <a href="/" className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full">
            Return to Home
          </a>
        </div>
      </div>
    )
  }
}
