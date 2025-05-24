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
  const [audioLevel, setAudioLevel] = useState(0)

  // Audio refs
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
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

  // Audio level monitoring with useCallback to prevent recreation
  const startAudioLevelMonitoring = useCallback(
    (stream) => {
      try {
        console.log("Starting audio level monitoring...")
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const analyser = audioContext.createAnalyser()
        const microphone = audioContext.createMediaStreamSource(stream)

        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.3
        microphone.connect(analyser)

        audioContextRef.current = audioContext
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateAudioLevel = () => {
          if (analyserRef.current && audioContextRef.current && audioContextRef.current.state === "running") {
            analyserRef.current.getByteTimeDomainData(dataArray)

            // Calculate volume using time domain data
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) {
              const sample = (dataArray[i] - 128) / 128
              sum += sample * sample
            }
            const rms = Math.sqrt(sum / dataArray.length)
            const volume = Math.min(rms * 10, 1) // Amplify and normalize

            setAudioLevel(volume)
            console.log("Audio level:", volume) // Debug log

            if (isListening) {
              animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
            }
          }
        }

        updateAudioLevel()
      } catch (error) {
        console.error("Error setting up audio level monitoring:", error)
      }
    },
    [isListening],
  )

  const stopAudioLevelMonitoring = useCallback(() => {
    console.log("Stopping audio level monitoring...")
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(0)
  }, [])

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

      // Start audio level monitoring
      startAudioLevelMonitoring(stream)

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        console.log("Recording stopped")
        stopAudioLevelMonitoring()
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
  }, [startAudioLevelMonitoring, stopAudioLevelMonitoring])

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

    stopAudioLevelMonitoring()
  }, [isListening, stopAudioLevelMonitoring])

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
    stopAudioLevelMonitoring()
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

  // Voice visualizer component
  const VoiceVisualizer = () => {
    const bars = Array.from({ length: 8 }, (_, i) => {
      // Create more dynamic height based on audio level
      const baseHeight = 4
      const maxHeight = 40
      const randomVariation = Math.sin(Date.now() * 0.005 + i) * 3 // Slower sine wave variation
      const height = baseHeight + audioLevel * maxHeight + randomVariation

      return (
        <div
          key={i}
          className="bg-yellow-400 rounded-full transition-all duration-150"
          style={{
            width: "4px",
            height: `${Math.max(baseHeight, height)}px`,
          }}
        />
      )
    })

    return (
      <div className="flex items-end justify-center space-x-1 h-12">
        {bars}
        <div className="ml-4 text-sm text-gray-400">Level: {Math.round(audioLevel * 100)}%</div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
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
          <div className="mb-4 text-center text-sm text-gray-400">
            Debug: Selected Persona = "{selectedPersona}", Ref = "{currentPersonaRef.current}", Is Listening ={" "}
            {isListening.toString()}, Audio Level = {audioLevel.toFixed(2)}
          </div>

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
                  <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-square">
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
                      <div className="mt-2">
                        {mode === "question" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleButtonClick(key)
                            }}
                            disabled={shouldGrayOut}
                            className={`w-full py-1 px-2 rounded text-xs font-semibold transition-all duration-300 ${
                              selectedPersona === key && isListening
                                ? "bg-red-500 text-white animate-pulse"
                                : selectedPersona === key && isProcessing
                                  ? "bg-gray-600 text-gray-300"
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
                              ? "Recording (click to finish)"
                              : selectedPersona === key && isProcessing
                                ? "Processing..."
                                : selectedPersona === key && isPlaying
                                  ? "Playing..."
                                  : "Ask Question"}
                          </button>
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

          {/* Voice Visualizer - Show when listening */}
          {isListening && (
            <div className="mb-8 text-center">
              <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
                <h3 className="text-lg font-bold mb-4 text-yellow-400">🎤 Listening...</h3>
                <VoiceVisualizer />
                <p className="text-sm text-gray-400 mt-4">Speak your question clearly</p>
              </div>
            </div>
          )}

          {/* Processing Indicator with Rotating Messages */}
          {isProcessing && (
            <div className="mb-8 text-center">
              <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
                <div className="inline-flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <p className="text-yellow-400 font-semibold">{thinkingMessage}</p>
              </div>
            </div>
          )}

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
