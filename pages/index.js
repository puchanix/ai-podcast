"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import StickyDebateStatusBar from "../components/StickyDebateStatusBar"
import useIsMobile from "../hooks/useIsMobile"
import Layout from "../components/layout"
import { useMobileAudioUnlock } from "../hooks/useMobileAudioUnlock"

export default function Home() {
  const isMobile = useIsMobile()
  const [selectedPersona, setSelectedPersona] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const [mode, setMode] = useState("debate") // 'question' or 'debate'
  const [selectedCharacters, setSelectedCharacters] = useState([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [voiceIds, setVoiceIds] = useState({})
  const [thinkingMessage, setThinkingMessage] = useState("")
  const [personas, setPersonas] = useState({})
  const [showTopicSelector, setShowTopicSelector] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [isDebatePaused, setIsDebatePaused] = useState(false)

  // Custom topic recording state
  const [isRecordingCustomTopic, setIsRecordingCustomTopic] = useState(false)
  const [isProcessingCustomTopic, setIsProcessingCustomTopic] = useState(false)

  // Debate state
  const [isDebating, setIsDebating] = useState(false)
  const [debateTopic, setDebateTopic] = useState("")
  const [topics, setTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [debateMessages, setDebateMessages] = useState([])
  const [currentSpeaker, setCurrentSpeaker] = useState(null)
  const [speakerStatus, setSpeakerStatus] = useState(null) // 'thinking', 'speaking', 'waiting'
  const [debateRound, setDebateRound] = useState(0) // Track debate rounds

  const [showCustomTopicResult, setShowCustomTopicResult] = useState(false)
  const [customTopicText, setCustomTopicText] = useState("")

  // Question mode response state
  const [showResponseReady, setShowResponseReady] = useState(false)
  const [responseText, setResponseText] = useState("")
  const [responsePersona, setResponsePersona] = useState("")
  // Mobile audio unlock hook
  const { audioUnlocked, unlockAudio } = useMobileAudioUnlock()

  // Audio refs
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const currentPersonaRef = useRef("") // Use ref to track current persona
  const currentAudioRef = useRef(null)
  const debateMessagesRef = useRef([])
  const debateRoundRef = useRef(0)

  // Custom topic recording refs
  const customTopicMediaRecorderRef = useRef(null)
  const customTopicAudioChunksRef = useRef([])
  const customTopicStreamRef = useRef(null)

  // Debate refs
  const debateTopicRef = useRef("")
  const voiceIdsRef = useRef({})
  const selectedCharactersRef = useRef([])

  // New refs for streaming debate
  const debateQueueRef = useRef([])
  const currentDebateIndexRef = useRef(0)
  const isGeneratingNextRef = useRef(false)

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

  // Load voice IDs when component mounts - PERSIST ACROSS MODE CHANGES
  useEffect(() => {
    async function loadVoiceIds() {
      try {
        const response = await fetch("/api/get-voice-ids")
        if (response.ok) {
          const data = await response.json()
          setVoiceIds(data)
          voiceIdsRef.current = data // ALSO SET THE REF!
        }
      } catch (error) {
        console.error("Error loading voice IDs:", error)
      } finally {
        setIsLoadingVoices(false)
      }
    }

    loadVoiceIds()
  }, []) // Only run once on mount, don't depend on mode

  // Load personas when component mounts
  useEffect(() => {
    async function loadPersonas() {
      try {
        const personasModule = await import("../lib/personas")
        setPersonas(personasModule.personas)
      } catch (error) {
        console.error("Error loading personas:", error)
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
            setTopics(data.topics || [])
          } else {
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
  }, [selectedPersona])

  // Update refs for debate state
  useEffect(() => {
    debateMessagesRef.current = debateMessages
  }, [debateMessages])

  useEffect(() => {
    debateRoundRef.current = debateRound
  }, [debateRound])

  // UPDATE TOPIC REF when debateTopic changes
  useEffect(() => {
    debateTopicRef.current = debateTopic
  }, [debateTopic])

  // UPDATE VOICE IDS REF when voiceIds changes
  useEffect(() => {
    voiceIdsRef.current = voiceIds
  }, [voiceIds])

  // UPDATE SELECTED CHARACTERS REF when selectedCharacters changes
  useEffect(() => {
    selectedCharactersRef.current = selectedCharacters
  }, [selectedCharacters])

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
      // Unlock audio on first interaction
      if (!audioUnlocked) {
        await unlockAudio()
      }

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

          if (newSelection.length === 2) {
            setShowTopicSelector(true)
          } else {
            setShowTopicSelector(false)
            setIsDebating(false)
            setDebateTopic("")
            debateTopicRef.current = "" // Clear topic ref too
            setDebateMessages([])
            setCurrentSpeaker(null)
            setSpeakerStatus(null)
            setDebateRound(0)
          }

          return newSelection
        })
      }
    },
    [mode, audioUnlocked, unlockAudio],
  )

  const startListening = useCallback(async () => {
    try {
      setAudioError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        await processAudioQuestion(audioBlob)
      }

      mediaRecorder.start(1000)
      setIsListening(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      setAudioError("Could not access microphone. Please check permissions.")
    }
  }, [])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsListening(false)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }
  }, [])

  // Custom topic recording functions
  const startCustomTopicRecording = useCallback(async () => {
    try {
      setAudioError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      })
      customTopicStreamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })
      customTopicMediaRecorderRef.current = mediaRecorder
      customTopicAudioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          customTopicAudioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(customTopicAudioChunksRef.current, { type: "audio/webm" })
        await processCustomTopicAudio(audioBlob)
      }

      mediaRecorder.start(1000)
      setIsRecordingCustomTopic(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      setAudioError("Could not access microphone. Please check permissions.")
    }
  }, [])

  const stopCustomTopicRecording = useCallback(async () => {
    if (customTopicMediaRecorderRef.current && customTopicMediaRecorderRef.current.state === "recording") {
      customTopicMediaRecorderRef.current.stop()
      setIsRecordingCustomTopic(false)
    }

    if (customTopicStreamRef.current) {
      customTopicStreamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      customTopicStreamRef.current = null
    }

    // Unlock audio again using the stop recording click as user interaction
    // This ensures audio context is fresh for the upcoming debate
    if (!audioUnlocked) {
      await unlockAudio()
    }
  }, [audioUnlocked, unlockAudio])

  const processCustomTopicAudio = useCallback(
    async (audioBlob) => {
      setIsProcessingCustomTopic(true)
      setAudioError(null)

      try {
        const formData = new FormData()
        formData.append("audio", audioBlob, "custom-topic.webm")

        const transcriptionResponse = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        })

        if (!transcriptionResponse.ok) {
          const errorText = await transcriptionResponse.text()
          throw new Error("Failed to transcribe audio: " + errorText)
        }

        const { text } = await transcriptionResponse.json()

        if (!text || text.trim().length === 0) {
          throw new Error("No speech detected. Please try again.")
        }

        // Use ref instead of state for characters
        const currentCharacters = selectedCharactersRef.current

        // Validate we have characters before proceeding
        if (!currentCharacters || currentCharacters.length !== 2) {
          throw new Error("Please select two characters first")
        }

        // Don't start debate immediately - show a button instead
        setShowTopicSelector(false)
        setDebateTopic(text.trim())
        debateTopicRef.current = text.trim()

        // Show a "Start Debate" button instead of auto-starting
        setShowCustomTopicResult(true)
        setCustomTopicText(text.trim())
      } catch (error) {
        console.error("Error processing custom topic audio:", error)
        setAudioError(`Error: ${error.message}`)
      } finally {
        setIsProcessingCustomTopic(false)
      }
    },
    [], // Add dependencies
  )

  const startCustomDebate = async () => {
    // Fresh user interaction - unlock audio again
    if (!audioUnlocked) {
      await unlockAudio()
    }

    setShowCustomTopicResult(false)
    setCustomTopicText("")
    startDebateWithCharacters(customTopicText, selectedCharactersRef.current)
  }

  const pauseAudio = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      setIsPaused(true)
      // Don't set setIsPlaying(false) here!
    }
  }, [])

  const resumeAudio = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play()
      setIsPaused(false)
    }
  }, [])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setIsPaused(false)
    }
  }, [])

  const pauseDebateAudio = useCallback(() => {
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      currentAudioRef.current.pause()
      setIsDebatePaused(true)
    }
  }, [])

  const resumeDebateAudio = useCallback(() => {
    if (currentAudioRef.current && currentAudioRef.current.paused && isDebatePaused) {
      currentAudioRef.current.play()
      setIsDebatePaused(false)
    }
  }, [isDebatePaused])

  const processAudioQuestion = useCallback(async (audioBlob) => {
    const currentPersona = currentPersonaRef.current

    if (!currentPersona) {
      setAudioError("Please select a character first")
      return
    }

    setIsProcessing(true)
    setAudioError(null)

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "question.webm")

      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text()
        throw new Error("Failed to transcribe audio: " + errorText)
      }

      const { text } = await transcriptionResponse.json()

      if (!text || text.trim().length === 0) {
        throw new Error("No speech detected. Please try again.")
      }

      // Generate text response
      const textResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          character: currentPersona,
        }),
      })

      if (!textResponse.ok) {
        throw new Error("Failed to generate response")
      }

      const { content: responseText } = await textResponse.json()

      // Show "Play Response" button instead of auto-playing
      setResponseText(responseText)
      setResponsePersona(currentPersona)
      setShowResponseReady(true)
    } catch (error) {
      console.error("Error processing audio question:", error)
      setAudioError(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
      setThinkingMessage("")
    }
  }, [])

  const playResponse = async () => {
    // Fresh user interaction - unlock audio
    if (!audioUnlocked) {
      await unlockAudio()
    }

    setShowResponseReady(false)
    setIsPlaying(true)

    try {
      await generateStreamingAudioResponse(responseText, responsePersona)
    } catch (error) {
      console.error("Error playing response:", error)
      setAudioError(`Audio error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  const processQuestionWithStreaming = async (question, persona) => {
    try {
      setIsPlaying(true)

      const textResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
          character: persona,
        }),
      })

      if (!textResponse.ok) {
        throw new Error("Failed to generate response")
      }

      const { content: responseText } = await textResponse.json()

      // Break text into sentences and start streaming audio
      await generateStreamingAudioResponse(responseText, persona)
    } catch (error) {
      console.error("Error in parallel processing:", error)
      setAudioError(`Error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  const generateStreamingAudioResponse = async (text, persona) => {
    try {
      // Split text into sentences
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

      // Get voice settings
      const voiceKey = persona === "daVinci" ? "davinci" : persona.toLowerCase()
      const currentVoiceIds = voiceIdsRef.current
      let voice = currentVoiceIds[voiceKey]

      if (voice && voice.length > 10) {
        voice = voice
      } else {
        voice = "echo"
      }

      // Start with first sentence to get audio playing ASAP
      const firstSentence = sentences[0]?.trim()
      if (!firstSentence) {
        throw new Error("No valid sentences found")
      }

      const firstResponse = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: firstSentence,
          voice: voice,
        }),
      })

      if (!firstResponse.ok) {
        throw new Error(`First audio generation failed: ${firstResponse.status}`)
      }

      const { audioUrl: firstAudioUrl } = await firstResponse.json()

      // Start playing first sentence immediately
      const firstAudio = new Audio(firstAudioUrl)
      audioRef.current = firstAudio

      let isFirstAudio = true
      const audioQueue = []
      let currentAudioIndex = 0

      // Generate remaining sentences in parallel
      if (sentences.length > 1) {
        const remainingPromises = sentences.slice(1).map(async (sentence, index) => {
          try {
            const response = await fetch("/api/speak", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: sentence.trim(),
                voice: voice,
              }),
            })

            if (!response.ok) {
              return null
            }

            const { audioUrl } = await response.json()
            return { audioUrl, index: index + 1 }
          } catch (error) {
            return null
          }
        })

        // Process remaining audio as it becomes available
        Promise.allSettled(remainingPromises).then((results) => {
          results.forEach((result) => {
            if (result.status === "fulfilled" && result.value) {
              audioQueue[result.value.index] = result.value.audioUrl
            }
          })
        })
      }

      // Audio playback chain
      const playNextAudio = () => {
        if (isFirstAudio) {
          isFirstAudio = false
          currentAudioIndex = 1
        }

        // Check if next audio is ready
        if (currentAudioIndex < sentences.length && audioQueue[currentAudioIndex]) {
          const nextAudio = new Audio(audioQueue[currentAudioIndex])
          audioRef.current = nextAudio

          nextAudio.onended = () => {
            currentAudioIndex++
            playNextAudio()
          }

          nextAudio.onerror = (e) => {
            console.error("Audio playback error:", e)
            currentAudioIndex++
            playNextAudio()
          }

          nextAudio.play().catch((e) => {
            console.error("Audio play error:", e)
            currentAudioIndex++
            playNextAudio()
          })
        } else if (currentAudioIndex >= sentences.length) {
          // All audio finished
          setIsPlaying(false)
          setIsPaused(false)
        } else {
          // Wait for next audio to be ready
          setTimeout(playNextAudio, 100)
        }
      }

      firstAudio.onended = playNextAudio
      firstAudio.onerror = (e) => {
        console.error("First audio playback error:", e)
        setAudioError("Audio playback failed")
        setIsPlaying(false)
        setIsPaused(false)
      }

      await firstAudio.play()
    } catch (error) {
      console.error("Error in streaming audio generation:", error)
      setAudioError(`Audio error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  // NEW: Streaming debate function - similar to generateStreamingAudioResponse but for debate turns
  const playDebateWithStreaming = async (characters, topic) => {
    try {
      // Initialize debate queue and state
      debateQueueRef.current = []
      currentDebateIndexRef.current = 0
      isGeneratingNextRef.current = false

      // Generate first speaker's opening statement immediately
      setCurrentSpeaker(characters[0])
      setSpeakerStatus("thinking")

      const firstOpeningData = await generateDebateResponse(characters[0], characters[1], topic, [], 0, true)

      // Add to messages and queue
      const firstMessage = {
        character: characters[0],
        content: firstOpeningData.text,
        timestamp: Date.now(),
      }

      setDebateMessages([firstMessage])
      debateQueueRef.current.push({
        message: firstMessage,
        audioUrl: firstOpeningData.audioUrl,
        index: 0,
      })

      // Start playing first message immediately
      playDebateAudioFromQueue(0, characters, topic)

      // While first speaker is talking, generate second speaker's opening
      generateNextDebateResponse(characters, topic, [firstMessage], 1)
    } catch (error) {
      console.error("Error starting streaming debate:", error)
      setAudioError(`Failed to start debate: ${error.message}`)
      setIsDebating(false)
      setSpeakerStatus(null)
      setCurrentSpeaker(null)
    }
  }

  // Generate a single debate response (text + audio)
  const generateDebateResponse = async (
    character,
    opponent,
    topic,
    currentMessages,
    messageCount,
    isOpening = false,
  ) => {
    try {
      let textResponse

      if (isOpening) {
        // Generate opening statement
        textResponse = await fetch("/api/start-debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character1: character,
            character2: opponent,
            topic: topic,
          }),
        })

        if (!textResponse.ok) {
          throw new Error(`Failed to generate opening: ${textResponse.status}`)
        }

        const data = await textResponse.json()
        const responseText = character === selectedCharactersRef.current[0] ? data.opening1 : data.opening2

        // Generate audio for this text
        const audioUrl = await generateDebateAudio(responseText, character)

        return { text: responseText, audioUrl }
      } else {
        // Generate continuation response
        textResponse = await fetch("/api/auto-continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character1: selectedCharactersRef.current[0],
            character2: selectedCharactersRef.current[1],
            currentMessages: currentMessages,
            topic: debateTopicRef.current,
          }),
        })

        if (!textResponse.ok) {
          throw new Error(`Failed to continue debate: ${textResponse.status}`)
        }

        const data = await textResponse.json()
        const responseText = character === selectedCharactersRef.current[0] ? data.response1 : data.response2

        // Generate audio for this text
        const audioUrl = await generateDebateAudio(responseText, character)

        return { text: responseText, audioUrl }
      }
    } catch (error) {
      console.error(`Error generating response for ${character}:`, error)
      throw error
    }
  }

  // Generate audio for debate text
  const generateDebateAudio = async (text, character) => {
    const voiceKey = character === "daVinci" ? "davinci" : character.toLowerCase()
    const currentVoiceIds = voiceIdsRef.current
    const voice = currentVoiceIds[voiceKey] || "echo"

    const response = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    })

    if (!response.ok) {
      throw new Error(`Audio generation failed for ${character}`)
    }

    const { audioUrl } = await response.json()
    return audioUrl
  }

  // Generate a single debate response (optimized for just-in-time generation)
  const generateSingleDebateResponse = async (character, characters, topic, currentMessages, targetIndex) => {
    if (isGeneratingNextRef.current) {
      return
    }

    isGeneratingNextRef.current = true

    try {
      let responseData
      if (targetIndex < 2) {
        // Still in opening statements (index 0 and 1)
        responseData = await generateDebateResponse(
          character,
          characters[(characters.indexOf(character) + 1) % 2],
          topic,
          currentMessages,
          currentMessages.length,
          true,
        )
      } else {
        // Generate continuation using auto-continue API
        const response = await fetch("/api/auto-continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character1: characters[0],
            character2: characters[1],
            currentMessages: currentMessages,
            topic: debateTopicRef.current,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to continue debate: ${response.status}`)
        }

        const data = await response.json()
        const responseText = character === characters[0] ? data.response1 : data.response2

        // Generate audio for this text
        const audioUrl = await generateDebateAudio(responseText, character)
        responseData = { text: responseText, audioUrl }
      }

      const newMessage = {
        character: character,
        content: responseData.text,
        timestamp: Date.now(),
      }

      // Add to messages state
      setDebateMessages((prev) => [...prev, newMessage])

      // Add to queue at the correct index
      debateQueueRef.current[targetIndex] = {
        message: newMessage,
        audioUrl: responseData.audioUrl,
        index: targetIndex,
      }
    } catch (error) {
      console.error(`Error generating response for ${character}:`, error)
    } finally {
      isGeneratingNextRef.current = false
    }
  }

  // Play audio from the debate queue
  const playDebateAudioFromQueue = (index, characters, topic) => {
    const queueItem = debateQueueRef.current[index]

    if (!queueItem) {
      // Wait for audio to be ready
      setTimeout(() => playDebateAudioFromQueue(index, characters, topic), 100)
      return
    }

    setCurrentSpeaker(queueItem.message.character)
    setSpeakerStatus("speaking")

    // Update debate round based on index (every 2 messages = 1 round)
    const newRound = Math.floor(index / 2) + 1
    if (newRound !== debateRound) {
      setDebateRound(newRound)
    }

    const audio = new Audio(queueItem.audioUrl)
    currentAudioRef.current = audio

    // IMMEDIATELY start generating the next speaker while this one is talking
    const nextIndex = index + 1
    if (nextIndex < 8) {
      // Only generate if we haven't reached the end
      const currentMessages = debateMessagesRef.current

      if (nextIndex < debateQueueRef.current.length) {
        // Next audio already exists, no need to generate
      } else {
        // Simple alternation: if current index is even, next speaker is characters[1], if odd, next speaker is characters[0]
        const nextCharacter = characters[nextIndex % 2]
        generateSingleDebateResponse(nextCharacter, characters, topic, currentMessages, nextIndex)
      }
    }

    audio.onended = () => {
      setSpeakerStatus("waiting")
      currentDebateIndexRef.current = nextIndex

      // Check if we have more audio to play
      if (nextIndex < debateQueueRef.current.length) {
        // Play next audio immediately - should be ready!
        playDebateAudioFromQueue(nextIndex, characters, topic)
      } else if (nextIndex >= 8) {
        // End debate
        endDebate()
      } else {
        // Wait a bit for next audio to be generated
        setTimeout(() => playDebateAudioFromQueue(nextIndex, characters, topic), 500)
      }
    }

    audio.onerror = (e) => {
      console.error(`Audio error for ${queueItem.message.character}:`, e)
      setAudioError(`Audio playback failed for ${queueItem.message.character}`)

      // Try to continue to next audio
      if (nextIndex < debateQueueRef.current.length) {
        setTimeout(() => playDebateAudioFromQueue(nextIndex, characters, topic), 1000)
      }
    }

    // Play the audio
    audio.play().catch((error) => {
      console.error(`Failed to play audio for ${queueItem.message.character}:`, error)
      setAudioError(`Failed to play audio: ${error.message}`)
    })
  }

  // Generate next debate response in background (simplified)
  const generateNextDebateResponse = async (characters, topic, currentMessages, nextIndex) => {
    const nextCharacter = characters[nextIndex % 2]
    await generateSingleDebateResponse(nextCharacter, characters, topic, currentMessages, nextIndex)
  }

  // Start debate function with explicit characters
  const startDebateWithCharacters = async (topic, characters) => {
    if (!characters || characters.length !== 2) {
      setAudioError("Please select exactly two characters to start a debate")
      return
    }

    // Extract topic string if it's an object
    const topicString = typeof topic === "object" ? topic.title || topic.description || String(topic) : topic

    setIsDebating(true)
    setDebateTopic(topicString)
    debateTopicRef.current = topicString
    setDebateMessages([])
    setDebateRound(0) // Start at round 0, will be updated when first audio plays
    setCurrentSpeaker(null)
    setSpeakerStatus(null)
    setIsDebatePaused(false)

    // Start streaming debate
    await playDebateWithStreaming(characters, topicString)
  }

  // Start debate function
  const startDebate = async (topic) => {
    if (!selectedCharacters || selectedCharacters.length !== 2) {
      setAudioError("Please select exactly two characters to start a debate")
      return
    }

    // Extract topic string if it's an object
    const topicString = typeof topic === "object" ? topic.title || topic.description || String(topic) : topic

    setIsDebating(true)
    setDebateTopic(topicString)
    debateTopicRef.current = topicString
    setDebateMessages([])
    setDebateRound(0) // Start at round 0, will be updated when first audio plays
    setCurrentSpeaker(null)
    setSpeakerStatus(null)
    setIsDebatePaused(false)

    // Start streaming debate
    await playDebateWithStreaming(selectedCharacters, topicString)
  }

  const endDebate = () => {
    setIsDebating(false)
    setDebateTopic("")
    debateTopicRef.current = ""
    setSelectedCharacters([])
    setShowTopicSelector(false)
    setTopics([])
    setDebateMessages([])
    setCurrentSpeaker(null)
    setSpeakerStatus(null)
    setDebateRound(0)
    setIsDebatePaused(false)

    // Clear debate queue
    debateQueueRef.current = []
    currentDebateIndexRef.current = 0
    isGeneratingNextRef.current = false

    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
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
    setIsDebating(false)
    setDebateTopic("")
    debateTopicRef.current = ""
    setShowTopicSelector(false)
    setTopics([])
    setDebateMessages([])
    setCurrentSpeaker(null)
    setSpeakerStatus(null)
    setDebateRound(0)
    setIsPaused(false)
    setIsDebatePaused(false)
    setIsRecordingCustomTopic(false)
    setIsProcessingCustomTopic(false)

    // Clear debate queue
    debateQueueRef.current = []
    currentDebateIndexRef.current = 0
    isGeneratingNextRef.current = false

    setShowResponseReady(false)
    setResponseText("")
    setResponsePersona("")
  }

  const handleRecordingButtonClick = useCallback(
    async (characterId, e) => {
      e.stopPropagation()

      // Unlock audio on first interaction
      if (!audioUnlocked) {
        await unlockAudio()
      }

      if (mode === "question") {
        if (selectedPersona === characterId) {
          if (showResponseReady) {
            // Play the response
            playResponse()
          } else if (isListening) {
            stopListening()
          } else if (!isProcessing && !isPlaying) {
            await startListening()
          }
        } else {
          setSelectedPersona(characterId)
          currentPersonaRef.current = characterId
          setSelectedCharacters([characterId])
          await startListening()
        }
      }
    },
    [
      mode,
      selectedPersona,
      isListening,
      isProcessing,
      isPlaying,
      startListening,
      stopListening,
      audioUnlocked,
      unlockAudio,
    ],
  )

  const handleTopicSelect = useCallback(
    async (topic) => {
      // Unlock audio on first interaction
      if (!audioUnlocked) {
        await unlockAudio()
      }

      // Extract topic string properly
      const topicString = typeof topic === "object" ? topic.title || topic.description || String(topic) : topic

      setShowTopicSelector(false)
      startDebate(topicString)
    },
    [selectedCharacters, audioUnlocked, unlockAudio],
  )

  const handleCustomTopicClick = useCallback(async () => {
    // Unlock audio on first interaction
    if (!audioUnlocked) {
      await unlockAudio()
    }

    if (isRecordingCustomTopic) {
      stopCustomTopicRecording()
    } else if (!isProcessingCustomTopic) {
      startCustomTopicRecording()
    }
  }, [
    isRecordingCustomTopic,
    isProcessingCustomTopic,
    startCustomTopicRecording,
    stopCustomTopicRecording,
    audioUnlocked,
    unlockAudio,
  ])

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
    if (mode === "debate") {
      if (isDebating) {
        if (characterId === currentSpeaker) {
          return speakerStatus === "thinking"
            ? "Thinking..."
            : speakerStatus === "speaking"
              ? "Speaking..."
              : "Waiting..."
        }
        return selectedCharacters.includes(characterId) ? "Waiting turn" : "Watching"
      } else {
        // When not debating but in debate mode, show "Select" for unselected characters
        return selectedCharacters.includes(characterId) ? "Selected" : "Select"
      }
    }

    // Question mode logic
    if (selectedPersona !== characterId) return "Ask Question"
    if (isListening) return "Stop Recording"
    if (isProcessing) return thinkingMessage || "Processing..."
    if (showResponseReady) return "Play Response"
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
    if (showResponseReady) return "bg-green-500 text-white"
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
      <StickyDebateStatusBar
        isDebating={isDebating}
        debateTopic={debateTopic}
        selectedCharacters={selectedCharacters}
        currentSpeaker={currentSpeaker}
        personas={personas}
        debateRound={debateRound}
        isDebatePaused={isDebatePaused}
        pauseDebateAudio={pauseDebateAudio}
        resumeDebateAudio={resumeDebateAudio}
        endDebate={endDebate}
      />
      <div
        className={`min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white ${isDebating ? "pt-24" : ""}`}
      >
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              AI Heroes of History
            </h1>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-800 rounded-full p-1 flex">
                <button
                  onClick={toggleMode}
                  className={`px-6 py-3 rounded-full transition-all duration-300 ${
                    mode === "debate" ? "bg-yellow-500 text-black font-semibold" : "text-gray-300 hover:text-white"
                  }`}
                >
                  Watch Debates
                </button>
                <button
                  onClick={toggleMode}
                  className={`px-6 py-3 rounded-full transition-all duration-300 ${
                    mode === "question" ? "bg-yellow-500 text-black font-semibold" : "text-gray-300 hover:text-white"
                  }`}
                >
                  Ask Questions
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center mb-8">
            {mode === "question" && <p className="text-lg text-gray-300">Ask a question to a hero of history</p>}
            {mode === "debate" && selectedCharacters.length < 2 && !isDebating && (
              <p className="text-lg text-gray-300">
                Select two historical figures to watch them debate fascinating topics
              </p>
            )}
          </div>

{/* Character Grid - SINGLE UNIFIED INTERFACE with randomized order */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
  {useMemo(() => {
    // Randomize character order once per session, then keep it stable
    const personaEntries = Object.entries(personas)
    return [...personaEntries].sort(() => Math.random() - 0.5)
  }, [personas]).map(([key, persona]) => {
              const isSelected = mode === "question" ? selectedPersona === key : selectedCharacters.includes(key)
              const shouldGrayOut = shouldGrayOutCharacter(key)
              const isCurrentDebateSpeaker = currentSpeaker === key

              // Hide non-participating characters on mobile when in debate mode and 2 characters selected
              const shouldHideOnMobile =
                isMobile && mode === "debate" && selectedCharacters.length === 2 && !selectedCharacters.includes(key)

              if (shouldHideOnMobile) return null

              return (
                <div
                  key={key}
                  onClick={() => handleCharacterSelect(key)}
                  className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                    isSelected ? "ring-4 ring-yellow-400" : ""
                  } ${shouldGrayOut ? "opacity-30" : ""} ${isCurrentDebateSpeaker ? "ring-4 ring-green-400" : ""}`}
                >
                  <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
                    {/* Image Section - Fixed Height */}
                    <div className="h-48 relative">
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

                    {/* Content Section - Fixed Layout */}
                    <div className="p-3 min-h-[120px] flex flex-col">
                      {/* Character Name - Always at top */}
                      <h3 className="text-sm font-bold text-yellow-400 mb-2 truncate">{persona.name}</h3>

                      {/* Pause/Resume/Stop buttons when playing - MOVED HERE */}
                      {mode === "question" && selectedPersona === key && isPlaying && (
                        <div className="flex space-x-1 mb-2">
                          {!isPaused ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                pauseAudio()
                              }}
                              className="flex-1 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                              title="Pause"
                            >
                              ⏸ Pause
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                resumeAudio()
                              }}
                              className="flex-1 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              title="Resume"
                            >
                              ▶ Resume
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              stopAudio()
                            }}
                            className="flex-1 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            title="Stop"
                          >
                            ⏹ Stop
                          </button>
                        </div>
                      )}

                      {/* Button Section - Always at bottom */}
                      <div className="mt-auto flex space-x-1">
                        {mode === "question" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRecordingButtonClick(key, e)
                            }}
                            disabled={shouldGrayOut}
                            className={`flex-1 py-2 px-2 rounded text-xs font-semibold transition-all duration-300 flex items-center justify-center space-x-1 ${getButtonColor(key)} ${
                              shouldGrayOut ? "bg-gray-600 text-gray-400 cursor-not-allowed" : ""
                            }`}
                          >
                            <SmallMicIcon isActive={selectedPersona === key && isListening} />
                            <span className="truncate">{getStatusText(key)}</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!isDebating) {
                                handleCharacterSelect(key)
                              }
                            }}
                            className={`w-full py-2 px-2 rounded text-xs font-semibold transition-all duration-300 ${getButtonColor(key)}`}
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
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

                    {/* Custom Topic Button */}
                    <div className="border-t border-gray-700 pt-6">
                      <h3 className="text-lg font-semibold text-yellow-400 mb-4 text-center">
                        Or create your own topic
                      </h3>
                      <div className="flex justify-center">
                        <button
                          onClick={handleCustomTopicClick}
                          disabled={isProcessingCustomTopic}
                          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
                            isRecordingCustomTopic
                              ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                              : isProcessingCustomTopic
                                ? "bg-blue-600 text-white cursor-not-allowed"
                                : "bg-purple-600 hover:bg-purple-700 text-white"
                          }`}
                        >
                          <SmallMicIcon isActive={isRecordingCustomTopic} />
                          <span>
                            {isRecordingCustomTopic
                              ? "Stop Recording"
                              : isProcessingCustomTopic
                                ? "Processing..."
                                : "Record Custom Topic"}
                          </span>
                        </button>
                      </div>
                      {isRecordingCustomTopic && (
                        <div className="mt-4 text-center">
                          <div className="flex justify-center mt-2 mb-2">
                            <div className="flex space-x-1">
                              <div className="w-1 h-4 bg-blue-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]"></div>
                              <div className="w-1 h-6 bg-yellow-500 rounded-full animate-[soundwave_0.7s_ease-in-out_infinite_0.1s]"></div>
                              <div className="w-1 h-3 bg-green-500 rounded-full animate-[soundwave_0.4s_ease-in-out_infinite_0.2s]"></div>
                              <div className="w-1 h-5 bg-red-500 rounded-full animate-[soundwave_0.6s_ease-in-out_infinite_0.3s]"></div>
                              <div className="w-1 h-2 bg-purple-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.4s]"></div>
                            </div>
                          </div>
                          <p className="text-gray-300">Speak your debate topic...</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Custom Topic Result - Minimalistic Start Button */}
          {showCustomTopicResult && customTopicText && (
            <div className="w-full max-w-4xl mx-auto mb-8">
              <div className="flex justify-center">
                <button
                  onClick={startCustomDebate}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  Start Debate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )

  // Play debate audio with retry logic
  const playDebateAudio = async (message, allMessages, currentIndex, retryCount = 0) => {
    const { character, content } = message

    setCurrentSpeaker(character)
    setSpeakerStatus("speaking")

    // Update debate round based on message index (every 2 messages = 1 round)
    const newRound = Math.floor(currentIndex / 2) + 1
    if (newRound !== debateRound) {
      setDebateRound(newRound)
    }

    try {
      const voiceKey = character === "daVinci" ? "davinci" : character.toLowerCase()
      const currentVoiceIds = voiceIdsRef.current // Use ref for voice IDs
      const voice = currentVoiceIds[voiceKey] || "echo"

      // Add timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, voice }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Audio API returned ${response.status}`)
      }

      const data = await response.json()
      const audio = new Audio(data.audioUrl)
      currentAudioRef.current = audio

      audio.onended = () => {
        setSpeakerStatus("waiting")

        // Auto-continue to next message
        const nextIndex = currentIndex + 1
        if (nextIndex < allMessages.length) {
          setTimeout(() => {
            playDebateAudio(allMessages[nextIndex], allMessages, nextIndex)
          }, 1000)
        } else {
          // Check if we should continue with more rounds
          const currentRound = Math.floor(currentIndex / 2) + 1

          // Continue if we have less than 8 total messages (4 rounds of 2 messages each)
          if (allMessages.length < 8) {
            setTimeout(() => {
              continueDebate()
            }, 2000)
          } else {
            // Debate finished
            setTimeout(() => {
              endDebate()
            }, 3000)
          }
        }
      }

      audio.onerror = (e) => {
        throw new Error(`Audio playback failed: ${e.message}`)
      }

      await audio.play()
    } catch (error) {
      console.error(`Error playing audio for ${character}:`, error)

      // Retry logic for network timeouts
      if ((error.name === "AbortError" || error.message.includes("Failed to fetch")) && retryCount < 2) {
        setSpeakerStatus("thinking")
        setTimeout(() => {
          playDebateAudio(message, allMessages, currentIndex, retryCount + 1)
        }, 3000)
        return
      }

      setAudioError(`Audio failed for ${character}: ${error.message}`)
      setSpeakerStatus(null)

      // Continue to next speaker even if current one fails
      const nextIndex = currentIndex + 1
      if (nextIndex < allMessages.length) {
        setTimeout(() => {
          playDebateAudio(allMessages[nextIndex], allMessages, nextIndex)
        }, 2000)
      } else {
        setTimeout(() => {
          endDebate()
        }, 2000)
      }
    }
  }

  const continueDebate = async () => {
    if (!selectedCharacters || selectedCharacters.length !== 2) {
      setAudioError("Please select exactly two characters to start a debate")
      return
    }

    const currentMessages = debateMessagesRef.current

    try {
      const response = await fetch("/api/auto-continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character1: selectedCharacters[0],
          character2: selectedCharacters[1],
          currentMessages: currentMessages,
          topic: debateTopicRef.current,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to continue debate: ${response.status}`)
      }

      const data = await response.json()
      const response1 = data.response1
      const response2 = data.response2

      const newMessage1 = {
        character: selectedCharacters[0],
        content: response1,
        timestamp: Date.now(),
      }

      const newMessage2 = {
        character: selectedCharacters[1],
        content: response2,
        timestamp: Date.now(),
      }

      // Update messages state
      setDebateMessages((prev) => [...prev, newMessage1, newMessage2])

      // Play audio for the new messages
      const allMessages = [...currentMessages, newMessage1, newMessage2]
      playDebateAudio(newMessage1, allMessages, currentMessages.length)
    } catch (error) {
      console.error("Error continuing debate:", error)
      setAudioError(`Error: ${error.message}`)
      endDebate()
    }
  }
}
