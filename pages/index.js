"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { personas } from "../lib/personas"
import Layout from "../components/layout"

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
        const response = await fetch("/api/get-voice-ids")
        if (response.ok) {
          const data = await response.json()
          setVoiceIds(data)
          console.log("Voice IDs loaded:", data)

          // Update personas with voice IDs
          Object.keys(personas).forEach((key) => {
            const voiceKey = key === "daVinci" ? "davinci" : key.toLowerCase()
            if (data[voiceKey]) {
              personas[key].voiceId = data[voiceKey]
              console.log(`Updated voice ID for ${key}: ${data[voiceKey]}`)
            }
          })
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

  // Update ref when selectedPersona changes
  useEffect(() => {
    currentPersonaRef.current = selectedPersona
    console.log("Selected persona updated to:", selectedPersona)
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
      console.log("Character selected:", characterId)
      if (mode === "question") {
        // Update both state and ref immediately
        setSelectedPersona(characterId)
        currentPersonaRef.current = characterId
        setSelectedCharacters([characterId])

        console.log("About to start listening for:", characterId)
        // Start recording immediately
        await startListening()
      } else if (mode === "debate") {
        if (selectedCharacters.includes(characterId)) {
          setSelectedCharacters(selectedCharacters.filter((id) => id !== characterId))
        } else if (selectedCharacters.length < 2) {
          setSelectedCharacters([...selectedCharacters, characterId])
        }
      }
    },
    [mode, selectedCharacters],
  )

  const startListening = useCallback(async () => {
    try {
      console.log("Starting to listen...")
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
        console.log("Recording stopped")
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        await processAudioQuestion(audioBlob)
      }

      mediaRecorder.start()
      setIsListening(true)
      console.log("Recording started")
    } catch (error) {
      console.error("Error accessing microphone:", error)
      setAudioError("Could not access microphone. Please check permissions.")
    }
  }, [])

  const stopListening = useCallback(() => {
    console.log("Stop listening called")
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop()
      setIsListening(false)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [isListening])

  const pauseAudio = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [isPlaying])

  const resumeAudio = useCallback(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }, [])

  const processAudioQuestion = useCallback(async (audioBlob) => {
    // Use the ref value instead of state
    const currentPersona = currentPersonaRef.current
    console.log("Processing audio question, selectedPersona from ref:", currentPersona)

    if (!currentPersona) {
      console.error("No persona selected!")
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
      console.log("Transcribed text:", text)

      if (!text || text.trim().length === 0) {
        throw new Error("No speech detected. Please try again.")
      }

      // Start parallel processing: text generation and audio preparation
      await processQuestionWithStreaming(text, currentPersona)
    } catch (error) {
      console.error("Error processing audio question:", error)
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
      console.log("Generated response:", responseText)

      // Use regular audio generation instead of streaming to avoid 504 errors
      await generateAudioResponse(responseText, persona)
    } catch (error) {
      console.error("Error in parallel processing:", error)
      setAudioError(`Error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  // Fallback to regular audio generation to avoid 504 timeouts
  const generateAudioResponse = async (text, persona) => {
    try {
      // Get voice for character
      const character = personas[persona]
      const voice = character?.voiceId || (character?.getVoiceId ? character.getVoiceId() : "echo")

      console.log(`Generating audio for ${persona} with voice: ${voice}`)

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
        console.log("Audio playback completed")
      }

      audio.onerror = (e) => {
        console.error("Audio playback error:", e)
        setAudioError("Audio playback failed")
        setIsPlaying(false)
      }

      await audio.play()
      console.log("Started audio playback")
    } catch (error) {
      console.error("Error in audio generation:", error)
      setAudioError(`Audio error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  const handleDebateStart = () => {
    if (selectedCharacters.length === 2) {
      const [char1, char2] = selectedCharacters
      window.location.href = `/debate?char1=${char1}&char2=${char2}`
    }
  }

  const toggleMode = () => {
    setMode(mode === "question" ? "debate" : "question")
    setSelectedPersona("")
    currentPersonaRef.current = ""
    setSelectedCharacters([])
    setIsListening(false)
    setIsProcessing(false)
    setIsPlaying(false)
    setAudioError(null)
    setThinkingMessage("")
  }

  const handleButtonClick = useCallback(
    async (characterId) => {
      console.log("Button clicked for character:", characterId)
      if (mode === "question") {
        if (selectedPersona === characterId) {
          // If this character is selected and we're listening, stop recording
          if (isListening) {
            stopListening()
          } else if (!isProcessing && !isPlaying) {
            // If not currently doing anything, start recording again
            await startListening()
          }
        } else {
          // Select new character and start recording
          setSelectedPersona(characterId)
          currentPersonaRef.current = characterId
          setSelectedCharacters([characterId])
          await startListening()
        }
      }
    },
    [mode, selectedPersona, isListening, isProcessing, isPlaying, startListening, stopListening],
  )

  // Microphone icon component
  const MicrophoneIcon = () => (
    <div className="relative flex items-center justify-center">
      {/* Microphone SVG */}
      <svg className="w-6 h-6 text-yellow-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>

      {/* Radiating circles */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400 rounded-full animate-ping opacity-30"></div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-12 h-12 border-2 border-yellow-400 rounded-full animate-ping opacity-20"
          style={{ animationDelay: "0.5s" }}
        ></div>
      </div>
    </div>
  )

  // Status display for character tiles
  const getCharacterStatus = (characterId) => {
    if (selectedPersona !== characterId) return null

    if (isListening) {
      return (
        <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-xl flex items-center justify-center">
          <div className="bg-red-500 rounded-lg p-2 flex items-center space-x-2">
            <MicrophoneIcon />
            <span className="text-white text-sm font-semibold">Recording...</span>
          </div>
        </div>
      )
    }

    if (isProcessing) {
      return (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
          <div className="bg-blue-500 rounded-lg p-2 flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
            <span className="text-white text-sm font-semibold">{thinkingMessage}</span>
          </div>
        </div>
      )
    }

    if (isPlaying) {
      return (
        <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center">
          <div className="bg-green-500 rounded-lg p-2 flex items-center space-x-2">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-white rounded-full animate-pulse"
                  style={{
                    height: "16px",
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: "0.6s",
                  }}
                />
              ))}
            </div>
            <span className="text-white text-sm font-semibold">Speaking...</span>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header - No floating bar, just content */}
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

          {/* Instructions */}
          <div className="text-center mb-8">
            {mode === "debate" && (
              <p className="text-lg text-gray-300">
                Select two historical figures to watch them debate fascinating topics
              </p>
            )}
          </div>

          {/* Character Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
            {Object.entries(personas).map(([key, persona]) => {
              const isSelected = mode === "question" ? selectedPersona === key : selectedCharacters.includes(key)
              const isInteracting = mode === "question" && (isListening || isProcessing || isPlaying)
              const shouldGrayOut = isInteracting && selectedPersona !== key

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
                              onClick={(e) => {
                                e.stopPropagation()
                                handleButtonClick(key)
                              }}
                              disabled={shouldGrayOut}
                              className={`flex-1 py-1 px-2 rounded text-xs font-semibold transition-all duration-300 ${
                                selectedPersona === key && isListening
                                  ? "bg-red-500 text-white animate-pulse"
                                  : selectedPersona === key && isProcessing
                                    ? "bg-blue-500 text-white"
                                    : selectedPersona === key && isPlaying
                                      ? "bg-green-500 text-white"
                                      : selectedPersona === key
                                        ? "bg-yellow-500 text-black"
                                        : shouldGrayOut
                                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                          : "bg-gray-700 text-white hover:bg-gray-600"
                              }`}
                            >
                              {selectedPersona === key && isListening
                                ? "Stop Recording"
                                : selectedPersona === key && isProcessing
                                  ? "Processing..."
                                  : selectedPersona === key && isPlaying
                                    ? "Speaking..."
                                    : "Ask Question"}
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
                              audioRef.current.currentTime > 0 && (
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

                    {/* Status overlay */}
                    {getCharacterStatus(key)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Audio Error Display */}
          {audioError && <div className="mb-8 p-4 bg-red-900 text-red-100 rounded-lg text-center">{audioError}</div>}

          {mode === "debate" && (
            <div className="text-center">
              <div className="bg-gray-800 rounded-xl p-8 max-w-md mx-auto">
                <h3 className="text-2xl font-bold mb-4 text-yellow-400">Start Debate</h3>
                <p className="text-gray-300 mb-4">Selected: {selectedCharacters.length}/2 characters</p>
                {selectedCharacters.length === 2 && (
                  <p className="text-sm text-gray-400 mb-4">
                    {personas[selectedCharacters[0]]?.name} vs {personas[selectedCharacters[1]]?.name}
                  </p>
                )}
                <button
                  onClick={handleDebateStart}
                  disabled={selectedCharacters.length !== 2}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                    selectedCharacters.length === 2
                      ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {selectedCharacters.length === 2 ? "Start Debate" : "Select 2 Characters"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
