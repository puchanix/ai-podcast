"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Layout from "../components/layout"
import DebateInterface from "../components/debate-interface"

export default function Home() {
  const [selectedPersona, setSelectedPersona] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const [mode, setMode] = useState("question") // 'question' or 'debate'
  const [selectedCharacters, setSelectedCharacters] = useState([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [voiceIds, setVoiceIds] = useState({})
  const [thinkingMessage, setThinkingMessage] = useState("")
  const [personas, setPersonas] = useState({})
  const [showTopicSelector, setShowTopicSelector] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Debate state
  const [isDebating, setIsDebating] = useState(false)
  const [debateTopic, setDebateTopic] = useState("")
  const [topics, setTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  // Audio refs
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const currentPersonaRef = useRef("") // Use ref to track current persona

  // Thinking messages for dynamic display
  const thinkingMessages = [
    "Thinking...",
    "Pondering your question...",
    "Reflecting on this matter...",
    "Considering the depths of this inquiry...",
    "Gathering thoughts...",
    "Contemplating...",
    "Preparing a response...",
    "Delving into wisdom...",
    "Searching through memories...",
    "Formulating thoughts...",
  ]

  // Load voice IDs when component mounts
  useEffect(() => {
    async function loadVoiceIds() {
      try {
        console.log("🔍 [VOICE DEBUG] Starting to load voice IDs...")
        const response = await fetch("/api/get-voice-ids")
        if (response.ok) {
          const data = await response.json()
          console.log("🔍 [VOICE DEBUG] Raw voice IDs from API:", data)
          setVoiceIds(data)

          // Update personas with voice IDs
          Object.keys(personas).forEach((key) => {
            const voiceKey = key === "daVinci" ? "davinci" : key.toLowerCase()
            if (data[voiceKey]) {
              personas[key].voiceId = data[voiceKey]
              console.log(`🔍 [VOICE DEBUG] Updated voice ID for ${key}: ${data[voiceKey]}`)
            } else {
              console.log(`🔍 [VOICE DEBUG] No voice ID found for ${key} (looking for key: ${voiceKey})`)
            }
          })

          console.log("🔍 [VOICE DEBUG] Final voiceIds state:", data)
          console.log("🔍 [VOICE DEBUG] Updated personas:", personas)
        } else {
          console.error("🔍 [VOICE DEBUG] Failed to load voice IDs, status:", response.status)
        }
      } catch (error) {
        console.error("🔍 [VOICE DEBUG] Error loading voice IDs:", error)
      } finally {
        setIsLoadingVoices(false)
      }
    }

    if (Object.keys(personas).length > 0) {
      loadVoiceIds()
    }
  }, [personas])

  // Load personas when component mounts
  useEffect(() => {
    async function loadPersonas() {
      try {
        console.log("🔍 [PERSONA DEBUG] Loading personas...")
        const personasModule = await import("../lib/personas")
        setPersonas(personasModule.personas)
        console.log("🔍 [PERSONA DEBUG] Personas loaded:", Object.keys(personasModule.personas))
        console.log("🔍 [PERSONA DEBUG] Full personas object:", personasModule.personas)
      } catch (error) {
        console.error("🔍 [PERSONA DEBUG] Error loading personas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPersonas()
  }, [])

  // Load topics when two characters are selected
  useEffect(() => {
    async function fetchTopics() {
      if (selectedCharacters.length === 2) {
        setLoadingTopics(true)
        try {
          console.log("🔍 [TOPIC DEBUG] Fetching topics for:", selectedCharacters)
          const response = await fetch("/api/generate-character-topics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              character1: selectedCharacters[0],
              character2: selectedCharacters[1],
            }),
          })

          console.log("🔍 [TOPIC DEBUG] API response status:", response.status)

          if (response.ok) {
            const data = await response.json()
            console.log("🔍 [TOPIC DEBUG] Topics received:", data)
            setTopics(data.topics || [])
          } else {
            const errorText = await response.text()
            console.error("🔍 [TOPIC DEBUG] Failed to fetch topics:", response.status, errorText)
            // Fallback topics
            setTopics([
              {
                id: "fallback-1",
                title: "Philosophy and Wisdom",
                description: "The nature of knowledge and understanding",
                category: "philosophy",
              },
              {
                id: "fallback-2",
                title: "Art and Expression",
                description: "The role of creativity in human experience",
                category: "arts",
              },
              {
                id: "fallback-3",
                title: "Science and Discovery",
                description: "The pursuit of knowledge and innovation",
                category: "science",
              },
            ])
          }
        } catch (error) {
          console.error("🔍 [TOPIC DEBUG] Error fetching topics:", error)
          // Fallback topics on error
          setTopics([
            {
              id: "fallback-1",
              title: "Philosophy and Wisdom",
              description: "The nature of knowledge and understanding",
              category: "philosophy",
            },
            {
              id: "fallback-2",
              title: "Art and Expression",
              description: "The role of creativity in human experience",
              category: "arts",
            },
            {
              id: "fallback-3",
              title: "Science and Discovery",
              description: "The pursuit of knowledge and innovation",
              category: "science",
            },
          ])
        } finally {
          setLoadingTopics(false)
        }
      }
    }

    fetchTopics()
  }, [selectedCharacters])

  // Update ref when selectedPersona changes
  useEffect(() => {
    currentPersonaRef.current = selectedPersona
    console.log("🔍 [PERSONA DEBUG] Selected persona updated to:", selectedPersona)
  }, [selectedPersona])

  // Thinking message rotation effect
  useEffect(() => {
    let interval
    if (isProcessing) {
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
  }, [isProcessing])

  const handleCharacterSelect = useCallback(
    async (characterId) => {
      console.log("🔍 [CHARACTER DEBUG] Character selected:", characterId)
      if (mode === "question") {
        // Update both state and ref immediately
        setSelectedPersona(characterId)
        currentPersonaRef.current = characterId
        setSelectedCharacters([characterId])

        console.log("🔍 [CHARACTER DEBUG] About to start listening for:", characterId)
        // Start recording immediately
        await startListening()
      } else if (mode === "debate") {
        setSelectedCharacters((prev) => {
          const isSelected = prev.includes(characterId)
          let newSelection

          if (isSelected) {
            newSelection = prev.filter((key) => key !== characterId)
          } else if (prev.length < 2) {
            newSelection = [...prev, characterId]
          } else {
            newSelection = [prev[1], characterId]
          }

          console.log("🔍 [CHARACTER DEBUG] Selected characters updated to:", newSelection)

          if (newSelection.length === 2) {
            console.log("🔍 [CHARACTER DEBUG] Two characters selected, showing topic selector")
            setShowTopicSelector(true)
          } else {
            setShowTopicSelector(false)
            setIsDebating(false)
            setDebateTopic("")
          }

          return newSelection
        })
      }
    },
    [mode],
  )

  const startListening = useCallback(async () => {
    try {
      console.log("🔍 [AUDIO DEBUG] Starting to listen...")
      setAudioError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        console.log("🔍 [AUDIO DEBUG] Recording stopped")
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        await processAudioQuestion(audioBlob)
      }

      mediaRecorder.start()
      setIsListening(true)
      console.log("🔍 [AUDIO DEBUG] Recording started")
    } catch (error) {
      console.error("🔍 [AUDIO DEBUG] Error accessing microphone:", error)
      setAudioError("Could not access microphone. Please check permissions.")
    }
  }, [])

  const stopListening = useCallback(() => {
    console.log("🔍 [AUDIO DEBUG] Stop listening called")
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsListening(false)
      console.log("🔍 [AUDIO DEBUG] MediaRecorder stopped")
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log("🔍 [AUDIO DEBUG] Track stopped:", track.kind)
      })
      streamRef.current = null
    }
  }, [])

  const pauseAudio = useCallback(() => {
    console.log("🔍 [AUDIO DEBUG] Pause audio called")
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      setIsPlaying(false)
      console.log("🔍 [AUDIO DEBUG] Audio paused")
    }
  }, [])

  const resumeAudio = useCallback(() => {
    console.log("🔍 [AUDIO DEBUG] Resume audio called")
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play()
      setIsPlaying(true)
      console.log("🔍 [AUDIO DEBUG] Audio resumed")
    }
  }, [])

  const stopAudio = useCallback(() => {
    console.log("🔍 [AUDIO DEBUG] Stop audio called")
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      console.log("🔍 [AUDIO DEBUG] Audio stopped")
    }
  }, [])

  const processAudioQuestion = useCallback(async (audioBlob) => {
    // Use the ref value instead of state
    const currentPersona = currentPersonaRef.current
    console.log("🔍 [AUDIO DEBUG] Processing audio question, selectedPersona from ref:", currentPersona)

    if (!currentPersona) {
      console.error("🔍 [AUDIO DEBUG] No persona selected!")
      setAudioError("Please select a character first")
      return
    }

    setIsProcessing(true)
    setAudioError(null)

    try {
      // Convert audio to text
      const formData = new FormData()
      formData.append("audio", audioBlob, "question.wav")

      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!transcriptionResponse.ok) {
        throw new Error("Failed to transcribe audio")
      }

      const { text } = await transcriptionResponse.json()
      console.log("🔍 [AUDIO DEBUG] Transcribed text:", text)

      if (!text || text.trim().length === 0) {
        throw new Error("No speech detected. Please try again.")
      }

      // Start parallel processing: text generation and audio preparation
      await processQuestionWithStreaming(text, currentPersona)
    } catch (error) {
      console.error("🔍 [AUDIO DEBUG] Error processing audio question:", error)
      setAudioError(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
      setThinkingMessage("")
    }
  }, [])

  // New function for parallel processing with streaming
  const processQuestionWithStreaming = async (question, persona) => {
    try {
      setIsPlaying(true)

      // Start text generation
      const textPromise = fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          persona: persona,
        }),
      })

      // Wait for text response
      const textResponse = await textPromise
      if (!textResponse.ok) {
        throw new Error("Failed to generate response")
      }

      const { response: responseText } = await textResponse.json()
      console.log("🔍 [AUDIO DEBUG] Generated response:", responseText)

      // Use regular audio generation instead of streaming to avoid 504 errors
      await generateAudioResponse(responseText, persona)
    } catch (error) {
      console.error("🔍 [AUDIO DEBUG] Error in parallel processing:", error)
      setAudioError(`Error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  // Fixed audio generation to properly use voice IDs
  const generateAudioResponse = async (text, persona) => {
    try {
      // Get voice for character - FIXED to use voiceIds state properly
      const voiceKey = persona === "daVinci" ? "davinci" : persona.toLowerCase()
      let voice = voiceIds[voiceKey]

      console.log("🔍 [VOICE DEBUG] generateAudioResponse called with:")
      console.log("🔍 [VOICE DEBUG] - persona:", persona)
      console.log("🔍 [VOICE DEBUG] - voiceKey:", voiceKey)
      console.log("🔍 [VOICE DEBUG] - voiceIds state:", voiceIds)
      console.log("🔍 [VOICE DEBUG] - voice found:", voice)

      if (!voice) {
        console.log(`🔍 [VOICE DEBUG] No voice ID found for ${persona} (key: ${voiceKey}), using echo`)
        voice = "echo"
      } else {
        console.log(`🔍 [VOICE DEBUG] Using voice ID for ${persona}: ${voice}`)
      }

      console.log(`🔍 [VOICE DEBUG] Generating audio for ${persona} with voice: ${voice}`)

      // Use regular speak API instead of streaming
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          voice: voice,
        }),
      })

      if (!response.ok) {
        throw new Error(`Audio generation failed: ${response.status}`)
      }

      const { audioUrl } = await response.json()

      // Create audio element and play
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        console.log("🔍 [AUDIO DEBUG] Audio playback completed")
      }

      audio.onerror = (e) => {
        console.error("🔍 [AUDIO DEBUG] Audio playback error:", e)
        setAudioError("Audio playback failed")
        setIsPlaying(false)
      }

      await audio.play()
      console.log("🔍 [AUDIO DEBUG] Started audio playback")
    } catch (error) {
      console.error("🔍 [AUDIO DEBUG] Error in audio generation:", error)
      setAudioError(`Audio error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  const toggleMode = () => {
    console.log("🔍 [MODE DEBUG] Toggling mode from", mode, "to", mode === "question" ? "debate" : "question")
    setMode(mode === "question" ? "debate" : "question")
    setSelectedPersona("")
    currentPersonaRef.current = ""
    setSelectedCharacters([])
    setIsListening(false)
    setIsProcessing(false)
    setIsPlaying(false)
    setAudioError(null)
    setThinkingMessage("")
    setIsDebating(false)
    setDebateTopic("")
    setShowTopicSelector(false)
    setTopics([])
  }

  const handleRecordingButtonClick = useCallback(
    async (characterId, e) => {
      e.stopPropagation()
      console.log("🔍 [BUTTON DEBUG] Recording button clicked for character:", characterId)

      if (mode === "question") {
        if (selectedPersona === characterId) {
          // If this character is selected and we're listening, stop recording
          if (isListening) {
            console.log("🔍 [BUTTON DEBUG] Stopping recording...")
            stopListening()
          } else if (!isProcessing && !isPlaying) {
            // If not currently doing anything, start recording again
            console.log("🔍 [BUTTON DEBUG] Starting new recording...")
            await startListening()
          }
        } else {
          // Select new character and start recording
          console.log("🔍 [BUTTON DEBUG] Selecting new character and starting recording...")
          setSelectedPersona(characterId)
          currentPersonaRef.current = characterId
          setSelectedCharacters([characterId])
          await startListening()
        }
      }
    },
    [mode, selectedPersona, isListening, isProcessing, isPlaying, startListening, stopListening],
  )

  // Handle debate topic selection
  const handleTopicSelect = useCallback(
    (topic) => {
      console.log("🔍 [DEBATE DEBUG] Topic selected:", topic)
      console.log("🔍 [DEBATE DEBUG] Selected characters:", selectedCharacters)
      setDebateTopic(topic.title || topic)
      setIsDebating(true)
      setShowTopicSelector(false)
      console.log("🔍 [DEBATE DEBUG] Set isDebating to true, debateTopic to:", topic.title || topic)
    },
    [selectedCharacters],
  )

  // Handle debate end/reset
  const handleDebateEnd = useCallback(() => {
    console.log("🔍 [DEBATE DEBUG] Debate manually ended, returning to home")
    setIsDebating(false)
    setDebateTopic("")
    setSelectedCharacters([])
    setShowTopicSelector(false)
    setTopics([])
  }, [])

  // Small microphone icon component - Fixed SVG path
  const SmallMicIcon = ({ isActive }) => (
    <svg
      className={`w-4 h-4 ${isActive ? "text-orange-400 animate-pulse" : "text-gray-400"}`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  )

  // Get status text for button display
  const getStatusText = (characterId) => {
    if (selectedPersona !== characterId) return "Ask Question"

    if (isListening) return "Stop Recording"
    if (isProcessing) return thinkingMessage || "Processing..."
    if (isPlaying) return "Speaking..."
    return "Ask Question"
  }

  // Get button color based on status
  const getButtonColor = (characterId) => {
    if (selectedPersona !== characterId) return "bg-gray-700 text-white hover:bg-gray-600"

    if (isListening) return "bg-red-500 text-white"
    if (isProcessing) return "bg-blue-500 text-white"
    if (isPlaying) return "bg-green-500 text-white"
    return "bg-yellow-500 text-black"
  }

  // Determine if character should be grayed out
  const shouldGrayOutCharacter = (characterId) => {
    if (mode === "question") {
      const isInteracting = isListening || isProcessing || isPlaying
      return isInteracting && selectedPersona !== characterId
    } else if (mode === "debate") {
      // In debate mode, gray out if 2 characters are selected and this isn't one of them
      return selectedCharacters.length === 2 && !selectedCharacters.includes(characterId)
    }
    return false
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-yellow-400">Loading personas...</p>
          </div>
        </div>
      </Layout>
    )
  }

  console.log("🔍 [RENDER DEBUG] Current state:")
  console.log("🔍 [RENDER DEBUG] - mode:", mode)
  console.log("🔍 [RENDER DEBUG] - isDebating:", isDebating)
  console.log("🔍 [RENDER DEBUG] - selectedCharacters:", selectedCharacters)
  console.log("🔍 [RENDER DEBUG] - debateTopic:", debateTopic)
  console.log("🔍 [RENDER DEBUG] - showTopicSelector:", showTopicSelector)

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Heroes of History
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Engage in conversations and debates with history's greatest minds
            </p>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-800 rounded-full p-1 flex">
                <button
                  onClick={toggleMode}
                  className={`px-6 py-3 rounded-full transition-all duration-300 ${
                    mode === "question" ? "bg-yellow-500 text-black font-semibold" : "text-gray-300 hover:text-white"
                  }`}
                >
                  Ask Questions
                </button>
                <button
                  onClick={toggleMode}
                  className={`px-6 py-3 rounded-full transition-all duration-300 ${
                    mode === "debate" ? "bg-yellow-500 text-black font-semibold" : "text-gray-300 hover:text-white"
                  }`}
                >
                  Watch Debates
                </button>
              </div>
            </div>
          </div>

          {isLoadingVoices && (
            <div className="mb-8 p-4 bg-yellow-800 text-yellow-100 rounded-lg text-center">
              <div className="inline-block animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full mr-2"></div>
              Loading voice data... Please wait.
            </div>
          )}

          {/* Debug Info */}
          <div className="mb-8 p-4 bg-gray-800 text-gray-300 rounded-lg text-xs">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <p>Mode: {mode}</p>
            <p>Selected Characters: {JSON.stringify(selectedCharacters)}</p>
            <p>Is Debating: {isDebating.toString()}</p>
            <p>Debate Topic: {debateTopic}</p>
            <p>Show Topic Selector: {showTopicSelector.toString()}</p>
            <p>Voice IDs: {JSON.stringify(voiceIds)}</p>
          </div>

          {/* Instructions */}
          <div className="text-center mb-8">
            {mode === "debate" && selectedCharacters.length < 2 && (
              <p className="text-lg text-gray-300">
                Select two historical figures to watch them debate fascinating topics
              </p>
            )}
          </div>

          {/* Character Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
            {Object.entries(personas).map(([key, persona]) => {
              const isSelected = mode === "question" ? selectedPersona === key : selectedCharacters.includes(key)
              const shouldGrayOut = shouldGrayOutCharacter(key)

              return (
                <div
                  key={key}
                  className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                    isSelected ? "ring-4 ring-yellow-400" : ""
                  } ${shouldGrayOut ? "opacity-30" : ""}`}
                >
                  <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-square relative">
                    <div className="h-2/3">
                      <img
                        src={persona.image || "/placeholder.svg"}
                        alt={persona.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-3 h-1/3 flex flex-col justify-between">
                      <h3 className="text-sm font-bold text-yellow-400 truncate">{persona.name}</h3>

                      {/* Dynamic Button */}
                      <div className="mt-2 flex space-x-1">
                        {mode === "question" ? (
                          <>
                            <button
                              onClick={(e) => handleRecordingButtonClick(key, e)}
                              disabled={shouldGrayOut}
                              className={`flex-1 py-1 px-2 rounded text-xs font-semibold transition-all duration-300 flex items-center justify-center space-x-1 ${getButtonColor(key)} ${
                                shouldGrayOut ? "bg-gray-600 text-gray-400 cursor-not-allowed" : ""
                              }`}
                            >
                              <SmallMicIcon isActive={selectedPersona === key && isListening} />
                              <span className="truncate">{getStatusText(key)}</span>
                            </button>

                            {/* Pause/Resume/Stop buttons when playing */}
                            {selectedPersona === key && isPlaying && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    pauseAudio()
                                  }}
                                  className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                                  title="Pause"
                                >
                                  ⏸
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    stopAudio()
                                  }}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                  title="Stop"
                                >
                                  ⏹
                                </button>
                              </>
                            )}

                            {/* Resume button when paused */}
                            {selectedPersona === key &&
                              !isPlaying &&
                              audioRef.current &&
                              audioRef.current.currentTime > 0 &&
                              !audioRef.current.ended && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    resumeAudio()
                                  }}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                  title="Resume"
                                >
                                  ▶
                                </button>
                              )}
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCharacterSelect(key)
                            }}
                            className={`w-full py-1 px-2 rounded text-xs font-semibold transition-all duration-300 ${
                              selectedCharacters.includes(key)
                                ? "bg-yellow-500 text-black"
                                : selectedCharacters.length >= 2
                                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                  : "bg-gray-700 text-white hover:bg-gray-600"
                            }`}
                            disabled={selectedCharacters.length >= 2 && !selectedCharacters.includes(key)}
                          >
                            {selectedCharacters.includes(key)
                              ? "Selected"
                              : selectedCharacters.length >= 2
                                ? "Max 2"
                                : "Select"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Audio Error Display */}
          {audioError && <div className="mb-8 p-4 bg-red-900 text-red-100 rounded-lg text-center">{audioError}</div>}

          {/* Topic Selector - Inline */}
          {showTopicSelector && selectedCharacters.length === 2 && !isDebating && (
            <div className="w-full max-w-4xl mx-auto mb-8">
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">Choose a Debate Topic</h2>

                {loadingTopics ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mr-3"></div>
                    <span className="text-gray-300">Generating topics...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topics.map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => handleTopicSelect(topic)}
                        className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition-all duration-300 hover:scale-105 border border-gray-600 hover:border-yellow-400"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-yellow-400 flex-1">{topic.title}</h3>
                          <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full ml-2">
                            {topic.category}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">{topic.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debate Interface */}
          {mode === "debate" && isDebating && selectedCharacters.length === 2 && (
            <div className="mb-8">
              <div className="bg-red-800 p-4 rounded-lg mb-4">
                <p className="text-white font-bold">🔍 DEBATE DEBUG: About to render DebateInterface</p>
                <p className="text-gray-200">Character1: {selectedCharacters[0]}</p>
                <p className="text-gray-200">Character2: {selectedCharacters[1]}</p>
                <p className="text-gray-200">Topic: {debateTopic}</p>
              </div>
              <DebateInterface
                character1={selectedCharacters[0]}
                character2={selectedCharacters[1]}
                initialTopic={debateTopic}
                onDebateEnd={handleDebateEnd}
                embedded={true}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
