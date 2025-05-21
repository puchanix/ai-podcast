"use client"

import { useState, useEffect, useRef } from "react"
import { personas, loadVoiceIds, voiceIdsLoaded } from "../lib/personas"

export function DebateInterface() {
  const [character1, setCharacter1] = useState(Object.keys(personas)[0])
  const [character2, setCharacter2] = useState(Object.keys(personas)[1])
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [isDebating, setIsDebating] = useState(false)
  const [debateMessages, setDebateMessages] = useState([])
  const [suggestedTopics, setSuggestedTopics] = useState([])
  const [customQuestion, setCustomQuestion] = useState("")
  const [currentTopic, setCurrentTopic] = useState(null)
  const [debateFormat, setDebateFormat] = useState("pointCounterpoint")
  const [historicalContext, setHistoricalContext] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1.0)
  const [showTranscript, setShowTranscript] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [isUnlockingAudio, setIsUnlockingAudio] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [audioLoadTimeout, setAudioLoadTimeout] = useState(null)
  const [voiceIdsReady, setVoiceIdsReady] = useState(voiceIdsLoaded)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState(null)

  // Audio preloading state
  const [nextAudioData, setNextAudioData] = useState(null)
  const [isPreloadingAudio, setIsPreloadingAudio] = useState(false)

  // Add these new state variables after the existing ones
  const [exchangeCount, setExchangeCount] = useState(0)
  const [maxExchanges, setMaxExchanges] = useState(5)
  const [isAutoplaying, setIsAutoplaying] = useState(true)
  const [debugMode, setDebugMode] = useState(false) // Change to false to hide debug panel by default

  // Audio element refs
  const audioRef = useRef(null)
  const silentAudioRef = useRef(null)
  const char1AudioRef = useRef(null)
  const char2AudioRef = useRef(null)
  const nextAudioRef = useRef(null)

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
    async function initVoiceIds() {
      if (!voiceIdsLoaded) {
        const success = await loadVoiceIds()
        setVoiceIdsReady(success)
        console.log("Voice IDs loaded:", success)
      }
    }

    initVoiceIds()
  }, [])

  // Log the personas object and voice IDs for debugging
  useEffect(() => {
    console.log("PERSONAS OBJECT:", personas)
    console.log("Character 1:", character1, personas[character1])
    console.log("Character 1 Voice ID:", personas[character1]?.voiceId)
    console.log("Character 2:", character2, personas[character2])
    console.log("Character 2 Voice ID:", personas[character2]?.voiceId)
  }, [character1, character2, voiceIdsReady])

  // Initialize audio elements with silent.mp3
  useEffect(() => {
    if (char1AudioRef.current && char2AudioRef.current) {
      // Set a default silent audio file to prevent "Empty src attribute" errors
      char1AudioRef.current.src = "/silent.mp3"
      char2AudioRef.current.src = "/silent.mp3"

      // Don't actually load or play these, just set the src

      // Mark initialization as complete after a short delay
      const timer = setTimeout(() => {
        setIsInitializing(false)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [])

  // Function to unlock audio on iOS
  const unlockAudio = async () => {
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
  }

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
  }, [audioInitialized, isUnlockingAudio])

  // Generate debate topics when characters change
  useEffect(() => {
    // Reset debate state when characters change
    resetDebateState()
    generateDebateTopics()
  }, [character1, character2])

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

  // Reset all debate state
  const resetDebateState = () => {
    setIsDebating(false)
    setDebateMessages([])
    setCurrentTopic(null)
    setCurrentSpeaker(null)
    setIsPlaying(false)
    setAudioError(null)
    setCurrentAudioUrls({ char1: "", char2: "" })
    setNextAudioData(null)
    setExchangeCount(0)
    setIsAutoplaying(true)
    setRetryCount(0)
    setLastError(null)

    // Clear any existing timeout
    if (audioLoadTimeout) {
      clearTimeout(audioLoadTimeout)
      setAudioLoadTimeout(null)
    }

    // Stop any playing audio
    if (char1AudioRef.current) {
      char1AudioRef.current.pause()
      char1AudioRef.current.src = "/silent.mp3" // Set to silent.mp3 instead of empty string
    }

    if (char2AudioRef.current) {
      char2AudioRef.current.pause()
      char2AudioRef.current.src = "/silent.mp3" // Set to silent.mp3 instead of empty string
    }
  }

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
        {
          id: "art-purpose",
          title: "Purpose of Art",
          description: "The role of artistic expression in society",
          category: "arts",
        },
        {
          id: "education-methods",
          title: "Education Methods",
          description: "How to best educate future generations",
          category: "education",
        },
        {
          id: "historical-legacy",
          title: "Historical Legacy",
          description: "How history shapes our present and future",
          category: "history",
        },
      ])
    } finally {
      setIsGeneratingTopics(false)
    }
  }

  // Get the appropriate voice for a character directly from personas.js
  const getVoiceForCharacter = (characterId) => {
    // Check if the character exists in personas
    if (!personas[characterId]) {
      console.log(`Character ${characterId} not found in personas`)
      return "alloy" // Default OpenAI voice as fallback
    }

    // Use the getVoiceId method if available, otherwise fall back to the voiceId property
    if (typeof personas[characterId].getVoiceId === "function") {
      const voiceId = personas[characterId].getVoiceId()
      if (voiceId) {
        console.log(`Found voice ID "${voiceId}" for ${characterId} using getVoiceId()`)
        return voiceId
      }
    }

    // Try the direct voiceId property as fallback
    if (personas[characterId].voiceId) {
      console.log(`Found voice ID "${personas[characterId].voiceId}" for ${characterId} using voiceId property`)
      return personas[characterId].voiceId
    }

    // Fallback to default voices if no voice ID is found
    console.log(`No voice ID found for ${characterId}, using default based on gender`)
    return personas[characterId]?.gender === "female" ? "nova" : "echo"
  }

  // Start a debate on a specific topic
  const startDebate = async (topic) => {
    // Make sure voice IDs are loaded before starting
    if (!voiceIdsLoaded) {
      await loadVoiceIds()
    }

    // Make sure voice IDs are loaded before starting
    if (!voiceIdsReady) {
      const success = await loadVoiceIds()
      setVoiceIdsReady(success)
      if (!success) {
        setAudioError("Failed to load voice IDs. Please try again.")
        return
      }
    }

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
        },
        {
          character: character2,
          content: data.opening2,
          timestamp: Date.now() + 100,
          audioUrl: data.audioUrl2,
        },
      ]

      setDebateMessages(messages)

      // Play the first character's audio and preload the second character's audio
      playDebateAudio(messages[0], messages, 0)
    } catch (error) {
      console.error("Error starting debate:", error)
      setIsDebating(false)
      setAudioError(`Failed to start debate: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Submit a custom question to the debate
  const submitCustomQuestion = async () => {
    if (!customQuestion.trim() || isProcessing) return

    const userQuestion = customQuestion.trim()
    setCustomQuestion("")
    setIsProcessing(true)

    // If no debate is in progress, start one with the custom question as the topic
    if (!isDebating) {
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
          },
          {
            character: character2,
            content: data.opening2,
            timestamp: Date.now() + 100,
            audioUrl: data.audioUrl2,
          },
        ]

        setDebateMessages(messages)

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
      ...debateMessages,
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

      const allMessages = [...updatedMessages, ...newMessages]
      setDebateMessages(allMessages)

      // Play the first character's response
      playDebateAudio(newMessages[0], allMessages, updatedMessages.length)
    } catch (error) {
      console.error("Error continuing debate:", error)
      setAudioError(`Failed to continue debate: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Update the continueDebate function to ensure it's not blocked by isProcessing
  const continueDebate = async () => {
    // Check if isDebating is false and log it
    if (!isDebating) {
      console.log("isDebating is false, forcing it to true")
      setIsDebating(true)
      // Add a small delay to ensure state updates before proceeding
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (isProcessing) {
      console.log("Cannot continue debate: isProcessing =", isProcessing)
      return
    }

    console.log("Starting next exchange...")
    setIsProcessing(true)
    setAudioError(null) // Clear any previous errors

    try {
      // Log the data being sent to the API
      const requestData = {
        character1,
        character2,
        currentMessages: debateMessages,
        topic: currentTopic,
        format: debateFormat,
        historicalContext,
      }

      console.log("Sending data to auto-continue API:", JSON.stringify(requestData, null, 2))

      const response = await fetch("/api/auto-continue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      // Check for non-200 response
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API returned ${response.status}: ${errorText}`)
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("Received new debate responses:", data)

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

      const allMessages = [...debateMessages, ...newMessages]
      setDebateMessages(allMessages)
      setRetryCount(0) // Reset retry count on success

      // Play the first character's response
      playDebateAudio(newMessages[0], allMessages, debateMessages.length)
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
          if (isDebating) {
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

  // Function to manually force continue the debate
  const forceNextExchange = async () => {
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
  }

  // Function to download the debate transcript
  const downloadTranscript = () => {
    if (debateMessages.length === 0) return

    let transcript = `Debate on ${currentTopic}\n\n`

    debateMessages.forEach((msg) => {
      if (msg.character === "user") {
        transcript += `Question: ${msg.content}\n\n`
      } else {
        const speaker = msg.character === character1 ? char1.name : char2.name
        transcript += `${speaker}: ${msg.content}\n\n`
      }
    })

    const blob = new Blob([transcript], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `debate-${currentTopic.replace(/\s+/g, "-").toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Function to play debate audio
  const playDebateAudio = async (message, allMessages, currentIndex) => {
    // Ensure isDebating is true when playing audio
    if (!isDebating) {
      console.log("Setting isDebating to true in playDebateAudio")
      setIsDebating(true)
    }

    const { character, content } = message
    console.log(`Playing audio for ${character}...`)
    setIsLoadingAudio(true)
    setCurrentSpeaker(character)

    try {
      // Create a new audio element
      const audio = new Audio()

      // Get the voice for this character
      const voice = getVoiceForCharacter(character)
      console.log(`Using voice "${voice}" for ${character}`)

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
      audio.volume = volume

      // Preload the next speaker's audio if available
      const nextIndex = currentIndex + 1
      if (nextIndex < allMessages.length && allMessages[nextIndex].character !== "user") {
        preloadNextAudio(allMessages[nextIndex], allMessages, nextIndex)
      }

      // Set up event handlers
      audio.oncanplaythrough = () => {
        console.log(`${character} audio loaded successfully`)
      }

      audio.onplay = () => {
        console.log(`${character} audio playing`)
        setIsPlaying(true)
        setIsLoadingAudio(false)
      }

      // Add this debug log right after the audio.onended function to track state changes
      audio.onended = () => {
        console.log(`${character} audio playback ended`)
        setIsPlaying(false)

        // Add this debug log to track state
        console.log(
          `After audio ended - isDebating: ${isDebating}, isProcessing: ${isProcessing}, isAutoplaying: ${isAutoplaying}`,
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
                  `Before continuing - isDebating: ${isDebating}, isProcessing: ${isProcessing}, isAutoplaying: ${isAutoplaying}`,
                )

                if (isAutoplaying && !isProcessing) {
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
        setCurrentSpeaker(null)
      }

      // Play the audio
      await audio.play()
    } catch (err) {
      console.error(`Error playing ${character} audio:`, err)
      setAudioError(`Error playing ${character} audio: ${err.message}`)
      setIsLoadingAudio(false)
      setIsPlaying(false)
      setCurrentSpeaker(null)
    }
  }

  // Preload the next speaker's audio
  const preloadNextAudio = async (message, allMessages, nextIndex) => {
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
      console.error(`Error preloading audio for ${character}:`, err)
    } finally {
      setIsPreloadingAudio(false)
    }
  }

  // Add this function to toggle auto-play
  const toggleAutoplay = () => {
    setIsAutoplaying(!isAutoplaying)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-yellow-400">Historical Debates</h1>

      {!voiceIdsReady && (
        <div className="mb-4 p-4 bg-yellow-800 text-yellow-100 rounded-lg text-center">
          Loading voice data... Please wait.
        </div>
      )}

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

      {/* Current Debate Status */}
      <div className="mb-8 bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">
          {currentTopic ? `Debate: ${currentTopic}` : "Select a topic to begin"}
        </h2>

        {/* Voice-only interface */}
        <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-lg">
          {!isDebating ? (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="h-12 w-12 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <p>Select a topic above to start the debate</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {isPlaying || isLoadingAudio ? (
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-yellow-500 p-2">
                    <img
                      src={(currentSpeaker === character1 ? char1 : char2)?.image || "/placeholder.png"}
                      alt={(currentSpeaker === character1 ? char1 : char2)?.name || "Speaking"}
                      className="w-full h-full object-cover rounded-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-pulse rounded-full"></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center mb-6">
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
                </div>
              )}

              {isDebating && (
                <div className="mb-4 text-sm text-gray-400">
                  Exchange {exchangeCount || 1} of {maxExchanges}
                  <div className="w-full bg-gray-700 h-2 rounded-full mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((exchangeCount || 1) / maxExchanges) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="text-center mb-4">
                {isLoadingAudio ? (
                  <div>
                    <h3 className="text-xl font-bold text-yellow-400">Loading audio...</h3>
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
                ) : isPlaying ? (
                  <div>
                    <h3 className="text-xl font-bold text-yellow-400">
                      {currentSpeaker === character1 ? char1.name : char2.name} is speaking...
                    </h3>
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
            const speaker = msg.character === character1 ? char1.name : char2.name
            return (
              <div key={idx} className="mb-4">
                <p className={`font-bold ${msg.character === character1 ? "text-blue-400" : "text-red-400"}`}>
                  {speaker}:
                </p>
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
          <h3 className="text-lg font-bold mb-2">Audio Debug Panel</h3>

          <div className="mb-4">
            <p>Voice IDs Ready: {voiceIdsReady ? "Yes" : "No"}</p>
            <p>Current Speaker: {currentSpeaker || "None"}</p>
            <p>Is Playing: {isPlaying ? "Yes" : "No"}</p>
            <p>Is Loading: {isLoadingAudio ? "Yes" : "No"}</p>
            <p>Audio Initialized: {audioInitialized ? "Yes" : "No"}</p>
            <p>Is Unlocking Audio: {isUnlockingAudio ? "Yes" : "No"}</p>
            <p>Is Initializing: {isInitializing ? "Yes" : "No"}</p>
            <p>Exchange Count: {exchangeCount}</p>
            <p>Max Exchanges: {maxExchanges}</p>
            <p>Is Autoplaying: {isAutoplaying ? "Yes" : "No"}</p>
            <p>Retry Count: {retryCount}/3</p>
            {lastError && <p>Last Error: {lastError}</p>}
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-1">Character Voice IDs:</h4>
            <ul className="text-sm">
              {Object.keys(personas).map((id) => (
                <li key={id} className="mb-1">
                  {personas[id].name}: {personas[id].voiceId || "Not loaded"}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-1">Audio URLs:</h4>
            <ul className="text-sm">
              {debateMessages
                .filter((msg) => msg.audioUrl)
                .map((msg, index) => (
                  <li key={index} className="mb-1">
                    {msg.character === character1 ? char1.name : char2.name}: {msg.audioUrl}
                  </li>
                ))}
            </ul>
          </div>
          <div className="mb-4">
            <h4 className="font-medium mb-1">Audio Status:</h4>
            <p>Is Playing: {isPlaying ? "Yes" : "No"}</p>
            <p>Is Loading: {isLoadingAudio ? "Yes" : "No"}</p>
            <p>Is Preloading Next Speaker: {isPreloadingAudio ? "Yes" : "No"}</p>
            <p>Next Speaker Audio Ready: {nextAudioData ? "Yes" : "No"}</p>
            {nextAudioData && <p>Next Speaker: {nextAudioData.character === character1 ? char1.name : char2.name}</p>}
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
    case "education":
      return "bg-teal-900 text-teal-300"
    default:
      return "bg-gray-700 text-gray-300"
  }
}

// Helper function to get category icon
function getCategoryIcon(category) {
  // Simple SVG icons
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
