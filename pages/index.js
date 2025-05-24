"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  const [personas, setPersonas] = useState({})
  const [showTopicSelector, setShowTopicSelector] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Debate state
  const [isDebating, setIsDebating] = useState(false)
  const [debateTopic, setDebateTopic] = useState("")
  const [topics, setTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [debateMessages, setDebateMessages] = useState([])
  const [currentSpeaker, setCurrentSpeaker] = useState(null)
  const [speakerStatus, setSpeakerStatus] = useState(null) // 'thinking', 'speaking', 'waiting'

  // Audio refs
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const currentPersonaRef = useRef("") // Use ref to track current persona
  const currentAudioRef = useRef(null)

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
          console.log("🔍 [VOICE DEBUG] Voice IDs keys:", Object.keys(data))
          console.log("🔍 [VOICE DEBUG] Voice IDs values:", Object.values(data))

          // Log each individual voice ID
          Object.entries(data).forEach(([key, value]) => {
            console.log(`🔍 [VOICE DEBUG] ${key}: ${value} (type: ${typeof value})`)
          })

          setVoiceIds(data)
        } else {
          console.error("🔍 [VOICE DEBUG] Failed to load voice IDs, status:", response.status)
        }
      } catch (error) {
        console.error("🔍 [VOICE DEBUG] Error loading voice IDs:", error)
      } finally {
        setIsLoadingVoices(false)
      }
    }

    loadVoiceIds()
  }, [])

  // Load personas when component mounts
  useEffect(() => {
    async function loadPersonas() {
      try {
        console.log("🔍 [PERSONA DEBUG] Loading personas...")
        const personasModule = await import("../lib/personas")
        setPersonas(personasModule.personas)
        console.log("🔍 [PERSONA DEBUG] Personas loaded:", Object.keys(personasModule.personas))
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

          if (response.ok) {
            const data = await response.json()
            console.log("🔍 [TOPIC DEBUG] Topics received:", data)
            setTopics(data.topics || [])
          } else {
            console.error("🔍 [TOPIC DEBUG] Failed to fetch topics:", response.status)
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
            ])
          }
        } catch (error) {
          console.error("🔍 [TOPIC DEBUG] Error fetching topics:", error)
          setTopics([
            {
              id: "fallback-1",
              title: "Philosophy and Wisdom",
              description: "The nature of knowledge and understanding",
              category: "philosophy",
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
      }, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isProcessing])

  const handleCharacterSelect = useCallback(
    async (characterId) => {
      console.log("🔍 [CHARACTER DEBUG] Character selected:", characterId)
      if (mode === "question") {
        setSelectedPersona(characterId)
        currentPersonaRef.current = characterId
        setSelectedCharacters([characterId])
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
            setDebateMessages([])
            setCurrentSpeaker(null)
            setSpeakerStatus(null)
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

      await processQuestionWithStreaming(text, currentPersona)
    } catch (error) {
      console.error("🔍 [AUDIO DEBUG] Error processing audio question:", error)
      setAudioError(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
      setThinkingMessage("")
    }
  }, [])

  const processQuestionWithStreaming = async (question, persona) => {
    try {
      setIsPlaying(true)

      const textResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          persona: persona,
        }),
      })

      if (!textResponse.ok) {
        throw new Error("Failed to generate response")
      }

      const { response: responseText } = await textResponse.json()
      console.log("🔍 [AUDIO DEBUG] Generated response:", responseText)

      await generateAudioResponse(responseText, persona)
    } catch (error) {
      console.error("🔍 [AUDIO DEBUG] Error in parallel processing:", error)
      setAudioError(`Error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  const generateAudioResponse = async (text, persona) => {
    try {
      const voiceKey = persona === "daVinci" ? "davinci" : persona.toLowerCase()

      console.log("🔍 [VOICE DEBUG] generateAudioResponse called with:")
      console.log("🔍 [VOICE DEBUG] - persona:", persona)
      console.log("🔍 [VOICE DEBUG] - voiceKey:", voiceKey)
      console.log("🔍 [VOICE DEBUG] - voiceIds state:", voiceIds)
      console.log("🔍 [VOICE DEBUG] - voiceIds keys:", Object.keys(voiceIds))
      console.log("🔍 [VOICE DEBUG] - voiceIds[voiceKey]:", voiceIds[voiceKey])
      console.log("🔍 [VOICE DEBUG] - typeof voiceIds[voiceKey]:", typeof voiceIds[voiceKey])

      let voice = voiceIds[voiceKey]

      if (voice && voice.length > 10) {
        console.log(`🔍 [VOICE DEBUG] Using custom voice ID for ${persona}: ${voice}`)
      } else {
        console.log(`🔍 [VOICE DEBUG] No voice ID found for ${persona} (key: ${voiceKey}), using echo`)
        voice = "echo"
      }

      console.log(`🔍 [VOICE DEBUG] Final voice for ${persona}: ${voice}`)

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
        const errorText = await response.text()
        console.error("🔍 [VOICE DEBUG] Speak API error response:", errorText)
        throw new Error(`Audio generation failed: ${response.status} - ${errorText}`)
      }

      const { audioUrl } = await response.json()

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

  // Start debate function
  const startDebate = async (topic) => {
    console.log("🔍 [DEBATE DEBUG] Starting debate with topic:", topic)

    if (!selectedCharacters || selectedCharacters.length !== 2) {
      console.error("🔍 [DEBATE DEBUG] Invalid characters:", selectedCharacters)
      return
    }

    setIsDebating(true)
    setDebateTopic(topic)
    setCurrentSpeaker(selectedCharacters[0])
    setSpeakerStatus("thinking")
    setDebateMessages([])

    try {
      const response = await fetch("/api/start-debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character1: selectedCharacters[0],
          character2: selectedCharacters[1],
          topic,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to start debate: ${response.status}`)
      }

      const data = await response.json()
      console.log("🔍 [DEBATE DEBUG] Debate started successfully:", data)

      const messages = [
        {
          character: selectedCharacters[0],
          content: data.opening1,
          timestamp: Date.now(),
        },
        {
          character: selectedCharacters[1],
          content: data.opening2,
          timestamp: Date.now() + 100,
        },
      ]

      setDebateMessages(messages)

      // Start playing first message
      playDebateAudio(messages[0], messages, 0)
    } catch (error) {
      console.error("🔍 [DEBATE DEBUG] Error starting debate:", error)
      setAudioError(`Failed to start debate: ${error.message}`)
      setIsDebating(false)
      setSpeakerStatus(null)
      setCurrentSpeaker(null)
    }
  }

  // Play debate audio
  const playDebateAudio = async (message, allMessages, currentIndex) => {
    const { character, content } = message
    console.log(`🔍 [DEBATE DEBUG] Playing audio for ${character}`)

    setCurrentSpeaker(character)
    setSpeakerStatus("speaking")

    try {
      const voiceKey = character === "daVinci" ? "davinci" : character.toLowerCase()
      const voice = voiceIds[voiceKey] || "echo"

      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, voice }),
      })

      if (!response.ok) {
        throw new Error(`Audio API returned ${response.status}`)
      }

      const data = await response.json()
      const audio = new Audio(data.audioUrl)
      currentAudioRef.current = audio

      audio.onended = () => {
        console.log(`🔍 [DEBATE DEBUG] ${character} finished speaking`)
        setSpeakerStatus("waiting")

        // Auto-continue to next message
        const nextIndex = currentIndex + 1
        if (nextIndex < allMessages.length) {
          setTimeout(() => {
            playDebateAudio(allMessages[nextIndex], allMessages, nextIndex)
          }, 1000)
        } else {
          // Debate finished for now
          setTimeout(() => {
            endDebate()
          }, 2000)
        }
      }

      audio.onerror = (e) => {
        throw new Error(`Audio playback failed: ${e.message}`)
      }

      await audio.play()
    } catch (error) {
      console.error(`🔍 [DEBATE DEBUG] Error playing audio for ${character}:`, error)
      setAudioError(`Audio failed for ${character}: ${error.message}`)
      setSpeakerStatus(null)
    }
  }

  const endDebate = () => {
    console.log("🔍 [DEBATE DEBUG] Ending debate")
    setIsDebating(false)
    setDebateTopic("")
    setSelectedCharacters([])
    setShowTopicSelector(false)
    setTopics([])
    setDebateMessages([])
    setCurrentSpeaker(null)
    setSpeakerStatus(null)

    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
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
    setDebateMessages([])
    setCurrentSpeaker(null)
    setSpeakerStatus(null)
  }

  const handleRecordingButtonClick = useCallback(
    async (characterId, e) => {
      e.stopPropagation()
      console.log("🔍 [BUTTON DEBUG] Recording button clicked for character:", characterId)

      if (mode === "question") {
        if (selectedPersona === characterId) {
          if (isListening) {
            console.log("🔍 [BUTTON DEBUG] Stopping recording...")
            stopListening()
          } else if (!isProcessing && !isPlaying) {
            console.log("🔍 [BUTTON DEBUG] Starting new recording...")
            await startListening()
          }
        } else {
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

  const handleTopicSelect = useCallback(
    (topic) => {
      console.log("🔍 [DEBATE DEBUG] Topic selected:", topic)
      console.log("🔍 [DEBATE DEBUG] Selected characters:", selectedCharacters)
      setShowTopicSelector(false)
      startDebate(topic.title || topic)
    },
    [selectedCharacters],
  )

  // Small microphone icon component
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
    if (mode === "debate" && isDebating) {
      if (characterId === currentSpeaker) {
        return speakerStatus === "thinking"
          ? "Thinking..."
          : speakerStatus === "speaking"
            ? "Speaking..."
            : "Waiting..."
      }
      return selectedCharacters.includes(characterId) ? "Waiting turn" : "Watching"
    }

    if (selectedPersona !== characterId) return "Ask Question"
    if (isListening) return "Stop Recording"
    if (isProcessing) return thinkingMessage || "Processing..."
    if (isPlaying) return "Speaking..."
    return "Ask Question"
  }

  // Get button color based on status
  const getButtonColor = (characterId) => {
    if (mode === "debate" && isDebating) {
      if (characterId === currentSpeaker) {
        return speakerStatus === "thinking"
          ? "bg-blue-500 text-white"
          : speakerStatus === "speaking"
            ? "bg-green-500 text-white"
            : "bg-yellow-500 text-black"
      }
      return selectedCharacters.includes(characterId) ? "bg-purple-600 text-white" : "bg-gray-600 text-gray-400"
    }

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
      if (isDebating) {
        return !selectedCharacters.includes(characterId)
      }
      return selectedCharacters.length === 2 && !selectedCharacters.includes(characterId)
    }
    return false
  }

  // Get the latest message for a character
  const getLatestMessage = (characterId) => {
    const characterMessages = debateMessages.filter((msg) => msg.character === characterId)
    return characterMessages.length > 0 ? characterMessages[characterMessages.length - 1].content : null
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

          {/* Debate Topic Display */}
          {isDebating && debateTopic && (
            <div className="mb-8 text-center">
              <div className="bg-gray-800 rounded-lg p-4 inline-block">
                <h2 className="text-xl font-bold text-yellow-400 mb-2">Current Debate Topic</h2>
                <p className="text-gray-300">{debateTopic}</p>
                <button
                  onClick={endDebate}
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                >
                  End Debate
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-center mb-8">
            {mode === "debate" && selectedCharacters.length < 2 && !isDebating && (
              <p className="text-lg text-gray-300">
                Select two historical figures to watch them debate fascinating topics
              </p>
            )}
          </div>

          {/* Character Grid - SINGLE UNIFIED INTERFACE */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
            {Object.entries(personas).map(([key, persona]) => {
              const isSelected = mode === "question" ? selectedPersona === key : selectedCharacters.includes(key)
              const shouldGrayOut = shouldGrayOutCharacter(key)
              const latestMessage = getLatestMessage(key)
              const isCurrentDebateSpeaker = currentSpeaker === key

              return (
                <div
                  key={key}
                  className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                    isSelected ? "ring-4 ring-yellow-400" : ""
                  } ${shouldGrayOut ? "opacity-30" : ""} ${isCurrentDebateSpeaker ? "ring-4 ring-green-400" : ""}`}
                >
                  <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl aspect-square relative">
                    <div className="h-2/3">
                      <img
                        src={persona.image || "/placeholder.svg"}
                        alt={persona.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />

                      {/* Speaking animation overlay */}
                      {isCurrentDebateSpeaker && speakerStatus === "speaking" && (
                        <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>

                    <div className="p-3 h-1/3 flex flex-col justify-between">
                      <h3 className="text-sm font-bold text-yellow-400 truncate">{persona.name}</h3>

                      {/* Show latest debate message if available */}
                      {latestMessage && mode === "debate" && isDebating && (
                        <div className="mt-1 mb-2 p-2 bg-gray-700 rounded text-xs text-gray-300 max-h-16 overflow-hidden">
                          {latestMessage.length > 60 ? latestMessage.substring(0, 60) + "..." : latestMessage}
                        </div>
                      )}

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
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!isDebating) {
                                handleCharacterSelect(key)
                              }
                            }}
                            className={`w-full py-1 px-2 rounded text-xs font-semibold transition-all duration-300 ${getButtonColor(key)}`}
                            disabled={
                              isDebating || (selectedCharacters.length >= 2 && !selectedCharacters.includes(key))
                            }
                          >
                            <span className="truncate">{getStatusText(key)}</span>
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

          {/* NO MORE DUPLICATE DEBATE INTERFACE - Everything is integrated above! */}
        </div>
      </div>
    </Layout>
  )
}
