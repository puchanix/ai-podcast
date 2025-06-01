"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Layout from "../components/layout"
import { useMobileAudioUnlock } from "../hooks/useMobileAudioUnlock"

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

  // ADD TOPIC REF - This is the key fix!
  const debateTopicRef = useRef("")

  // ADD VOICE IDS REF - Fix for voice persistence!
  const voiceIdsRef = useRef({})

  // ADD SELECTED CHARACTERS REF - Fix for character persistence!
  const selectedCharactersRef = useRef([])

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
      console.log("🎤 [CUSTOM TOPIC] Starting custom topic recording...")
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
      console.log("🎤 [CUSTOM TOPIC] Got media stream")

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })
      customTopicMediaRecorderRef.current = mediaRecorder
      customTopicAudioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          customTopicAudioChunksRef.current.push(event.data)
          console.log("🎤 [CUSTOM TOPIC] Audio chunk received, size:", event.data.size)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log("🎤 [CUSTOM TOPIC] Recording stopped, processing...")
        const audioBlob = new Blob(customTopicAudioChunksRef.current, { type: "audio/webm" })
        console.log("🎤 [CUSTOM TOPIC] Audio blob created, size:", audioBlob.size)
        await processCustomTopicAudio(audioBlob)
      }

      mediaRecorder.start(1000)
      setIsRecordingCustomTopic(true)
      console.log("🎤 [CUSTOM TOPIC] Recording started")
    } catch (error) {
      console.error("🎤 [CUSTOM TOPIC] Error accessing microphone:", error)
      setAudioError("Could not access microphone. Please check permissions.")
    }
  }, [])

  const stopCustomTopicRecording = useCallback(() => {
    console.log("🎤 [CUSTOM TOPIC] Stopping custom topic recording...")
    if (customTopicMediaRecorderRef.current && customTopicMediaRecorderRef.current.state === "recording") {
      customTopicMediaRecorderRef.current.stop()
      setIsRecordingCustomTopic(false)
      console.log("🎤 [CUSTOM TOPIC] MediaRecorder stopped")
    }

    if (customTopicStreamRef.current) {
      customTopicStreamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log("🎤 [CUSTOM TOPIC] Track stopped:", track.kind)
      })
      customTopicStreamRef.current = null
    }
  }, [])

  const processCustomTopicAudio = useCallback(
    async (audioBlob) => {
      console.log("🎤 [CUSTOM TOPIC] Processing custom topic audio...")
      console.log("🎤 [CUSTOM TOPIC] Current selectedCharacters state:", selectedCharacters)
      console.log("🎤 [CUSTOM TOPIC] Current selectedCharacters ref:", selectedCharactersRef.current)
      setIsProcessingCustomTopic(true)
      setAudioError(null)

      try {
        const formData = new FormData()
        formData.append("audio", audioBlob, "custom-topic.webm")
        console.log("🎤 [CUSTOM TOPIC] Sending to transcription API...")

        const transcriptionResponse = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        })

        console.log("🎤 [CUSTOM TOPIC] Transcription response status:", transcriptionResponse.status)

        if (!transcriptionResponse.ok) {
          const errorText = await transcriptionResponse.text()
          console.error("🎤 [CUSTOM TOPIC] Transcription error:", errorText)
          throw new Error("Failed to transcribe audio: " + errorText)
        }

        const { text } = await transcriptionResponse.json()
        console.log("🎤 [CUSTOM TOPIC] Transcribed text:", text)

        if (!text || text.trim().length === 0) {
          throw new Error("No speech detected. Please try again.")
        }

        // Use ref instead of state for characters
        const currentCharacters = selectedCharactersRef.current
        console.log("🎤 [CUSTOM TOPIC] Using characters from ref:", currentCharacters)

        // Validate we have characters before proceeding
        if (!currentCharacters || currentCharacters.length !== 2) {
          console.error("🎤 [CUSTOM TOPIC] No characters selected, cannot start debate")
          throw new Error("Please select two characters first")
        }

        // Start debate with the custom topic
        console.log("🎤 [CUSTOM TOPIC] Starting debate with custom topic:", text.trim())
        console.log("🎤 [CUSTOM TOPIC] Using characters:", currentCharacters)
        setShowTopicSelector(false)
        startDebateWithCharacters(text.trim(), currentCharacters)
      } catch (error) {
        console.error("🎤 [CUSTOM TOPIC] Error processing custom topic audio:", error)
        setAudioError(`Error: ${error.message}`)
      } finally {
        setIsProcessingCustomTopic(false)
      }
    },
    [], // Remove selectedCharacters dependency since we're using ref
  )

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

      await processQuestionWithStreaming(text, currentPersona)
    } catch (error) {
      console.error("Error processing audio question:", error)
      setAudioError(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
      setThinkingMessage("")
    }
  }, [])

  const processQuestionWithStreaming = async (question, persona) => {
    try {
      console.log("⏱️ [TIMING] Starting question processing at:", Date.now())
      setIsPlaying(true)

      // Start text generation
      const textStartTime = Date.now()
      console.log("⏱️ [TIMING] Starting text generation at:", textStartTime)

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
      const textEndTime = Date.now()
      console.log("⏱️ [TIMING] Text generation completed in:", textEndTime - textStartTime + "ms")
      console.log("⏱️ [TIMING] Generated text length:", responseText.length, "characters")

      // Break text into sentences and start streaming audio
      console.log("⏱️ [TIMING] Starting sentence-by-sentence audio at:", textEndTime)
      await generateStreamingAudioResponse(responseText, persona)
    } catch (error) {
      console.error("Error in parallel processing:", error)
      setAudioError(`Error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  const generateStreamingAudioResponse = async (text, persona) => {
    try {
      const streamStartTime = Date.now()
      console.log("🎵 [STREAMING] Starting streaming audio at:", streamStartTime)

      // Split text into sentences
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
      console.log("🎵 [STREAMING] Split into", sentences.length, "sentences")

      // Get voice settings
      const voiceKey = persona === "daVinci" ? "davinci" : persona.toLowerCase()
      const currentVoiceIds = voiceIdsRef.current
      let voice = currentVoiceIds[voiceKey]

      if (voice && voice.length > 10) {
        console.log("🎵 [STREAMING] Using custom voice:", voiceKey)
      } else {
        voice = "echo"
        console.log("🎵 [STREAMING] Using default voice: echo")
      }

      // Start with first sentence to get audio playing ASAP
      const firstSentence = sentences[0]?.trim()
      if (!firstSentence) {
        throw new Error("No valid sentences found")
      }

      console.log("🎵 [STREAMING] Generating first sentence:", firstSentence.substring(0, 50) + "...")

      const firstAudioStartTime = Date.now()
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
      const firstAudioTime = Date.now() - firstAudioStartTime
      console.log("🎵 [STREAMING] First sentence audio generated in:", firstAudioTime + "ms")

      // Start playing first sentence immediately
      const firstAudio = new Audio(firstAudioUrl)
      audioRef.current = firstAudio

      let isFirstAudio = true
      const audioQueue = []
      let currentAudioIndex = 0

      // Generate remaining sentences in parallel
      if (sentences.length > 1) {
        console.log("🎵 [STREAMING] Starting parallel generation of remaining", sentences.length - 1, "sentences")

        const remainingPromises = sentences.slice(1).map(async (sentence, index) => {
          try {
            const sentenceStartTime = Date.now()
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
              console.error(`Sentence ${index + 2} audio failed:`, response.status)
              return null
            }

            const { audioUrl } = await response.json()
            const sentenceTime = Date.now() - sentenceStartTime
            console.log(`🎵 [STREAMING] Sentence ${index + 2} generated in:`, sentenceTime + "ms")

            return { audioUrl, index: index + 1 }
          } catch (error) {
            console.error(`Error generating sentence ${index + 2}:`, error)
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
          const totalTime = Date.now() - streamStartTime
          console.log("🎵 [STREAMING] Total streaming audio completed in:", totalTime + "ms")
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

      const playStartTime = Date.now()
      await firstAudio.play()
      const timeToFirstAudio = playStartTime - streamStartTime
      console.log("🎵 [STREAMING] First audio started playing after:", timeToFirstAudio + "ms")
      console.log("🎵 [STREAMING] FIRST AUDIO RESPONSE TIME:", timeToFirstAudio + "ms")
    } catch (error) {
      console.error("Error in streaming audio generation:", error)
      setAudioError(`Audio error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  const generateAudioResponse = async (text, persona) => {
    try {
      const audioStartTime = Date.now()
      console.log("🎵 [AUDIO TIMING] Starting audio generation at:", audioStartTime)
      console.log("🎵 [AUDIO TIMING] Text to convert:", text.substring(0, 100) + "...")

      const voiceKey = persona === "daVinci" ? "davinci" : persona.toLowerCase()
      const currentVoiceIds = voiceIdsRef.current
      let voice = currentVoiceIds[voiceKey]

      if (voice && voice.length > 10) {
        console.log("🎵 [AUDIO TIMING] Using custom voice:", voiceKey)
      } else {
        voice = "echo"
        console.log("🎵 [AUDIO TIMING] Using default voice: echo")
      }

      // Start audio generation immediately
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
        throw new Error(`Audio generation failed: ${response.status} - ${errorText}`)
      }

      const { audioUrl } = await response.json()
      const audioGenerationTime = Date.now() - audioStartTime
      console.log("🎵 [AUDIO TIMING] Audio generated in:", audioGenerationTime + "ms")

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        setIsPaused(false)
      }

      audio.onerror = (e) => {
        console.error("Audio playback error:", e)
        setAudioError("Audio playback failed")
        setIsPlaying(false)
        setIsPaused(false)
      }

      const playStartTime = Date.now()
      await audio.play()
      const totalTime = playStartTime - audioStartTime
      console.log("🎵 [AUDIO TIMING] Audio started playing after:", totalTime + "ms total")
      console.log("🎵 [AUDIO TIMING] TOTAL RESPONSE TIME:", totalTime + "ms")
    } catch (error) {
      console.error("Error in audio generation:", error)
      setAudioError(`Audio error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  // Start debate function with explicit characters
  const startDebateWithCharacters = async (topic, characters) => {
    console.log("🎯 [START DEBATE WITH CHARS] Function called with topic:", topic)
    console.log("🎯 [START DEBATE WITH CHARS] Using characters:", characters)

    if (!characters || characters.length !== 2) {
      console.error("🎯 [START DEBATE WITH CHARS] Invalid characters - returning early")
      setAudioError("Please select exactly two characters to start a debate")
      return
    }

    // Extract topic string if it's an object
    const topicString = typeof topic === "object" ? topic.title || topic.description || String(topic) : topic
    console.log("🎯 [START DEBATE WITH CHARS] Topic string extracted:", topicString)

    console.log("🎯 [START DEBATE WITH CHARS] Setting debate state...")
    setIsDebating(true)
    setDebateTopic(topicString)
    debateTopicRef.current = topicString
    setCurrentSpeaker(characters[0])
    setSpeakerStatus("thinking")
    setDebateMessages([])
    setDebateRound(0)
    console.log("🎯 [START DEBATE WITH CHARS] Debate state set, making API call...")

    try {
      const response = await fetch("/api/start-debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character1: characters[0],
          character2: characters[1],
          topic: topicString,
        }),
      })

      console.log("🎯 [START DEBATE WITH CHARS] API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("🎯 [START DEBATE WITH CHARS] API error:", errorText)
        throw new Error(`Failed to start debate: ${response.status}`)
      }

      const data = await response.json()
      console.log("🎯 [START DEBATE WITH CHARS] API response data:", data)

      const messages = [
        {
          character: characters[0],
          content: data.opening1,
          timestamp: Date.now(),
        },
        {
          character: characters[1],
          content: data.opening2,
          timestamp: Date.now() + 100,
        },
      ]

      console.log("🎯 [START DEBATE WITH CHARS] Messages created:", messages)
      setDebateMessages(messages)

      // Start playing first message
      console.log("🎯 [START DEBATE WITH CHARS] Starting audio playback...")
      playDebateAudio(messages[0], messages, 0)
    } catch (error) {
      console.error("🎯 [START DEBATE WITH CHARS] Error starting debate:", error)
      setAudioError(`Failed to start debate: ${error.message}`)
      setIsDebating(false)
      setSpeakerStatus(null)
      setCurrentSpeaker(null)
    }
  }

  // Start debate function
  const startDebate = async (topic) => {
    console.log("🎯 [START DEBATE] Function called with topic:", topic)
    console.log("🎯 [START DEBATE] Selected characters:", selectedCharacters)
    console.log("🎯 [START DEBATE] Selected characters length:", selectedCharacters?.length)
    console.log("🎯 [START DEBATE] Current mode:", mode)
    console.log("🎯 [START DEBATE] Show topic selector:", showTopicSelector)

    if (!selectedCharacters || selectedCharacters.length !== 2) {
      console.error("🎯 [START DEBATE] Invalid characters - returning early")
      console.error("🎯 [START DEBATE] Characters state:", selectedCharacters)
      setAudioError("Please select exactly two characters to start a debate")
      return
    }

    // Extract topic string if it's an object
    const topicString = typeof topic === "object" ? topic.title || topic.description || String(topic) : topic
    console.log("🎯 [START DEBATE] Topic string extracted:", topicString)

    console.log("🎯 [START DEBATE] Setting debate state...")
    setIsDebating(true)
    setDebateTopic(topicString) // Set state
    debateTopicRef.current = topicString // Set ref immediately - THIS IS THE KEY FIX!
    setCurrentSpeaker(selectedCharacters[0])
    setSpeakerStatus("thinking")
    setDebateMessages([])
    setDebateRound(0)
    console.log("🎯 [START DEBATE] Debate state set, making API call...")

    try {
      const response = await fetch("/api/start-debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character1: selectedCharacters[0],
          character2: selectedCharacters[1],
          topic: topicString, // Use the extracted string
        }),
      })

      console.log("🎯 [START DEBATE] API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("🎯 [START DEBATE] API error:", errorText)
        throw new Error(`Failed to start debate: ${response.status}`)
      }

      const data = await response.json()
      console.log("🎯 [START DEBATE] API response data:", data)

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

      console.log("🎯 [START DEBATE] Messages created:", messages)
      setDebateMessages(messages)

      // Start playing first message
      console.log("🎯 [START DEBATE] Starting audio playback...")
      playDebateAudio(messages[0], messages, 0)
    } catch (error) {
      console.error("🎯 [START DEBATE] Error starting debate:", error)
      setAudioError(`Failed to start debate: ${error.message}`)
      setIsDebating(false)
      setSpeakerStatus(null)
      setCurrentSpeaker(null)
    }
  }

  // Continue debate with next round
  const continueDebate = async () => {
    // Use the ref instead of state - THIS IS THE KEY FIX!
    const currentTopic = debateTopicRef.current

    // Validate we have a topic
    if (!currentTopic || currentTopic.trim() === "") {
      setAudioError("Debate topic is missing. Cannot continue.")
      return
    }

    try {
      setSpeakerStatus("thinking")
      setCurrentSpeaker(selectedCharacters[0]) // Reset to first character for new round

      const requestBody = {
        character1: selectedCharacters[0],
        character2: selectedCharacters[1],
        currentMessages: debateMessagesRef.current,
        topic: currentTopic.trim(), // Use topic from ref
      }

      const response = await fetch("/api/auto-continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to continue debate: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      const newMessages = [
        {
          character: selectedCharacters[0],
          content: data.response1,
          timestamp: Date.now(),
        },
        {
          character: selectedCharacters[1],
          content: data.response2,
          timestamp: Date.now() + 100,
        },
      ]

      const allMessages = [...debateMessagesRef.current, ...newMessages]
      setDebateMessages(allMessages)
      setDebateRound((prev) => prev + 1)

      // Start playing the new messages
      playDebateAudio(newMessages[0], allMessages, debateMessagesRef.current.length)
    } catch (error) {
      console.error("Error continuing debate:", error)
      setAudioError(`Failed to continue debate: ${error.message}`)
    }
  }

  // Play debate audio with retry logic
  const playDebateAudio = async (message, allMessages, currentIndex, retryCount = 0) => {
    const { character, content } = message

    setCurrentSpeaker(character)
    setSpeakerStatus("speaking")

    try {
      // Resume audio context before playing (mobile audio fix)
      if (typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined") {
        const AudioContextClass = AudioContext || window.webkitAudioContext
        if (window.audioContext) {
          if (window.audioContext.state === "suspended") {
            await window.audioContext.resume()
            console.log("🔊 [MOBILE AUDIO] Resumed audio context for debate")
          }
        } else {
          window.audioContext = new AudioContextClass()
          console.log("🔊 [MOBILE AUDIO] Created new audio context for debate")
        }
      }

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
          }, 500) // Reduced from 1000
        } else {
          // Check if we should continue with more rounds
          const currentRound = debateRoundRef.current

          // Continue if we have less than 8 total messages (4 rounds of 2 messages each)
          if (allMessages.length < 8) {
            setTimeout(() => {
              continueDebate()
            }, 1000) // Reduced from 2000
          } else {
            // Debate finished
            setTimeout(() => {
              endDebate()
            }, 1500) // Reduced from 3000
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
        }, 2000) // Reduced from 3000
        return
      }

      setAudioError(`Audio failed for ${character}: ${error.message}`)
      setSpeakerStatus(null)

      // Continue to next speaker even if current one fails
      const nextIndex = currentIndex + 1
      if (nextIndex < allMessages.length) {
        setTimeout(() => {
          playDebateAudio(allMessages[nextIndex], allMessages, nextIndex)
        }, 1000) // Reduced from 2000
      } else {
        setTimeout(() => {
          endDebate()
        }, 1000) // Reduced from 2000
      }
    }
  }

  const endDebate = () => {
    setIsDebating(false)
    setDebateTopic("")
    debateTopicRef.current = "" // Clear topic ref too
    setSelectedCharacters([])
    setShowTopicSelector(false)
    setTopics([])
    setDebateMessages([])
    setCurrentSpeaker(null)
    setSpeakerStatus(null)
    setDebateRound(0)
    setIsDebatePaused(false)

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
    debateTopicRef.current = "" // Clear topic ref too
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
    // DON'T reset voiceIds - keep them loaded!
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
          if (isListening) {
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

    // Question mode logic remains the same
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
              const isCurrentDebateSpeaker = currentSpeaker === key

              return (
                <div
                  key={key}
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
                            onClick={(e) => handleRecordingButtonClick(key, e)}
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

          {/* Debate Topic Display - MOVED BELOW CHARACTERS */}
          {isDebating && debateTopic && (
            <div className="mb-8 text-center">
              <div className="bg-gray-800 rounded-lg p-4 inline-block">
                <h2 className="text-xl font-bold text-yellow-400 mb-2">Current Debate Topic</h2>
                <p className="text-gray-300">{debateTopic}</p>
                <p className="text-sm text-gray-400 mt-1">Round {debateRound + 1} of 4</p>
                <div className="mt-4 flex justify-center space-x-3">
                  {!isDebatePaused ? (
                    <button
                      onClick={pauseDebateAudio}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm flex items-center space-x-2"
                    >
                      <span>⏸</span>
                      <span>Pause Debate</span>
                    </button>
                  ) : (
                    <button
                      onClick={resumeDebateAudio}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm flex items-center space-x-2"
                    >
                      <span>▶</span>
                      <span>Resume Debate</span>
                    </button>
                  )}
                  <button
                    onClick={endDebate}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                  >
                    End Debate
                  </button>
                </div>
              </div>
            </div>
          )}

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
        </div>
      </div>
    </Layout>
  )
}
