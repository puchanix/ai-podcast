"use client"

import Head from "next/head"
import { useState, useEffect, useRef, useCallback } from "react"
import { io } from "socket.io-client"
import { v4 as uuidv4 } from "uuid"
import { useSearchParams } from "next/navigation"
import { useCookies } from "react-cookie"
import { useRouter } from "next/router"
import { usePlausible } from "next-plausible"

import CharacterSelector from "../components/CharacterSelector"
import TopicSelector from "../components/TopicSelector"
import DebateInterface from "../components/DebateInterface"
import QuestionInterface from "../components/QuestionInterface"
import SettingsModal from "../components/SettingsModal"
import InstructionsModal from "../components/InstructionsModal"
import FeedbackModal from "../components/FeedbackModal"
import ErrorModal from "../components/ErrorModal"
import AudioVisualizer from "../components/AudioVisualizer"
import { defaultSettings, getLocalStorage, setLocalStorage } from "../utils/LocalStorage"
import { getCookieConsent, setCookieConsent, deleteCookieConsent } from "../utils/CookieConsent"
import { getBrowserLanguage, getSystemVoices, getVoiceForLanguage } from "../utils/Voices"
import { getShortErrorMessage, isMobileDevice } from "../utils/Utils"
import { DEFAULT_DEBATE_TOPICS, DEFAULT_QUESTION_PERSONAS } from "../utils/Constants"

const SOCKET_URL = process.env.NODE_ENV === "production" ? "https://api.aiversus.com" : "http://localhost:3001"

export default function Home() {
  const plausible = usePlausible()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cookies, setCookie] = useCookies(["cookieConsent"])

  // Session management
  const [sessionId, setSessionId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  // UI state
  const [mode, setMode] = useState("question") // question | debate
  const [showTopicSelector, setShowTopicSelector] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Audio unlock
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  // Character selection
  const [availableCharacters, setAvailableCharacters] = useState(DEFAULT_QUESTION_PERSONAS)
  const [selectedCharacters, setSelectedCharacters] = useState([])
  const [selectedPersona, setSelectedPersona] = useState(null)
  const currentPersonaRef = useRef(null)

  // Debate state
  const [isDebating, setIsDebating] = useState(false)
  const [debateTopic, setDebateTopic] = useState("")
  const debateTopicRef = useRef("")
  const [debateMessages, setDebateMessages] = useState([])
  const [currentSpeaker, setCurrentSpeaker] = useState(null)
  const [speakerStatus, setSpeakerStatus] = useState(null)
  const [debateRound, setDebateRound] = useState(0)

  // Voice settings
  const [userLanguage, setUserLanguage] = useState("en-US")
  const [systemVoices, setSystemVoices] = useState([])
  const [settings, setSettings] = useState(defaultSettings)
  const [cookieConsent, setCookieConsentState] = useState(false)

  // STT / TTS
  const [isListening, setIsListening] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sttEngine, setSttEngine] = useState(null)
  const [ttsEngine, setTtsEngine] = useState(null)

  // Custom topic recording
  const [isRecordingCustomTopic, setIsRecordingCustomTopic] = useState(false)
  const [isProcessingCustomTopic, setIsProcessingCustomTopic] = useState(false)

  // References
  const audioContextRef = useRef(null)
  const audioStreamRef = useRef(null)
  const audioAnalyserRef = useRef(null)
  const audioSourceRef = useRef(null)

  // Initialize session ID
  useEffect(() => {
    const newSessionId = uuidv4()
    setSessionId(newSessionId)
    console.log(`✨ Initialized session ${newSessionId.substring(0, 8)}`)
  }, [])

  // Initialize cookie consent
  useEffect(() => {
    const consent = getCookieConsent(cookies)
    setCookieConsentState(consent)
  }, [cookies])

  // Initialize settings
  useEffect(() => {
    const storedSettings = getLocalStorage("settings")
    if (storedSettings) {
      setSettings(storedSettings)
    } else {
      setLocalStorage("settings", defaultSettings)
    }
  }, [])

  // Initialize system voices
  useEffect(() => {
    const voices = getSystemVoices()
    setSystemVoices(voices)
  }, [])

  // Initialize user language
  useEffect(() => {
    const language = getBrowserLanguage()
    setUserLanguage(language)
  }, [])

  // Initialize mobile state
  useEffect(() => {
    setIsMobile(isMobileDevice())
  }, [])

  // Initialize socket
  useEffect(() => {
    if (!sessionId) return

    console.log(`🔌 Connecting to socket...`)
    const newSocket = io(SOCKET_URL, {
      query: { session_id: sessionId },
      transports: ["websocket"],
      upgrade: false,
    })

    newSocket.on("connect", () => {
      console.log("✅ Connected to socket")
      setConnected(true)
    })

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from socket")
      setConnected(false)
    })

    newSocket.on("error", (err) => {
      const message = `Socket error: ${getShortErrorMessage(err)}`
      console.error(message)
      setError(message)
    })

    newSocket.on("connect_error", (err) => {
      const message = `Socket connect error: ${getShortErrorMessage(err)}`
      console.error(message)
      setError(message)
    })

    newSocket.on("debate_message", (message) => {
      setDebateMessages((prevMessages) => [...prevMessages, message])
    })

    newSocket.on("speaker_status", (status) => {
      setSpeakerStatus(status)
    })

    setSocket(newSocket)

    // Clean up on unmount
    return () => {
      console.log("🔌 Disconnecting from socket...")
      newSocket.off("connect")
      newSocket.off("disconnect")
      newSocket.off("error")
      newSocket.off("connect_error")
      newSocket.off("debate_message")
      newSocket.off("speaker_status")
      newSocket.disconnect()
    }
  }, [sessionId])

  // Initialize STT engine
  useEffect(() => {
    if (!connected || !settings) return

    const initializeSTT = async () => {
      setIsProcessing(true)
      try {
        const { STTEngine } = await import("../utils/STT")
        const newSttEngine = new STTEngine(
          userLanguage,
          settings.sttModel,
          (text) => {
            if (mode === "question") {
              handleQuestionResponse(text)
            } else if (mode === "debate") {
              handleDebateResponse(text)
            }
          },
          (error) => {
            const message = `STT error: ${getShortErrorMessage(error)}`
            console.error(message)
            setError(message)
            stopListening()
          },
        )
        setSttEngine(newSttEngine)
        console.log("🎤 STT engine initialized")
      } catch (e) {
        const message = `STT init error: ${getShortErrorMessage(e)}`
        console.error(message)
        setError(message)
      } finally {
        setIsProcessing(false)
      }
    }

    initializeSTT()
  }, [connected, userLanguage, settings])

  // Initialize TTS engine
  useEffect(() => {
    if (!connected || !settings) return

    const initializeTTS = async () => {
      setIsProcessing(true)
      try {
        const { TTSEngine } = await import("../utils/TTS")
        const voice = getVoiceForLanguage(userLanguage, systemVoices)
        const newTtsEngine = new TTSEngine(
          voice ? voice.name : settings.ttsVoice,
          settings.ttsModel,
          settings.ttsLatencyFactor,
          () => {
            setIsPlaying(false)
          },
          (error) => {
            const message = `TTS error: ${getShortErrorMessage(error)}`
            console.error(message)
            setError(message)
            setIsPlaying(false)
          },
        )
        setTtsEngine(newTtsEngine)
        console.log("🗣️  TTS engine initialized")
      } catch (e) {
        const message = `TTS init error: ${getShortErrorMessage(e)}`
        console.error(message)
        setError(message)
      } finally {
        setIsProcessing(false)
      }
    }

    initializeTTS()
  }, [connected, userLanguage, systemVoices, settings])

  // Mobile audio unlock function
  const unlockAudio = useCallback(async () => {
    if (audioUnlocked) return // Already unlocked

    try {
      console.log("🔊 [MOBILE AUDIO] Attempting to unlock audio...")

      // Create and play silent audio to unlock iOS audio context
      const silentAudio = new Audio("/silent.mp3")
      silentAudio.volume = 0
      silentAudio.muted = true

      // Try to play the silent audio
      await silentAudio.play()

      // Also create and resume AudioContext if available
      if (typeof AudioContext !== "undefined" || typeof webkitAudioContext !== "undefined") {
        const AudioContextClass = AudioContext || webkitAudioContext
        const audioContext = new AudioContextClass()
        if (audioContext.state === "suspended") {
          await audioContext.resume()
        }
        audioContext.close()
      }

      setAudioUnlocked(true)
      console.log("🔊 [MOBILE AUDIO] Audio successfully unlocked!")
    } catch (error) {
      console.error("🔊 [MOBILE AUDIO] Failed to unlock audio:", error)
      // Don't throw error, just log it - we'll try again on next interaction
    }
  }, [audioUnlocked])

  // Start listening
  const startListening = useCallback(async () => {
    if (!sttEngine || isListening || isPlaying || isProcessing) return

    setIsListening(true)
    setSpeakerStatus("listening")

    try {
      await sttEngine.start()

      // Initialize audio context and stream for visualizer
      if (!audioContextRef.current) {
        audioContextRef.current = new (AudioContext || webkitAudioContext)()
      }
      if (!audioStreamRef.current) {
        audioStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
      }

      // Create analyser and source nodes
      audioAnalyserRef.current = audioContextRef.current.createAnalyser()
      audioSourceRef.current = audioContextRef.current.createMediaStreamSource(audioStreamRef.current)

      // Connect nodes
      audioSourceRef.current.connect(audioAnalyserRef.current)
      audioAnalyserRef.current.connect(audioContextRef.current.destination)
    } catch (e) {
      const message = `Audio stream error: ${getShortErrorMessage(e)}`
      console.error(message)
      setError(message)
      stopListening()
    }
  }, [sttEngine, isListening, isPlaying, isProcessing])

  // Stop listening
  const stopListening = useCallback(() => {
    if (!sttEngine || !isListening) return

    sttEngine.stop()
    setIsListening(false)
    setSpeakerStatus(null)

    // Disconnect audio nodes
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect()
      audioSourceRef.current = null
    }
    if (audioAnalyserRef.current) {
      audioAnalyserRef.current.disconnect()
      audioAnalyserRef.current = null
    }
  }, [sttEngine, isListening])

  // Handle question response
  const handleQuestionResponse = useCallback(
    async (question) => {
      if (!question || question.length === 0) return

      stopListening()
      setIsProcessing(true)
      setSpeakerStatus("processing")

      try {
        console.log(`❓ Question: ${question}`)
        plausible("Question Asked", {
          props: {
            persona: currentPersonaRef.current,
            question: question,
          },
        })

        const response = await fetch("/api/question", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            persona: currentPersonaRef.current,
            question: question,
            settings: settings,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Question request failed: ${response.status} - ${errorData.message}`)
        }

        const data = await response.json()
        const answer = data.answer

        if (!answer || answer.length === 0) {
          throw new Error("No answer received from the server.")
        }

        console.log(`💡 Answer: ${answer}`)
        setSpeakerStatus("speaking")
        await speak(answer)
      } catch (e) {
        const message = `Question error: ${getShortErrorMessage(e)}`
        console.error(message)
        setError(message)
      } finally {
        setIsProcessing(false)
        setSpeakerStatus(null)
      }
    },
    [sessionId, settings, speak],
  )

  // Handle debate response
  const handleDebateResponse = useCallback(
    async (speech) => {
      if (!speech || speech.length === 0) return

      stopListening()
      setIsProcessing(true)
      setSpeakerStatus("processing")

      try {
        console.log(`💬 Speech: ${speech}`)
        plausible("Debate Speech", {
          props: {
            topic: debateTopicRef.current,
            speaker: currentSpeaker,
            speech: speech,
          },
        })

        socket.emit(
          "debate_speech",
          {
            session_id: sessionId,
            topic: debateTopicRef.current,
            speaker: currentSpeaker,
            speech: speech,
            settings: settings,
          },
          async (response) => {
            if (response.error) {
              throw new Error(response.error)
            }

            const { next_speaker, next_speech } = response

            if (!next_speaker || !next_speech || next_speech.length === 0) {
              throw new Error("No response received from the server.")
            }

            console.log(`🤖 Next speaker: ${next_speaker}`)
            console.log(`💡 Next speech: ${next_speech}`)

            setCurrentSpeaker(next_speaker)
            setSpeakerStatus("speaking")
            await speak(next_speech)
          },
        )
      } catch (e) {
        const message = `Debate error: ${getShortErrorMessage(e)}`
        console.error(message)
        setError(message)
      } finally {
        setIsProcessing(false)
        setSpeakerStatus(null)
      }
    },
    [sessionId, settings, speak, socket],
  )

  // Speak text
  const speak = useCallback(
    async (text) => {
      if (!ttsEngine || isPlaying || isProcessing) return

      setIsPlaying(true)
      try {
        await ttsEngine.speak(text)
      } catch (e) {
        const message = `Speak error: ${getShortErrorMessage(e)}`
        console.error(message)
        setError(message)
        setIsPlaying(false)
      }
    },
    [ttsEngine, isPlaying, isProcessing],
  )

  // Start debate
  const startDebate = useCallback(
    async (topic) => {
      if (!selectedCharacters || selectedCharacters.length !== 2) return

      setIsDebating(true)
      setDebateTopic(topic)
      debateTopicRef.current = topic
      setDebateMessages([])
      setCurrentSpeaker(selectedCharacters[0])
      setDebateRound(1)

      plausible("Debate Started", {
        props: {
          topic: topic,
          character1: selectedCharacters[0],
          character2: selectedCharacters[1],
        },
      })

      try {
        const intro = `Let's start a debate about ${topic} between ${selectedCharacters[0]} and ${selectedCharacters[1]}.`
        setSpeakerStatus("speaking")
        await speak(intro)
      } catch (e) {
        const message = `Debate start error: ${getShortErrorMessage(e)}`
        console.error(message)
        setError(message)
      }
    },
    [selectedCharacters, speak],
  )

  // Stop debate
  const stopDebate = useCallback(() => {
    setIsDebating(false)
    setDebateTopic("")
    debateTopicRef.current = ""
    setDebateMessages([])
    setCurrentSpeaker(null)
    setSpeakerStatus(null)
    setDebateRound(0)
  }, [])

  // Handle character select
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
    [mode, audioUnlocked, unlockAudio],
  )

  // Handle recording button click
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

  // Handle settings change
  const handleSettingsChange = useCallback(
    (newSettings) => {
      setSettings(newSettings)
      setLocalStorage("settings", newSettings)
    },
    [setSettings],
  )

  // Handle cookie consent
  const handleCookieConsent = useCallback(
    (consent) => {
      setCookieConsent(consent, setCookie)
      setCookieConsentState(consent)
    },
    [setCookie, setCookieConsentState],
  )

  // Handle reset cookie consent
  const handleResetCookieConsent = useCallback(() => {
    deleteCookieConsent(setCookie)
    setCookieConsentState(false)
  }, [setCookie, setCookieConsentState])

  // Handle topic select
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

  // Handle custom topic click
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

  // Start custom topic recording
  const startCustomTopicRecording = useCallback(async () => {
    if (isRecordingCustomTopic || isProcessingCustomTopic) return

    setIsRecordingCustomTopic(true)
    setSpeakerStatus("listening")

    try {
      await sttEngine.start()
    } catch (e) {
      const message = `Audio stream error: ${getShortErrorMessage(e)}`
      console.error(message)
      setError(message)
      stopCustomTopicRecording()
    }
  }, [sttEngine, isRecordingCustomTopic, isProcessingCustomTopic])

  // Stop custom topic recording
  const stopCustomTopicRecording = useCallback(() => {
    if (!sttEngine || !isRecordingCustomTopic) return

    sttEngine.stop()
    setIsRecordingCustomTopic(false)
    setSpeakerStatus(null)
    setShowTopicSelector(true)
  }, [sttEngine, isRecordingCustomTopic])

  return (
    <>
      <Head>
        <title>AI Versus</title>
        <meta name="description" content="Engage in debates with AI characters." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-md">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
              <button className="text-gray-700 hover:text-gray-900 mr-4" onClick={() => setShowInstructionsModal(true)}>
                Instructions
              </button>
              <button className="text-gray-700 hover:text-gray-900 mr-4" onClick={() => setShowFeedbackModal(true)}>
                Feedback
              </button>
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">AI Versus</h1>
            <button className="text-gray-700 hover:text-gray-900" onClick={() => setShowSettingsModal(true)}>
              Settings
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="container mx-auto px-4 py-6 flex-grow">
          {/* Mode Toggle */}
          <div className="flex justify-center mb-4">
            <button
              className={`mx-2 px-4 py-2 rounded-full ${
                mode === "question" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => {
                setMode("question")
                stopDebate()
                setShowTopicSelector(false)
                setSelectedCharacters([])
                setSelectedPersona(null)
              }}
            >
              Question
            </button>
            <button
              className={`mx-2 px-4 py-2 rounded-full ${
                mode === "debate" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              onClick={() => {
                setMode("debate")
                stopDebate()
                setShowTopicSelector(false)
                setSelectedCharacters([])
                setSelectedPersona(null)
              }}
            >
              Debate
            </button>
          </div>

          {/* Character Selector or Debate Interface */}
          {mode === "question" && (
            <QuestionInterface
              availableCharacters={availableCharacters}
              selectedPersona={selectedPersona}
              isListening={isListening}
              isPlaying={isPlaying}
              isProcessing={isProcessing}
              speakerStatus={speakerStatus}
              onCharacterSelect={handleCharacterSelect}
              onRecordingButtonClick={handleRecordingButtonClick}
            />
          )}
          {mode === "debate" && (
            <>
              <CharacterSelector
                availableCharacters={availableCharacters}
                selectedCharacters={selectedCharacters}
                onCharacterSelect={handleCharacterSelect}
                onRecordingButtonClick={handleRecordingButtonClick}
              />

              {showTopicSelector && (
                <TopicSelector
                  topics={DEFAULT_DEBATE_TOPICS}
                  onTopicSelect={handleTopicSelect}
                  onCustomTopicClick={handleCustomTopicClick}
                  isRecordingCustomTopic={isRecordingCustomTopic}
                  isProcessingCustomTopic={isProcessingCustomTopic}
                />
              )}

              {isDebating && (
                <DebateInterface
                  debateTopic={debateTopic}
                  debateMessages={debateMessages}
                  currentSpeaker={currentSpeaker}
                  speakerStatus={speakerStatus}
                  debateRound={debateRound}
                  isListening={isListening}
                  isPlaying={isPlaying}
                  isProcessing={isProcessing}
                  onStopDebate={stopDebate}
                  onRecordingButtonClick={handleRecordingButtonClick}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white shadow-md">
          <div className="container mx-auto px-4 py-3 flex justify-center items-center">
            <AudioVisualizer audioAnalyser={audioAnalyserRef.current} />
          </div>
        </footer>

        {/* Modals */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          cookieConsent={cookieConsent}
          onCookieConsent={handleCookieConsent}
          onResetCookieConsent={handleResetCookieConsent}
        />
        <InstructionsModal isOpen={showInstructionsModal} onClose={() => setShowInstructionsModal(false)} />
        <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
        <ErrorModal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} message={error} />
      </main>
    </>
  )
}
