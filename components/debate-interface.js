"use client"

import { useState, useEffect, useRef } from "react"
import { personas } from "../lib/personas"

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
  const [debugMode, setDebugMode] = useState(false) // Set to false by default
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [isUnlockingAudio, setIsUnlockingAudio] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [audioLoadTimeout, setAudioLoadTimeout] = useState(null)

  // Store current audio URLs
  const [currentAudioUrls, setCurrentAudioUrls] = useState({
    char1: "",
    char2: "",
  })

  const audioRef = useRef(null)
  const silentAudioRef = useRef(null)
  const char1AudioRef = useRef(null)
  const char2AudioRef = useRef(null)

  // Get character objects
  const char1 = personas[character1]
  const char2 = personas[character2]

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

  // Reset all debate state
  const resetDebateState = () => {
    setIsDebating(false)
    setDebateMessages([])
    setCurrentTopic(null)
    setCurrentSpeaker(null)
    setIsPlaying(false)
    setAudioError(null)
    setCurrentAudioUrls({ char1: "", char2: "" })

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

  // Get the appropriate voice for a character
  const getVoiceForCharacter = (characterId) => {
    // Map characters to specific voices
    const voiceMap = {
      // Male voices
      aristotle: "onyx",
      daVinci: "echo",
      einstein: "echo",
      tesla: "onyx",
      darwin: "echo",
      newton: "onyx",
      galileo: "echo",
      socrates: "onyx",
      plato: "echo",

      // Female voices
      curie: "nova",
      lovelace: "alloy",
      nightingale: "nova",
      franklin: "alloy",

      // Default fallbacks
      default_male: "echo",
      default_female: "nova",
    }

    // Return the mapped voice or a default based on gender
    return voiceMap[characterId] || (personas[characterId]?.gender === "female" ? "nova" : "echo")
  }

  // Start a debate on a specific topic
  const startDebate = async (topic) => {
    resetDebateState()
    setCurrentTopic(topic)
    setIsDebating(true)
    setIsProcessing(true)

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

      // Use the index.js approach to play audio for the first character
      // The second character will play automatically when the first one finishes
      playAudioLikeIndex(data.opening1, character1, messages)
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
    if (!customQuestion.trim() || !isDebating || isProcessing) return

    const userQuestion = customQuestion.trim()
    setCustomQuestion("")
    setIsProcessing(true)

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
      playAudioLikeIndex(data.response1, character1, allMessages)
    } catch (error) {
      console.error("Error continuing debate:", error)
      setAudioError(`Failed to continue debate: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

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

      const allMessages = [...debateMessages, ...newMessages]
      setDebateMessages(allMessages)

      // Play the first character's response
      playAudioLikeIndex(data.response1, character1, allMessages)
    } catch (error) {
      console.error("Error continuing debate:", error)
      setAudioError(`Failed to continue debate: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
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

  // Add this function to the DebateInterface component
  const playAudioLikeIndex = async (text, character, allMessages) => {
    console.log(`Playing audio for ${character}...`)
    setIsLoadingAudio(true)

    try {
      // Create a new audio element each time (like in index.js)
      const audio = new Audio()

      // Get the appropriate voice for this character
      const voice = getVoiceForCharacter(character)
      console.log(`Using voice "${voice}" for ${character}`)

      // Use the speak endpoint that works in index.js
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice, // Pass the voice parameter
        }),
      })

      if (!response.ok) {
        throw new Error(`Speak API returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // The speak API returns a data URL
      audio.src = data.audioUrl
      audio.volume = volume

      // Set up event handlers
      audio.oncanplaythrough = () => {
        console.log(`${character} audio loaded successfully via index.js approach`)
      }

      audio.onplay = () => {
        console.log(`${character} audio playing via index.js approach`)
        setIsPlaying(true)
        setIsLoadingAudio(false)
        setCurrentSpeaker(character)
      }

      audio.onended = () => {
        console.log(`${character} audio playback ended`)
        setIsPlaying(false)
        setCurrentSpeaker(null)

        // Find the current message index
        const currentMsgIndex = allMessages.findIndex((msg) => msg.character === character && msg.content === text)

        // If we found the current message and there's a next message
        if (currentMsgIndex !== -1 && currentMsgIndex + 1 < allMessages.length) {
          const nextMsg = allMessages[currentMsgIndex + 1]

          // Skip user messages for audio playback
          if (nextMsg.character === "user" && currentMsgIndex + 2 < allMessages.length) {
            const msgAfterUser = allMessages[currentMsgIndex + 2]
            console.log(`Skipping user message, playing ${msgAfterUser.character} next`)
            playAudioLikeIndex(msgAfterUser.content, msgAfterUser.character, allMessages)
          }
          // Play the next character's audio
          else if (nextMsg.character !== "user") {
            console.log(`Playing next character ${nextMsg.character}`)
            playAudioLikeIndex(nextMsg.content, nextMsg.character, allMessages)
          }
        }
      }

      audio.onerror = (e) => {
        const errorDetails = audio.error ? `${audio.error.code}: ${audio.error.message}` : "Unknown error"
        console.error(`${character} audio error:`, errorDetails)
        setAudioError(`${character} audio error: ${errorDetails}`)
        setIsLoadingAudio(false)
        setIsPlaying(false)
      }

      // Play the audio
      await audio.play()
    } catch (err) {
      console.error(`Error playing ${character} audio:`, err)
      setAudioError(`Error playing ${character} audio: ${err.message}`)
      setIsLoadingAudio(false)
      setIsPlaying(false)
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
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </div>
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
                    <h3 className="text-xl font-bold text-gray-400">Waiting for next speaker...</h3>
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
      {isDebating && (
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
            <p>Current Speaker: {currentSpeaker || "None"}</p>
            <p>Is Playing: {isPlaying ? "Yes" : "No"}</p>
            <p>Is Loading: {isLoadingAudio ? "Yes" : "No"}</p>
            <p>Audio Initialized: {audioInitialized ? "Yes" : "No"}</p>
            <p>Is Unlocking Audio: {isUnlockingAudio ? "Yes" : "No"}</p>
            <p>Is Initializing: {isInitializing ? "Yes" : "No"}</p>
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
