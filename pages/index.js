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
  const [isPaused, setIsPaused] = useState(false)
  const [isDebatePaused, setIsDebatePaused] = useState(false)
  const [isDebating, setIsDebating] = useState(false)

  // Add debug console state
  const [debugLogs, setDebugLogs] = useState([])
  const [showDebugConsole, setShowDebugConsole] = useState(false)

  // Custom topic recording state
  const [isRecordingCustomTopic, setIsRecordingCustomTopic] = useState(false)
  const [isProcessingCustomTopic, setIsProcessingCustomTopic] = useState(false)

  // Custom topic recording refs
  const customTopicMediaRecorderRef = useRef(null)
  const customTopicAudioChunksRef = useRef([])
  const customTopicStreamRef = useRef(null)

  const [topics, setTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  // Debate state
  const [debateTopic, setDebateTopic] = useState("")
  const [debateMessages, setDebateMessages] = useState([])
  const [currentSpeaker, setCurrentSpeaker] = useState(null)
  const [speakerStatus, setSpeakerStatus] = useState(null)
  const [debateRound, setDebateRound] = useState(0)

  // Audio refs
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const currentPersonaRef = useRef("")
  const currentAudioRef = useRef(null)
  const debateMessagesRef = useRef([])
  const debateRoundRef = useRef(0)
  const debateTopicRef = useRef("")
  const voiceIdsRef = useRef({})
  const selectedCharactersRef = useRef([])

  // Thinking messages for dynamic display
  const thinkingMessages = [
    "Thinking...",
    "Pondering your question...",
    "Reflecting on this matter...",
    "Considering the depths of this inquiry...",
    "Gathering thoughts...",
    "Considering the depths of this inquiry...",
    "Gathering thoughts...",
  ]

  // Add debug logging function
  const addDebugLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs((prev) => [...prev.slice(-20), `${timestamp}: ${message}`]) // Keep last 20 logs
    console.log(`🔍 [DEBUG] ${message}`)
  }, [])

  // Mobile audio unlock function - more aggressive approach
  const unlockMobileAudio = useCallback(async () => {
    try {
      console.log("🔊 [MOBILE AUDIO] Attempting to unlock audio context...")

      // Try multiple approaches for mobile audio unlock
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()

      if (audioContext.state === "suspended") {
        await audioContext.resume()
        console.log("🔊 [MOBILE AUDIO] AudioContext resumed")
      }

      // Create and play a silent audio buffer
      const buffer = audioContext.createBuffer(1, 1, 22050)
      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(audioContext.destination)
      source.start(0)

      // Also try with HTML5 audio
      const audio = new Audio()
      audio.src =
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
      audio.volume = 0
      audio.muted = true

      const playPromise = audio.play()
      if (playPromise !== undefined) {
        await playPromise
      }

      console.log("🔊 [MOBILE AUDIO] Audio context successfully unlocked!")
      return true
    } catch (error) {
      console.log("🔊 [MOBILE AUDIO] Audio unlock failed:", error.message)
      return false
    }
  }, [])

  // Check if we're on mobile
  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }, [])

  // Load voice IDs when component mounts
  useEffect(() => {
    async function loadVoiceIds() {
      try {
        const response = await fetch("/api/get-voice-ids")
        if (response.ok) {
          const data = await response.json()
          console.log("Voice IDs loaded:", data)
          setVoiceIds(data)
          voiceIdsRef.current = data
        }
      } catch (error) {
        console.error("Error loading voice IDs:", error)
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

  // Update refs when state changes
  useEffect(() => {
    currentPersonaRef.current = selectedPersona
  }, [selectedPersona])

  useEffect(() => {
    debateMessagesRef.current = debateMessages
  }, [debateMessages])

  useEffect(() => {
    debateRoundRef.current = debateRound
  }, [debateRound])

  useEffect(() => {
    debateTopicRef.current = debateTopic
  }, [debateTopic])

  useEffect(() => {
    voiceIdsRef.current = voiceIds
  }, [voiceIds])

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

  const handleCharacterSelect = useCallback(
    async (characterId) => {
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
            // Automatically unlock audio for mobile when two characters are selected
            if (isMobile()) {
              unlockMobileAudio()
            }
            setShowTopicSelector(true)
          } else {
            setShowTopicSelector(false)
            setIsDebating(false)
            setDebateTopic("")
            debateTopicRef.current = ""
            setDebateMessages([])
            setCurrentSpeaker(null)
            setSpeakerStatus(null)
            setDebateRound(0)
          }

          return newSelection
        })
      }
    },
    [mode, isMobile, unlockMobileAudio],
  )

  const startListening = useCallback(async () => {
    // Initialize audio context for mobile (add this at the very beginning of startListening)
    try {
      // Create a dummy audio element and try to play it to unlock audio context
      const dummyAudio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
      )
      dummyAudio.volume = 0
      await dummyAudio.play()
      console.log("🔊 [MOBILE DEBUG] Audio context unlocked")
    } catch (e) {
      console.log("🔊 [MOBILE DEBUG] Audio context unlock failed (this is normal):", e.message)
    }

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
        throw new Error("Failed to transcribe audio")
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
      setIsPlaying(true)

      const response = await fetch("/api/chat-streaming", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
          character: persona,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start streaming")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let accumulatedText = ""
      const audioQueue = []
      let currentAudioIndex = 0
      let chunkIndex = 0

      const playNextAudio = async () => {
        if (currentAudioIndex < audioQueue.length && audioQueue[currentAudioIndex]) {
          const audioUrl = audioQueue[currentAudioIndex]
          console.log("🔊 [MOBILE DEBUG] Attempting to play audio chunk:", currentAudioIndex)
          console.log("🔊 [MOBILE DEBUG] Audio URL length:", audioUrl.length)

          const audio = new Audio()
          audioRef.current = audio

          // Add mobile-specific audio debugging
          audio.addEventListener("loadstart", () => {
            console.log("🔊 [MOBILE DEBUG] Audio loadstart event")
          })

          audio.addEventListener("canplay", () => {
            console.log("🔊 [MOBILE DEBUG] Audio canplay event")
          })

          audio.addEventListener("error", (e) => {
            console.error("🔊 [MOBILE DEBUG] Audio error:", e)
            console.error("🔊 [MOBILE DEBUG] Audio error code:", audio.error?.code)
            console.error("🔊 [MOBILE DEBUG] Audio error message:", audio.error?.message)
            currentAudioIndex++
            playNextAudio()
          })

          audio.onended = () => {
            console.log("🔊 [MOBILE DEBUG] Audio ended, moving to next chunk")
            currentAudioIndex++
            playNextAudio()
          }

          try {
            // Set the source after setting up event listeners
            audio.src = audioUrl
            audio.load() // Explicitly load the audio

            console.log("🔊 [MOBILE DEBUG] About to call audio.play()")
            const playPromise = audio.play()

            if (playPromise !== undefined) {
              await playPromise
              console.log("🔊 [MOBILE DEBUG] Audio play() succeeded")
            }
          } catch (error) {
            console.error("🔊 [MOBILE DEBUG] Audio play failed:", error)
            console.error("🔊 [MOBILE DEBUG] Error name:", error.name)
            console.error("🔊 [MOBILE DEBUG] Error message:", error.message)

            // Try to continue with next audio chunk
            currentAudioIndex++
            playNextAudio()
          }
        } else {
          setTimeout(() => {
            if (currentAudioIndex >= audioQueue.length) {
              console.log("🔊 [MOBILE DEBUG] All audio chunks completed")
              setIsPlaying(false)
              setIsPaused(false)
            } else {
              playNextAudio()
            }
          }, 100)
        }
      }

      const generateAudioParallel = async (text, index) => {
        try {
          const audioResponse = await fetch("/api/speak-fast", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: text,
              voice: getVoiceForPersona(persona),
            }),
          })

          if (audioResponse.ok) {
            const { audioUrl } = await audioResponse.json()
            audioQueue[index] = audioUrl

            if (index === 0) {
              playNextAudio()
            }

            return audioUrl
          }
        } catch (audioError) {
          console.error(`Audio generation error for chunk ${index}:`, audioError)
          return null
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n").filter((line) => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)

            if (data.type === "chunk" && data.content) {
              accumulatedText += data.content
              generateAudioParallel(data.content, chunkIndex++)
            } else if (data.type === "complete") {
              break
            } else if (data.type === "error") {
              throw new Error(data.content)
            }
          } catch (parseError) {
            console.error("Parse error:", parseError)
          }
        }
      }
    } catch (error) {
      console.error("Error in streaming:", error)
      setAudioError(`Error: ${error.message}`)
      setIsPlaying(false)
    }
  }

  const getVoiceForPersona = (persona) => {
    const voiceKey = persona === "daVinci" ? "davinci" : persona.toLowerCase()
    const currentVoiceIds = voiceIdsRef.current
    return currentVoiceIds[voiceKey] || "echo"
  }

  const startDebate = async (topic) => {
    if (!selectedCharacters || selectedCharacters.length !== 2) {
      setAudioError("Please select exactly two characters to start a debate")
      return
    }

    const topicString = typeof topic === "object" ? topic.title || topic.description || String(topic) : topic

    setIsDebating(true)
    setDebateTopic(topicString)
    setShowTopicSelector(false)
  }

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

  const processCustomTopicAudio = useCallback(async (audioBlob) => {
    console.log("🎤 [CUSTOM TOPIC] Processing custom topic audio...")
    console.log("🎤 [CUSTOM TOPIC] Audio blob size:", audioBlob.size)
    setIsProcessingCustomTopic(true)
    setAudioError(null)

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "custom-topic.webm")
      console.log("🎤 [CUSTOM TOPIC] Sending to transcription API...")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log("🎤 [CUSTOM TOPIC] Request timed out after 30 seconds")
        controller.abort()
      }, 30000)

      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
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

      const currentCharacters = selectedCharactersRef.current
      console.log("🎤 [CUSTOM TOPIC] Using characters from ref:", currentCharacters)

      if (!currentCharacters || currentCharacters.length !== 2) {
        console.error("🎤 [CUSTOM TOPIC] No characters selected, cannot start debate")
        throw new Error("Please select two characters first")
      }

      console.log("🎤 [CUSTOM TOPIC] Starting debate with custom topic:", text.trim())
      console.log("🎤 [CUSTOM TOPIC] Using characters:", currentCharacters)
      setShowTopicSelector(false)
      startDebateWithCharacters(text.trim(), currentCharacters)
    } catch (error) {
      console.error("🎤 [CUSTOM TOPIC] Error processing custom topic audio:", error)

      if (error.name === "AbortError") {
        setAudioError("Request timed out. Please try again with a shorter recording.")
      } else if (error.message.includes("Failed to fetch")) {
        setAudioError("Network error. Please check your connection and try again.")
      } else {
        setAudioError(`Error: ${error.message}`)
      }
    } finally {
      setIsProcessingCustomTopic(false)
    }
  }, [])

  const startDebateWithCharacters = async (topic, characters) => {
    console.log("🎯 [START DEBATE WITH CHARS] Function called with topic:", topic)
    console.log("🎯 [START DEBATE WITH CHARS] Using characters:", characters)

    if (!characters || characters.length !== 2) {
      console.error("🎯 [START DEBATE WITH CHARS] Invalid characters - returning early")
      setAudioError("Please select exactly two characters to start a debate")
      return
    }

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

      console.log("🎯 [START DEBATE WITH CHARS] Starting audio playback...")
      // Note: Audio playback will be handled by the DebateInterface component
    } catch (error) {
      console.error("🎯 [START DEBATE WITH CHARS] Error starting debate:", error)
      setAudioError(`Failed to start debate: ${error.message}`)
      setIsDebating(false)
      setSpeakerStatus(null)
      setCurrentSpeaker(null)
    }
  }

  const pauseAudio = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      setIsPaused(true)
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

  const handleCustomTopicClick = useCallback(() => {
    if (isRecordingCustomTopic) {
      stopCustomTopicRecording()
    } else if (!isProcessingCustomTopic) {
      startCustomTopicRecording()
    }
  }, [isRecordingCustomTopic, isProcessingCustomTopic, startCustomTopicRecording, stopCustomTopicRecording])

  const handleRecordingButtonClick = useCallback(
    async (characterId, e) => {
      e.stopPropagation()

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
    [mode, selectedPersona, isListening, isProcessing, isPlaying, startListening, stopListening],
  )

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
    setDebateMessages([])
    setCurrentSpeaker(null)
    setSpeakerStatus(null)
    setDebateRound(0)
    setIsPaused(false)
    setIsDebatePaused(false)
    setIsRecordingCustomTopic(false)
    setIsProcessingCustomTopic(false)
    setTopics([])
    setLoadingTopics(false)
  }

  const handleTopicSelect = useCallback(
    async (topic) => {
      const topicString = typeof topic === "object" ? topic.title || topic.description || String(topic) : topic
      setShowTopicSelector(false)
      startDebate(topicString)
    },
    [selectedCharacters, addDebugLog],
  )

  const handleScreenTap = useCallback(async () => {
    if (currentAudioRef.current && audioError?.includes("tap the screen")) {
      addDebugLog("User tapped screen - attempting to unlock audio")
      try {
        await currentAudioRef.current.play()
        setAudioError(null)
        addDebugLog("Audio unlocked successfully")
      } catch (error) {
        addDebugLog(`Audio unlock failed: ${error.message}`)
      }
    }
  }, [audioError])

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
        return selectedCharacters.includes(characterId) ? "Selected" : "Select"
      }
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

  useEffect(() => {
    async function testAPIConnectivity() {
      try {
        console.log("🔍 [API TEST] Testing API connectivity...")

        const testResponse = await fetch("/api/transcribe", {
          method: "OPTIONS",
        })

        console.log("🔍 [API TEST] Transcribe API status:", testResponse.status)

        const chatResponse = await fetch("/api/chat-streaming", {
          method: "OPTIONS",
        })

        console.log("🔍 [API TEST] Chat API status:", chatResponse.status)
      } catch (error) {
        console.error("🔍 [API TEST] API connectivity test failed:", error)
        setAudioError("API endpoints not accessible. Please check your setup.")
      }
    }

    if (!isLoading) {
      testAPIConnectivity()
    }
  }, [isLoading])

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
      <div
        className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white"
        onClick={handleScreenTap}
      >
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

          {/* Character Grid */}
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
                    <div className="h-48 relative">
                      <img
                        src={persona.image || "/placeholder.svg"}
                        alt={persona.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />

                      {isCurrentDebateSpeaker && speakerStatus === "speaking" && (
                        <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>

                    <div className="p-3 min-h-[120px] flex flex-col">
                      <h3 className="text-sm font-bold text-yellow-400 mb-2 truncate">{persona.name}</h3>

                      <div className="mt-auto flex space-x-1">
                        {mode === "question" ? (
                          <>
                            <button
                              onClick={(e) => handleRecordingButtonClick(key, e)}
                              disabled={shouldGrayOut}
                              className={`flex-1 py-2 px-2 rounded text-xs font-semibold transition-all duration-300 ${getButtonColor(key)} ${
                                shouldGrayOut ? "bg-gray-600 text-gray-400 cursor-not-allowed" : ""
                              }`}
                            >
                              <span className="truncate">{getStatusText(key)}</span>
                            </button>
                            {isPlaying ? (
                              isPaused ? (
                                <button
                                  onClick={resumeAudio}
                                  className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                                >
                                  Resume
                                </button>
                              ) : (
                                <button
                                  onClick={pauseAudio}
                                  className="bg-yellow-500 text-black px-2 py-1 rounded text-xs"
                                >
                                  Pause
                                </button>
                              )
                            ) : null}
                            {isPlaying && (
                              <button onClick={stopAudio} className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                                Stop
                              </button>
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

          {/* Debate Interface - Use advanced component when debating */}
          {isDebating && (
            <DebateInterface
              character1={selectedCharacters[0]}
              character2={selectedCharacters[1]}
              initialTopic={debateTopic}
              onDebateEnd={() => {
                // Reset to topic selection
                setIsDebating(false)
                setDebateTopic("")
                setShowTopicSelector(true)
                setDebateMessages([])
                setCurrentSpeaker(null)
                setSpeakerStatus(null)
                setDebateRound(0)
              }}
              embedded={true}
            />
          )}

          {/* Audio Error Display */}
          {audioError && <div className="mb-8 p-4 bg-red-900 text-red-100 rounded-lg text-center">{audioError}</div>}

          {/* Topic Selector */}
          {showTopicSelector && selectedCharacters.length === 2 && !isDebating && (
            <div className="w-full max-w-4xl mx-auto mb-8">
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">Choose a Debate Topic</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {topics.map((topic, index) => (
                    <div
                      key={index}
                      onClick={() => handleTopicSelect(topic)}
                      className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition-all duration-300 hover:scale-105 border border-gray-600 hover:border-yellow-400"
                    >
                      <h3 className="text-lg font-semibold text-yellow-400">{topic.title}</h3>
                      <p className="text-gray-400 text-sm">{topic.description}</p>
                    </div>
                  ))}
                  <div
                    onClick={handleCustomTopicClick}
                    className={`bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition-all duration-300 hover:scale-105 border border-gray-600 hover:border-yellow-400 flex items-center justify-center ${
                      isRecordingCustomTopic || isProcessingCustomTopic ? "opacity-70" : ""
                    }`}
                    disabled={isRecordingCustomTopic || isProcessingCustomTopic}
                  >
                    {isRecordingCustomTopic ? (
                      <>
                        <SmallMicIcon isActive={true} />
                        <span className="ml-2 text-lg font-semibold text-yellow-400">Recording...</span>
                      </>
                    ) : isProcessingCustomTopic ? (
                      <span className="text-lg font-semibold text-yellow-400">Processing...</span>
                    ) : (
                      <>
                        <SmallMicIcon isActive={false} />
                        <span className="ml-2 text-lg font-semibold text-yellow-400">Record Custom Topic</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Debug Console for Mobile */}
      {isMobile() && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setShowDebugConsole(!showDebugConsole)}
            className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm mb-2"
          >
            {showDebugConsole ? "Hide Debug" : "Show Debug"}
          </button>

          {showDebugConsole && (
            <div className="bg-black text-green-400 p-4 rounded-lg max-w-sm max-h-64 overflow-y-auto text-xs font-mono">
              <div className="mb-2 text-white font-bold">Debug Console:</div>
              {debugLogs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
              {debugLogs.length === 0 && <div className="text-gray-500">No debug logs yet...</div>}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
