"use client"

import React, { useState, useEffect, useRef, Suspense, useCallback } from "react"
import Head from "next/head"
import styles from "../styles/Home.module.css"
import {
  generateDebateTopics,
  generateOpeningStatements,
  generateArguments,
  generateRebuttals,
  generateClosingStatements,
  generateDebateSummary,
} from "../utils/api"
import { useSpeechSynthesis, useSpeechRecognition } from "react-speech-kit"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faPlay,
  faPause,
  faRedo,
  faMicrophone,
  faStop,
  faCog,
  faQuestionCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons"
import { useHotkeys } from "react-hotkeys-hook"
import { useIdleTimer } from "react-idle-timer"
import { Toaster, toast } from "react-hot-toast"
import { useSearchParams } from "next/navigation"

const CharacterSelect = React.lazy(() => import("../components/CharacterSelect"))
const SettingsModal = React.lazy(() => import("../components/SettingsModal"))
const HelpModal = React.lazy(() => import("../components/HelpModal"))
const ErrorModal = React.lazy(() => import("../components/ErrorModal"))

export default function Home() {
  const [debateTopic, setDebateTopic] = useState("")
  const [character1, setCharacter1] = useState("Elon Musk")
  const [character2, setCharacter2] = useState("Donald Trump")
  const [debateStage, setDebateStage] = useState("topic") // topic, opening, argument1, rebuttal1, argument2, rebuttal2, closing, summary
  const [speechText, setSpeechText] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speakerStatus, setSpeakerStatus] = useState("waiting") // waiting, speaking, done
  const [currentSpeaker, setCurrentSpeaker] = useState(1)
  const [audioError, setAudioError] = useState(null)
  const [requiresUserInteraction, setRequiresUserInteraction] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isErrorOpen, setIsErrorOpen] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [speechRate, setSpeechRate] = useState(1)
  const [speechPitch, setSpeechPitch] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState("")
  const [showTranscription, setShowTranscription] = useState(false)
  const [transcriptionCharacter, setTranscriptionCharacter] = useState(1)
  const [transcriptionDebateStage, setTranscriptionDebateStage] = useState("opening")
  const [transcriptionHistory, setTranscriptionHistory] = useState([])
  const [isIdle, setIsIdle] = useState(false)
  const [idleTimeout, setIdleTimeout] = useState(600000) // 10 minutes
  const [isFirstDebate, setIsFirstDebate] = useState(true)
  const [isDebating, setIsDebating] = useState(false)

  const currentAudioRef = useRef(null)
  const debateTopicRef = useRef("")
  const character1Ref = useRef(character1)
  const character2Ref = useRef(character2)
  const debateStageRef = useRef(debateStage)
  const speechTextRef = useRef(speechText)
  const volumeRef = useRef(volume)
  const speechRateRef = useRef(speechRate)
  const speechPitchRef = useRef(speechPitch)
  const debateMessagesRef = useRef([])

  const searchParams = useSearchParams()
  const initialTopic = searchParams.get("topic")

  const { speak, cancel, speaking, supported, voices } = useSpeechSynthesis()
  const { listen, listening, stop, finalTranscript, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition()

  // Function to handle idle state
  const handleOnIdle = () => {
    console.log("user is idle")
    setIsIdle(true)
    cancelSpeech()
    stopAudio()
    stopRecording()
  }

  const handleOnActive = () => {
    console.log("user is active")
    setIsIdle(false)
  }

  const idleTimer = useIdleTimer({
    timeout: idleTimeout,
    onIdle: handleOnIdle,
    onActive: handleOnActive,
    debounce: 500,
  })

  // Hotkey bindings
  useHotkeys("space", () => handlePlayPause(), {
    enableOnTags: ["TEXTAREA", "INPUT"],
    preventDefault: true,
  })
  useHotkeys("ctrl+space", () => handlePlayPause(), {
    enableOnTags: ["TEXTAREA", "INPUT"],
    preventDefault: true,
  })
  useHotkeys("shift+space", () => handlePlayPause(), {
    enableOnTags: ["TEXTAREA", "INPUT"],
    preventDefault: true,
  })
  useHotkeys("r", () => handleRestart(), {
    enableOnTags: ["TEXTAREA", "INPUT"],
    preventDefault: true,
  })
  useHotkeys("m", () => handleToggleMute(), {
    enableOnTags: ["TEXTAREA", "INPUT"],
    preventDefault: true,
  })
  useHotkeys("t", () => toggleTranscription(), {
    enableOnTags: ["TEXTAREA", "INPUT"],
    preventDefault: true,
  })

  // Update refs when state changes
  useEffect(() => {
    debateTopicRef.current = debateTopic
    character1Ref.current = character1
    character2Ref.current = character2
    debateStageRef.current = debateStage
    speechTextRef.current = speechText
    volumeRef.current = volume
    speechRateRef.current = speechRate
    speechPitchRef.current = speechPitch
  }, [debateTopic, character1, character2, debateStage, speechText, volume, speechRate, speechPitch])

  // Initialize debate topic from URL params
  useEffect(() => {
    if (initialTopic) {
      setDebateTopic(initialTopic)
    }
  }, [initialTopic])

  // Detect mobile
  useEffect(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  }, [])

  // Handle transcription
  useEffect(() => {
    if (listening) {
      toast.success("Transcription started", {
        position: "bottom-center",
        duration: 2000,
      })
    } else {
      toast.success("Transcription stopped", {
        position: "bottom-center",
        duration: 2000,
      })
    }
  }, [listening])

  useEffect(() => {
    if (finalTranscript) {
      setTranscription(finalTranscript)
    }
  }, [finalTranscript])

  // Function to start recording
  const startRecording = () => {
    console.log("startRecording")
    setIsRecording(true)
    setTranscription("")
    resetTranscript()
    listen()
  }

  // Function to stop recording
  const stopRecording = () => {
    console.log("stopRecording")
    setIsRecording(false)
    stop()
    handleSaveTranscription()
  }

  // Function to toggle transcription
  const toggleTranscription = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Function to handle saving transcription
  const handleSaveTranscription = () => {
    console.log("handleSaveTranscription")
    const newTranscription = {
      character: transcriptionCharacter,
      debateStage: transcriptionDebateStage,
      text: transcription,
    }

    setTranscriptionHistory((prevHistory) => [...prevHistory, newTranscription])
    setShowTranscription(true)
  }

  // Function to handle generating a new debate
  const handleGenerateDebate = async () => {
    try {
      cancelSpeech()
      stopAudio()
      stopRecording()
      setIsFirstDebate(false)
      setIsDebating(true)
      setDebateStage("topic")
      setSpeakerStatus("waiting")
      setCurrentSpeaker(1)
      setAudioError(null)
      setRequiresUserInteraction(false)
      setTranscriptionHistory([])

      if (!debateTopic) {
        setSpeakerStatus("waiting")
        setSpeechText("Generating debate topics...")
        setDebateStage("topic")
        const topics = await generateDebateTopics()
        const randomTopic = topics[Math.floor(Math.random() * topics.length)]
        setDebateTopic(randomTopic)
        setSpeechText(`The debate topic is: ${randomTopic}`)
        setCurrentSpeaker(1)
        setDebateStage("opening")
        setSpeakerStatus("done")
      } else {
        setSpeakerStatus("waiting")
        setSpeechText("Generating opening statements...")
        setDebateStage("opening")
        const openingStatements = await generateOpeningStatements(debateTopic, character1, character2)
        debateMessagesRef.current = [
          { character: 1, debateStage: "opening", text: openingStatements.character1 },
          { character: 2, debateStage: "opening", text: openingStatements.character2 },
        ]
        setSpeechText(openingStatements.character1)
        setCurrentSpeaker(1)
        setDebateStage("argument1")
        setSpeakerStatus("done")
      }
    } catch (error) {
      console.error("Error generating debate:", error)
      setAudioError("Failed to generate debate. Please check your internet connection and try again.")
      setIsErrorOpen(true)
    }
  }

  // Function to handle advancing to the next stage of the debate
  const handleNextStage = async () => {
    try {
      cancelSpeech()
      stopAudio()
      stopRecording()
      setSpeakerStatus("waiting")
      setAudioError(null)
      setRequiresUserInteraction(false)

      let nextDebateStage = ""
      let nextSpeechText = ""
      const nextSpeaker = currentSpeaker === 1 ? 2 : 1

      switch (debateStage) {
        case "topic":
          nextDebateStage = "opening"
          nextSpeechText = "Generating opening statements..."
          break
        case "opening":
          nextDebateStage = "argument1"
          nextSpeechText = "Generating first arguments..."
          break
        case "argument1":
          nextDebateStage = "rebuttal1"
          nextSpeechText = "Generating first rebuttals..."
          break
        case "rebuttal1":
          nextDebateStage = "argument2"
          nextSpeechText = "Generating second arguments..."
          break
        case "argument2":
          nextDebateStage = "rebuttal2"
          nextSpeechText = "Generating second rebuttals..."
          break
        case "rebuttal2":
          nextDebateStage = "closing"
          nextSpeechText = "Generating closing statements..."
          break
        case "closing":
          nextDebateStage = "summary"
          nextSpeechText = "Generating debate summary..."
          break
        case "summary":
          nextDebateStage = "topic"
          nextSpeechText = "Debate finished. Generating new debate topic..."
          break
        default:
          nextDebateStage = "topic"
          nextSpeechText = "Generating new debate topic..."
      }

      setDebateStage(nextDebateStage)
      setSpeechText(nextSpeechText)
      setCurrentSpeaker(nextSpeaker)

      switch (nextDebateStage) {
        case "opening":
          const openingStatements = await generateOpeningStatements(debateTopic, character1, character2)
          nextSpeechText = nextSpeaker === 1 ? openingStatements.character1 : openingStatements.character2
          break
        case "argument1":
          const firstArguments = await generateArguments(debateTopic, character1, character2)
          nextSpeechText = nextSpeaker === 1 ? firstArguments.character1 : firstArguments.character2
          break
        case "rebuttal1":
          const firstRebuttals = await generateRebuttals(debateTopic, character1, character2)
          nextSpeechText = nextSpeaker === 1 ? firstRebuttals.character1 : firstRebuttals.character2
          break
        case "argument2":
          const secondArguments = await generateArguments(debateTopic, character1, character2)
          nextSpeechText = nextSpeaker === 1 ? secondArguments.character1 : secondArguments.character2
          break
        case "rebuttal2":
          const secondRebuttals = await generateRebuttals(debateTopic, character1, character2)
          nextSpeechText = nextSpeaker === 1 ? secondRebuttals.character1 : secondRebuttals.character2
          break
        case "closing":
          const closingStatements = await generateClosingStatements(debateTopic, character1, character2)
          nextSpeechText = nextSpeaker === 1 ? closingStatements.character1 : closingStatements.character2
          break
        case "summary":
          const debateSummary = await generateDebateSummary(debateTopic, character1, character2)
          nextSpeechText = debateSummary.summary
          break
        case "topic":
          const topics = await generateDebateTopics()
          const randomTopic = topics[Math.floor(Math.random() * topics.length)]
          setDebateTopic(randomTopic)
          nextSpeechText = `The debate topic is: ${randomTopic}`
          break
        default:
          break
      }

      setSpeechText(nextSpeechText)
      setSpeakerStatus("done")
    } catch (error) {
      console.error("Error advancing to next stage:", error)
      setAudioError("Failed to generate next stage. Please check your internet connection and try again.")
      setIsErrorOpen(true)
    }
  }

  // Function to handle playing the speech text
  const handlePlaySpeech = () => {
    console.log("handlePlaySpeech")
    if (!speechText) return

    cancelSpeech()
    stopAudio()

    const character = currentSpeaker === 1 ? character1 : character2
    setSpeakerStatus("speaking")
    setIsPlaying(true)

    const utterThis = new SpeechSynthesisUtterance(speechText)
    utterThis.onend = () => {
      console.log("SpeechSynthesisUtterance.onend")
      setSpeakerStatus("done")
      setIsPlaying(false)
    }
    utterThis.onerror = (event) => {
      console.error("SpeechSynthesisUtterance.onerror", event)
      setAudioError("Text-to-speech error. Please try again.")
      setIsErrorOpen(true)
      setSpeakerStatus("waiting")
      setIsPlaying(false)
    }
    utterThis.voice = voices.find((voice) => voice.name.includes(character)) || null
    utterThis.pitch = speechPitchRef.current
    utterThis.rate = speechRateRef.current
    utterThis.volume = volumeRef.current
    speak(utterThis)
  }

  // Function to handle playing the debate audio
  const playDebateAudio = async () => {
    console.log("playDebateAudio")
    if (!speechText) return

    cancelSpeech()
    stopAudio()

    const character = currentSpeaker === 1 ? character1 : character2
    setSpeakerStatus("loading")
    setIsPlaying(true)

    const data = {
      text: speechText,
      voice: character,
      model_id: "eleven_monolingual_v1",
    }

    try {
      const response = await fetch("/api/elevenlabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      if (!isMobile) {
        // Desktop audio handling
        const audio = new Audio(url)
        audio.volume = volumeRef.current
        currentAudioRef.current = audio

        audio.addEventListener("ended", () => {
          console.log("🔊 Audio ended")
          setSpeakerStatus("done")
          setIsPlaying(false)
        })

        audio.addEventListener("error", (e) => {
          console.error("🔊 Audio error:", e)
          setAudioError("Audio playback error. Please try again.")
          setIsErrorOpen(true)
          setSpeakerStatus("waiting")
          setIsPlaying(false)
        })

        audio.play().catch((e) => {
          console.error("🔊 Audio play error:", e)
          setAudioError("Audio playback failed. Please try again.")
          setIsErrorOpen(true)
          setSpeakerStatus("waiting")
          setIsPlaying(false)
        })
      } else {
        // Mobile audio handling - Enhanced version
        console.log(`🔊 [MOBILE DEBUG] Creating audio element for ${character}`)

        // Create audio element with mobile-friendly settings
        const audio = new Audio()
        audio.preload = "auto"
        audio.crossOrigin = "anonymous"
        currentAudioRef.current = audio

        // Set up event listeners BEFORE setting src
        audio.addEventListener("loadstart", () => {
          console.log(`🔊 [MOBILE DEBUG] Audio loading started for ${character}`)
        })

        audio.addEventListener("canplay", () => {
          console.log(`🔊 [MOBILE DEBUG] Audio can play for ${character}`)
        })

        audio.addEventListener("playing", () => {
          console.log(`🔊 [MOBILE DEBUG] Audio started playing for ${character}`)
          setSpeakerStatus("speaking")
          setIsPlaying(true)
          setAudioError(null)
        })

        audio.addEventListener("ended", () => {
          console.log(`🔊 [MOBILE DEBUG] Audio ended for ${character}`)
          setSpeakerStatus("waiting")
          continueToNextSpeaker()
        })

        audio.addEventListener("error", (e) => {
          console.error(`🔊 [MOBILE DEBUG] Audio error for ${character}:`, e)
          console.error(`🔊 [MOBILE DEBUG] Audio error details:`, audio.error)

          // Check if it's a user interaction issue
          if (audio.error?.code === 4 || audio.error?.message?.includes("MEDIA_ELEMENT_ERROR")) {
            console.log(`🔊 [MOBILE DEBUG] User interaction required - showing tap message`)
            setAudioError("Tap anywhere on the screen to enable audio playback")
            setSpeakerStatus("waiting")
            return
          }

          // For other errors, try to continue
          console.log(`🔊 [MOBILE DEBUG] Continuing to next speaker due to audio error`)
          continueToNextSpeaker()
        })

        // Set the audio source
        console.log(`🔊 [MOBILE DEBUG] Setting audio source for ${character}`)
        audio.src = data.audioUrl
        audio.load()

        // Attempt to play with better error handling
        console.log(`🔊 [MOBILE DEBUG] Attempting to play audio for ${character}`)
        try {
          const playPromise = audio.play()

          if (playPromise !== undefined) {
            await playPromise
            console.log(`🔊 [MOBILE DEBUG] Audio.play() succeeded for ${character}`)
          }
        } catch (playError) {
          console.error(`🔊 [MOBILE DEBUG] Audio.play() failed for ${character}:`, playError.message)

          // Check if it's a user interaction issue
          if (
            playError.name === "NotAllowedError" ||
            playError.message.includes("user agent") ||
            playError.message.includes("autoplay") ||
            playError.message.includes("not allowed") ||
            playError.message.includes("gesture")
          ) {
            console.log(`🔊 [MOBILE DEBUG] User interaction required - showing tap message`)
            setAudioError("Tap anywhere on the screen to enable audio playback")
            setSpeakerStatus("waiting")

            // Store the current state so we can resume after user interaction
            return
          }

          // For other play errors, try to continue
          console.log(`🔊 [MOBILE DEBUG] Continuing to next speaker due to play error`)
          continueToNextSpeaker()
        }
      }
    } catch (error) {
      console.error("Error generating audio:", error)
      setAudioError("Failed to generate audio. Please check your internet connection and try again.")
      setIsErrorOpen(true)
      setSpeakerStatus("waiting")
      setIsPlaying(false)
    }
  }

  // Function to handle stopping the speech
  const cancelSpeech = () => {
    console.log("cancelSpeech")
    if (speaking) {
      cancel()
      setIsSpeaking(false)
    }
  }

  // Function to handle stopping the audio
  const stopAudio = () => {
    console.log("stopAudio")
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  // Function to handle playing or pausing the debate
  const handlePlayPause = () => {
    console.log("handlePlayPause")
    if (speakerStatus === "speaking") {
      if (!isMobile) {
        if (speaking) {
          cancelSpeech()
          setSpeakerStatus("paused")
          setIsPlaying(false)
        } else if (currentAudioRef.current) {
          currentAudioRef.current.pause()
          setSpeakerStatus("paused")
          setIsPlaying(false)
        }
      } else {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause()
          setSpeakerStatus("paused")
          setIsPlaying(false)
        }
      }
    } else {
      if (!isMobile) {
        if (supported) {
          handlePlaySpeech()
        } else {
          playDebateAudio()
        }
      } else {
        playDebateAudio()
      }
    }
  }

  // Function to handle restarting the current stage of the debate
  const handleRestart = () => {
    console.log("handleRestart")
    cancelSpeech()
    stopAudio()
    stopRecording()
    setSpeakerStatus("waiting")
    setAudioError(null)
    setRequiresUserInteraction(false)

    if (debateStage === "topic") {
      handleGenerateDebate()
    } else {
      switch (debateStage) {
        case "opening":
          generateOpeningStatements(debateTopic, character1, character2)
            .then((openingStatements) => {
              const nextSpeechText = currentSpeaker === 1 ? openingStatements.character1 : openingStatements.character2
              setSpeechText(nextSpeechText)
              setSpeakerStatus("done")
            })
            .catch((error) => {
              console.error("Error generating opening statements:", error)
              setAudioError(
                "Failed to generate opening statements. Please check your internet connection and try again.",
              )
              setIsErrorOpen(true)
            })
          break
        case "argument1":
        case "argument2":
          generateArguments(debateTopic, character1, character2)
            .then((argumentsData) => {
              const nextSpeechText = currentSpeaker === 1 ? argumentsData.character1 : argumentsData.character2
              setSpeechText(nextSpeechText)
              setSpeakerStatus("done")
            })
            .catch((error) => {
              console.error("Error generating arguments:", error)
              setAudioError("Failed to generate arguments. Please check your internet connection and try again.")
              setIsErrorOpen(true)
            })
          break
        case "rebuttal1":
        case "rebuttal2":
          generateRebuttals(debateTopic, character1, character2)
            .then((rebuttalsData) => {
              const nextSpeechText = currentSpeaker === 1 ? rebuttalsData.character1 : rebuttalsData.character2
              setSpeechText(nextSpeechText)
              setSpeakerStatus("done")
            })
            .catch((error) => {
              console.error("Error generating rebuttals:", error)
              setAudioError("Failed to generate rebuttals. Please check your internet connection and try again.")
              setIsErrorOpen(true)
            })
          break
        case "closing":
          generateClosingStatements(debateTopic, character1, character2)
            .then((closingStatements) => {
              const nextSpeechText = currentSpeaker === 1 ? closingStatements.character1 : closingStatements.character2
              setSpeechText(nextSpeechText)
              setSpeakerStatus("done")
            })
            .catch((error) => {
              console.error("Error generating closing statements:", error)
              setAudioError(
                "Failed to generate closing statements. Please check your internet connection and try again.",
              )
              setIsErrorOpen(true)
            })
          break
        case "summary":
          generateDebateSummary(debateTopic, character1, character2)
            .then((debateSummary) => {
              setSpeechText(debateSummary.summary)
              setSpeakerStatus("done")
            })
            .catch((error) => {
              console.error("Error generating debate summary:", error)
              setAudioError("Failed to generate debate summary. Please check your internet connection and try again.")
              setIsErrorOpen(true)
            })
          break
        default:
          break
      }
    }
  }

  // Function to handle toggling mute
  const handleToggleMute = () => {
    console.log("handleToggleMute")
    setIsMuted(!isMuted)
    if (currentAudioRef.current) {
      currentAudioRef.current.muted = !isMuted
    }
  }

  // Function to handle volume change
  const handleVolumeChange = (event) => {
    console.log("handleVolumeChange")
    const newVolume = Number.parseFloat(event.target.value)
    setVolume(newVolume)
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = newVolume
    }
  }

  // Function to handle speech rate change
  const handleSpeechRateChange = (event) => {
    console.log("handleSpeechRateChange")
    setSpeechRate(Number.parseFloat(event.target.value))
  }

  // Function to handle speech pitch change
  const handleSpeechPitchChange = (event) => {
    console.log("handleSpeechPitchChange")
    setSpeechPitch(Number.parseFloat(event.target.value))
  }

  // Function to handle enabling audio on mobile
  const handleEnableAudio = () => {
    console.log("handleEnableAudio")
    setRequiresUserInteraction(false)
    setAudioError(null)
    playDebateAudio()
  }

  const continueToNextSpeaker = () => {
    console.log("continueToNextSpeaker")
    stopAudio()
    cancelSpeech()
    const currentMessages = debateMessagesRef.current
    const currentIndex = currentMessages.findIndex((msg) => msg.character === currentSpeaker)
    if (currentIndex >= 0 && currentIndex + 1 < currentMessages.length) {
      const nextMessage = currentMessages[currentIndex + 1]
      setCurrentSpeaker(nextMessage.character)
      setDebateStage(nextMessage.debateStage)
      setSpeechText(nextMessage.text)
      playDebateAudio()
    } else {
      console.log("Debate Finished")
      setIsDebating(false)
    }
  }

  // Add this new function after the other functions
  const handleScreenTap = useCallback(async () => {
    if (audioError?.includes("Tap anywhere") || audioError?.includes("tap the screen")) {
      addDebugLog("User tapped screen - attempting to unlock audio")

      // Try to unlock audio context first
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        if (audioContext.state === "suspended") {
          await audioContext.resume()
          console.log("🔊 [MOBILE DEBUG] AudioContext resumed after tap")
        }
      } catch (contextError) {
        console.log("🔊 [MOBILE DEBUG] AudioContext unlock failed:", contextError.message)
      }

      // Try to play the current audio
      if (currentAudioRef.current) {
        try {
          await currentAudioRef.current.play()
          setAudioError(null)
          addDebugLog("Audio unlocked successfully after tap")
        } catch (error) {
          addDebugLog(`Audio unlock failed after tap: ${error.message}`)
          // If still failing, try to continue to next speaker
          if (isDebating) {
            setTimeout(() => {
              const currentMessages = debateMessagesRef.current
              const currentIndex = currentMessages.findIndex((msg) => msg.character === currentSpeaker)
              if (currentIndex >= 0 && currentIndex + 1 < currentMessages.length) {
                playDebateAudio(currentMessages[currentIndex + 1], currentMessages, currentIndex + 1)
              }
            }, 1000)
          }
        }
      }
    }
  }, [audioError, isDebating, currentSpeaker])

  const addDebugLog = (logMessage) => {
    console.log(`[DEBUG] ${logMessage}`)
  }

  return (
    <div className={styles.container} onClick={handleScreenTap}>
      <Head>
        <title>AI Debate Generator</title>
        <meta name="description" content="Generate AI debates between famous people." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Toaster />

      <Suspense fallback={<div>Loading...</div>}>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          volume={volume}
          speechRate={speechRate}
          speechPitch={speechPitch}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onSpeechRateChange={handleSpeechRateChange}
          onSpeechPitchChange={handleSpeechPitchChange}
          onToggleMute={handleToggleMute}
          idleTimeout={idleTimeout}
          setIdleTimeout={setIdleTimeout}
        />
      </Suspense>

      <Suspense fallback={<div>Loading...</div>}>
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      </Suspense>

      <Suspense fallback={<div>Loading...</div>}>
        <ErrorModal isOpen={isErrorOpen} onClose={() => setIsErrorOpen(false)} errorMessage={audioError} />
      </Suspense>

      <header className={styles.header}>
        <h1>AI Debate Generator</h1>

        <div className={styles.buttonGroup}>
          <button className={styles.iconButton} onClick={() => setIsSettingsOpen(true)} aria-label="Settings">
            <FontAwesomeIcon icon={faCog} />
          </button>

          <button className={styles.iconButton} onClick={() => setIsHelpOpen(true)} aria-label="Help">
            <FontAwesomeIcon icon={faQuestionCircle} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {isIdle && (
          <div className={styles.idleOverlay}>
            <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
            <p>The debate has been paused due to inactivity. Please refresh the page to continue.</p>
          </div>
        )}

        <div className={styles.debateSetup}>
          <div className={styles.topicInput}>
            <label htmlFor="debateTopic">Debate Topic:</label>
            <input
              type="text"
              id="debateTopic"
              value={debateTopic}
              onChange={(e) => setDebateTopic(e.target.value)}
              placeholder="Enter debate topic or leave blank for a random topic"
            />
          </div>

          <div className={styles.characterSelect}>
            <Suspense fallback={<div>Loading...</div>}>
              <CharacterSelect character={character1} setCharacter={setCharacter1} label="Character 1:" />
            </Suspense>

            <Suspense fallback={<div>Loading...</div>}>
              <CharacterSelect character={character2} setCharacter={setCharacter2} label="Character 2:" />
            </Suspense>
          </div>

          <button className={styles.generateButton} onClick={handleGenerateDebate}>
            {debateStage === "topic" ? "Generate Debate" : "Start Debate"}
          </button>
        </div>

        <div className={styles.debateArea}>
          <h2>{debateTopic ? debateTopic : "No topic generated yet. Click Generate Debate."}</h2>

          {debateStage !== "topic" && (
            <div className={styles.debateStage}>
              <h3>{debateStage.charAt(0).toUpperCase() + debateStage.slice(1)}</h3>

              <div className={styles.speechText}>
                <p>{speakerStatus === "loading" ? <span className={styles.loading}>Loading...</span> : speechText}</p>
              </div>

              <div className={styles.speakerInfo}>
                <p>Speaker: {currentSpeaker === 1 ? character1 : character2}</p>
                <p>Status: {speakerStatus}</p>
              </div>

              {requiresUserInteraction && (
                <div className={styles.userInteraction}>
                  <p className={styles.errorMessage}>{audioError}</p>
                  <button onClick={handleEnableAudio}>Enable Audio</button>
                </div>
              )}

              <div className={styles.controls}>
                <button
                  className={styles.controlButton}
                  onClick={handlePlayPause}
                  disabled={speakerStatus === "loading"}
                  aria-label="Play/Pause"
                >
                  <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
                </button>

                <button
                  className={styles.controlButton}
                  onClick={handleRestart}
                  disabled={speakerStatus === "loading"}
                  aria-label="Restart"
                >
                  <FontAwesomeIcon icon={faRedo} />
                </button>

                <button
                  className={styles.controlButton}
                  onClick={handleNextStage}
                  disabled={speakerStatus === "loading"}
                  aria-label="Next Stage"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {browserSupportsSpeechRecognition && (
          <div className={styles.transcriptionArea}>
            <div className={styles.transcriptionControls}>
              <label htmlFor="transcriptionCharacter">Character:</label>
              <select
                id="transcriptionCharacter"
                value={transcriptionCharacter}
                onChange={(e) => setTranscriptionCharacter(Number.parseInt(e.target.value))}
              >
                <option value={1}>{character1}</option>
                <option value={2}>{character2}</option>
              </select>

              <label htmlFor="transcriptionDebateStage">Debate Stage:</label>
              <select
                id="transcriptionDebateStage"
                value={transcriptionDebateStage}
                onChange={(e) => setTranscriptionDebateStage(e.target.value)}
              >
                <option value="opening">Opening</option>
                <option value="argument1">Argument 1</option>
                <option value="rebuttal1">Rebuttal 1</option>
                <option value="argument2">Argument 2</option>
                <option value="rebuttal2">Rebuttal 2</option>
                <option value="closing">Closing</option>
                <option value="summary">Summary</option>
              </select>

              <button
                className={styles.transcriptionButton}
                onClick={toggleTranscription}
                aria-label="Start/Stop Transcription"
              >
                <FontAwesomeIcon icon={isRecording ? faStop : faMicrophone} />
                {isRecording ? "Stop" : "Start"} Transcription
              </button>
            </div>

            {transcription && (
              <div className={styles.transcriptionText}>
                <h4>Transcription:</h4>
                <p>{transcription}</p>
              </div>
            )}

            {transcriptionHistory.length > 0 && showTranscription && (
              <div className={styles.transcriptionHistory}>
                <h4>Transcription History:</h4>
                {transcriptionHistory.map((item, index) => (
                  <div key={index} className={styles.transcriptionItem}>
                    <p>
                      <strong>Character:</strong> {item.character === 1 ? character1 : character2}
                    </p>
                    <p>
                      <strong>Debate Stage:</strong> {item.debateStage}
                    </p>
                    <p>
                      <strong>Text:</strong> {item.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} AI Debate Generator. All rights reserved.</p>
      </footer>
    </div>
  )
}
