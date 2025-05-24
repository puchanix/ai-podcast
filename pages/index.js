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
  const [debateRound, setDebateRound] = useState(0) // Track debate rounds

  // Audio refs
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const currentPersonaRef = useRef("") // Use ref to track current persona
  const currentAudioRef = useRef(null)
  const debateMessagesRef = useRef([])
  const debateRoundRef = useRef(0)

  // ADD TOPIC REF - This is the key fix!
  const debateTopicRef = useRef("")

  // ADD VOICE IDS REF - Fix for voice persistence!
  const voiceIdsRef = useRef({})

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
          voiceIdsRef.current = data // ALSO SET THE REF!
          console.log("🔍 [VOICE DEBUG] Voice IDs set in both state and ref")
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
  }, []) // Only run once on mount, don't depend on mode

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
    console.log("🔍 [TOPIC DEBUG] Topic ref updated to:", debateTopic)
  }, [debateTopic])

  // UPDATE VOICE IDS REF when voiceIds changes
  useEffect(() => {
    voiceIdsRef.current = voiceIds
    console.log("🔍 [VOICE DEBUG] Voice IDs ref updated:", voiceIds)
  }, [voiceIds])

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
    [mode],
  )

  const startListening = useCallback(async () => {
    try {
      console.log("🔍 [AUDIO DEBUG] Starting to listen...")
      setAudioError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true, // ENABLE echo cancellation for better transcription
          noiseSuppression: true, // ENABLE noise suppression
          autoGainControl: true, // ENABLE auto gain control
          sampleRate: 16000, // Use 16kHz for better Whisper compatibility
        },
      })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus", // Use better codec if available
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          console.log("🔍 [AUDIO DEBUG] Audio chunk received, size:", event.data.size)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log("🔍 [AUDIO DEBUG] Recording stopped, total chunks:", audioChunksRef.current.length)
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        console.log("🔍 [AUDIO DEBUG] Audio blob size:", audioBlob.size, "bytes")
        await processAudioQuestion(audioBlob)
      }

      mediaRecorder.start(1000) // Record in 1-second chunks
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
      formData.append("audio", audioBlob, "question.webm") // Use correct extension

      console.log("🔍 [AUDIO DEBUG] Sending audio for transcription, blob size:", audioBlob.size)

      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text()
        console.error("🔍 [AUDIO DEBUG] Transcription API error:", errorText)
        throw new Error("Failed to transcribe audio: " + errorText)
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
          messages: [{ role: "user", content: question }],
          character: persona,
        }),
      })

      if (!textResponse.ok) {
        throw new Error("Failed to generate response")
      }

      const { content: responseText } = await textResponse.json()
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

      // USE REF INSTEAD OF STATE for voice IDs!
      const currentVoiceIds = voiceIdsRef.current

      console.log("🔍 [VOICE DEBUG] generateAudioResponse called with:")
      console.log("🔍 [VOICE DEBUG] - persona:", persona)
      console.log("🔍 [VOICE DEBUG] - voiceKey:", voiceKey)
      console.log("🔍 [VOICE DEBUG] - voiceIds from ref:", currentVoiceIds)
      console.log("🔍 [VOICE DEBUG] - voiceIds keys from ref:", Object.keys(currentVoiceIds))
      console.log("🔍 [VOICE DEBUG] - voiceIds[voiceKey] from ref:", currentVoiceIds[voiceKey])
      console.log("🔍 [VOICE DEBUG] - typeof voiceIds[voiceKey]:", typeof currentVoiceIds[voiceKey])

      let voice = currentVoiceIds[voiceKey]

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

    // Extract topic string if it's an object
    const topicString = typeof topic === "object" ? topic.title || topic.description || String(topic) : topic
    console.log("🔍 [DEBATE DEBUG] Topic string extracted:", topicString)

    setIsDebating(true)
    setDebateTopic(topicString) // Set state
    debateTopicRef.current = topicString // Set ref immediately - THIS IS THE KEY FIX!
    setCurrentSpeaker(selectedCharacters[0])
    setSpeakerStatus("thinking")
    setDebateMessages([])
    setDebateRound(0)

    console.log("🔍 [DEBATE DEBUG] Topic set in both state and ref:", topicString)

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

  // Continue debate with next round
  const continueDebate = async () => {
    console.log("🔍 [DEBATE DEBUG] Continuing debate, current round:", debateRoundRef.current)
    console.log("🔍 [DEBATE DEBUG] Selected characters:", selectedCharacters)
    console.log("🔍 [DEBATE DEBUG] Debate topic from state:", debateTopic)
    console.log("🔍 [DEBATE DEBUG] Debate topic from ref:", debateTopicRef.current) // Use ref!
    console.log("🔍 [DEBATE DEBUG] Current messages:", debateMessagesRef.current)
    console.log("🔍 [DEBATE DEBUG] Messages length:", debateMessagesRef.current.length)

    // Use the ref instead of state - THIS IS THE KEY FIX!
    const currentTopic = debateTopicRef.current

    // Validate we have a topic
    if (!currentTopic || currentTopic.trim() === "") {
      console.error("🔍 [DEBATE DEBUG] No topic available for continue")
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

      console.log("🔍 [DEBATE DEBUG] Request body being sent:", JSON.stringify(requestBody, null, 2))

      const response = await fetch("/api/auto-continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      console.log("🔍 [DEBATE DEBUG] Response status:", response.status)
      console.log("🔍 [DEBATE DEBUG] Response headers:", response.headers)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("🔍 [DEBATE DEBUG] Error response body:", errorText)
        throw new Error(`Failed to continue debate: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("🔍 [DEBATE DEBUG] Debate continued successfully:", data)

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
      console.error("🔍 [DEBATE DEBUG] Error continuing debate:", error)
      setAudioError(`Failed to continue debate: ${error.message}`)
    }
  }

  // Play debate audio with retry logic
  const playDebateAudio = async (message, allMessages, currentIndex, retryCount = 0) => {
    const { character, content } = message
    console.log(`🔍 [DEBATE DEBUG] Playing audio for ${character} (attempt ${retryCount + 1})`)

    setCurrentSpeaker(character)
    setSpeakerStatus("speaking")

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
        console.log(`🔍 [DEBATE DEBUG] ${character} finished speaking`)
        setSpeakerStatus("waiting")

        // Auto-continue to next message
        const nextIndex = currentIndex + 1
        if (nextIndex < allMessages.length) {
          setTimeout(() => {
            playDebateAudio(allMessages[nextIndex], allMessages, nextIndex)
          }, 1000)
        } else {
          // Check if we should continue with more rounds
          const currentRound = debateRoundRef.current
          console.log(`🔍 [DEBATE DEBUG] Finished round ${currentRound}, total messages: ${allMessages.length}`)

          // Continue if we have less than 8 total messages (4 rounds of 2 messages each)
          if (allMessages.length < 8) {
            setTimeout(() => {
              continueDebate()
            }, 2000)
          } else {
            // Debate finished
            console.log("🔍 [DEBATE DEBUG] Debate completed after all rounds")
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
      console.error(`🔍 [DEBATE DEBUG] Error playing audio for ${character}:`, error)

      // Retry logic for network timeouts
      if ((error.name === "AbortError" || error.message.includes("Failed to fetch")) && retryCount < 2) {
        console.log(`🔍 [DEBATE DEBUG] Retrying audio for ${character} in 3 seconds...`)
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

  const endDebate = () => {
    console.log("🔍 [DEBATE DEBUG] Ending debate")
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
    debateTopicRef.current = "" // Clear topic ref too
    setShowTopicSelector(false)
    setTopics([])
    setDebateMessages([])
    setCurrentSpeaker(null)
    setSpeakerStatus(null)
    setDebateRound(0)
    // DON'T reset voiceIds - keep them loaded!
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

      // Extract topic string properly
      const topicString = typeof topic === "object" ? topic.title || topic.description || String(topic) : topic
      console.log("🔍 [DEBATE DEBUG] Topic string for debate:", topicString)

      setShowTopicSelector(false)
      startDebate(topicString)
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

                      {/* NO MORE DEBATE MESSAGE DISPLAY - REMOVED */}

                      {/* Button Section - Always at bottom */}
                      <div className="mt-auto flex space-x-1">
                        {mode === "question" ? (
                          <>
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

                            {/* Pause/Resume/Stop buttons when playing */}
                            {selectedPersona === key && isPlaying && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    pauseAudio()
                                  }}
                                  className="px-2 py-2 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                                  title="Pause"
                                >
                                  ⏸
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    stopAudio()
                                  }}
                                  className="px-2 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700"
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
                <button
                  onClick={endDebate}
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                >
                  End Debate
                </button>
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
        </div>
      </div>
    </Layout>
  )
}
