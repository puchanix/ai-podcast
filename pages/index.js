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

  const handleCharacterSelect = (characterId) => {
    if (mode === "question") {
      setSelectedPersona(characterId)
      setSelectedCharacters([characterId])
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

      // Start streaming audio generation immediately
      await streamAudioResponse(responseText, persona)
    } catch (error) {
      console.error("Error in parallel processing:", error)
      setAudioError(`Error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  // New streaming audio function
  const streamAudioResponse = async (text, persona) => {
    try {
      // Get voice for character
      const character = personas[persona]
      const voice = character?.voiceId || (character?.getVoiceId ? character.getVoiceId() : "echo")

      console.log(`Streaming audio for ${persona} with voice: ${voice}`)

      // Start audio generation with streaming
      const response = await fetch("/api/stream-audio-realtime", {
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

      // Handle streaming response
      const reader = response.body.getReader()
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = new ArrayBuffer(0)
      let completeBuffer = new Uint8Array(0) // Accumulate all received data

      // Create audio element for playback
      const audio = new Audio()
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

      // Read streaming chunks
      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              console.log("Stream completed")

              // Play the complete buffer
              const blob = new Blob([completeBuffer], { type: "audio/mpeg" })
              const audioUrl = URL.createObjectURL(blob)
              audio.src = audioUrl

              try {
                await audio.play()
                console.log("Started audio playback from complete buffer")
              } catch (playError) {
                console.error("Error starting audio playback:", playError)
                setAudioError("Failed to start audio playback")
                setIsPlaying(false)
              }
              break
            }

            // Append new chunk to the complete buffer
            const newCompleteBuffer = new Uint8Array(completeBuffer.length + value.length)
            newCompleteBuffer.set(completeBuffer, 0)
            newCompleteBuffer.set(value, completeBuffer.length)
            completeBuffer = newCompleteBuffer
          }
        } catch (streamError) {
          console.error("Stream processing error:", streamError)
          setAudioError("Audio streaming failed")
          setIsPlaying(false)
        }
      }

      await processStream()
    } catch (error) {
      console.error("Error in streaming audio:", error)
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
  }

  const handleAskQuestionClick = async () => {
    if (!isListening) {
      await startListening()
    } else {
      stopListening()
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {Object.entries(personas).map(([key, persona]) => (
              <div
                key={key}
                onClick={() => handleCharacterSelect(key)}
                className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                  mode === "question"
                    ? selectedPersona === key
                      ? "ring-4 ring-yellow-400"
                      : ""
                    : selectedCharacters.includes(key)
                      ? "ring-4 ring-yellow-400"
                      : ""
                }`}
              >
                <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
                  <div className="aspect-w-3 aspect-h-4">
                    <img
                      src={persona.image || "/placeholder.svg"}
                      alt={persona.name}
                      className="w-full h-24 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-bold mb-2 text-yellow-400">{persona.name}</h3>
                    <p className="text-gray-300 mb-4">{persona.period}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{persona.description}</p>

                    {/* Dynamic Button */}
                    <div className="mt-4">
                      {mode === "question" ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCharacterSelect(key)
                          }}
                          className={`w-full py-2 px-4 rounded-lg font-semibold transition-all duration-300 ${
                            selectedPersona === key
                              ? "bg-yellow-500 text-black"
                              : "bg-gray-700 text-white hover:bg-gray-600"
                          }`}
                        >
                          {selectedPersona === key ? "Selected" : "Ask a Question"}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCharacterSelect(key)
                          }}
                          className={`w-full py-2 px-4 rounded-lg font-semibold transition-all duration-300 ${
                            selectedCharacters.includes(key)
                              ? "bg-yellow-500 text-black"
                              : selectedCharacters.length >= 2
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : "bg-gray-700 text-white hover:bg-gray-600"
                          }`}
                          disabled={selectedCharacters.length >= 2 && !selectedCharacters.includes(key)}
                        >
                          {selectedCharacters.includes(key)
                            ? "Selected for Debate"
                            : selectedCharacters.length >= 2
                              ? "Max 2 Characters"
                              : "Select for Debate"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Section */}
          {mode === "question" && selectedPersona && (
            <div className="text-center">
              <div className="bg-gray-800 rounded-xl p-8 max-w-md mx-auto">
                <h3 className="text-2xl font-bold mb-4 text-yellow-400">Ask {personas[selectedPersona]?.name}</h3>

                {audioError && <div className="mb-4 p-3 bg-red-900 text-red-100 rounded-lg text-sm">{audioError}</div>}

                <button
                  onClick={handleAskQuestionClick}
                  disabled={isProcessing || isPlaying}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                    isListening
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : isProcessing
                        ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                        : isPlaying
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : "bg-yellow-500 hover:bg-yellow-600 text-black"
                  }`}
                >
                  {isListening
                    ? "🎤 Recording (Click to finish)"
                    : isProcessing
                      ? "🤔 Processing..."
                      : isPlaying
                        ? "🔊 Playing Response..."
                        : "🎤 Ask Question"}
                </button>

                {isPlaying && (
                  <div className="mt-4 flex justify-center">
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
                  </div>
                )}

                <p className="text-sm text-gray-400 mt-4">
                  Click the microphone button to ask your question, then click again to stop recording.
                </p>
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
