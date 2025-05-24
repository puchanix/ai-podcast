"use client"

import { useState, useEffect, useRef } from "react"
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

  // Audio refs
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)

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

  const handleCharacterSelect = async (characterId) => {
    if (mode === "question") {
      setSelectedPersona(characterId)
      setSelectedCharacters([characterId])
      // Immediately start recording when character is selected
      await startListening()
    } else if (mode === "debate") {
      if (selectedCharacters.includes(characterId)) {
        setSelectedCharacters(selectedCharacters.filter((id) => id !== characterId))
      } else if (selectedCharacters.length < 2) {
        setSelectedCharacters([...selectedCharacters, characterId])
      }
    }
  }

  const startListening = async () => {
    try {
      setAudioError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        await processAudioQuestion(audioBlob)
      }

      mediaRecorder.start()
      setIsListening(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      setAudioError("Could not access microphone. Please check permissions.")
    }
  }

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop()
      setIsListening(false)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }

  const processAudioQuestion = async (audioBlob) => {
    if (!selectedPersona) {
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
      await processQuestionWithStreaming(text, selectedPersona)
    } catch (error) {
      console.error("Error processing audio question:", error)
      setAudioError(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

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
    setSelectedCharacters([])
    setIsListening(false)
    setIsProcessing(false)
    setIsPlaying(false)
    setAudioError(null)
  }

  const handleButtonClick = async (characterId) => {
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
        setSelectedCharacters([characterId])
        await startListening()
      }
    }
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

          {/* Audio Error Display */}
          {audioError && <div className="mb-8 p-4 bg-red-900 text-red-100 rounded-lg text-center">{audioError}</div>}

          {/* Audio Playing Indicator */}
          {isPlaying && (
            <div className="mb-8 text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-yellow-400 rounded-full animate-pulse"
                      style={{
                        height: "20px",
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: "0.6s",
                      }}
                    />
                  ))}
                </div>
                <span className="text-yellow-400">Playing response...</span>
              </div>
            </div>
          )}

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
