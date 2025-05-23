"use client"

import { useState, useEffect, useRef } from "react"
import Layout from "../components/layout"
import DebateInterface from "../components/debate-interface"
import { VoiceInput } from "../components/voice-input"
import { personas, loadVoiceIds } from "../lib/personas"

export default function Home() {
  const [mode, setMode] = useState(null) // null, 'debate', or 'qa'
  const [selectedHero, setSelectedHero] = useState(null)
  const [selectedHeroes, setSelectedHeroes] = useState([])
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [generatedTopics, setGeneratedTopics] = useState([])
  const [userQuestion, setUserQuestion] = useState("")
  const [isProcessingQuestion, setIsProcessingQuestion] = useState(false)
  const [heroResponse, setHeroResponse] = useState("")
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [currentAudioUrl, setCurrentAudioUrl] = useState("")
  const [thinkingMessage, setThinkingMessage] = useState("")
  const [voicesLoaded, setVoicesLoaded] = useState(false)

  // Audio ref for playing responses
  const audioRef = useRef(null)

  // Thinking messages for dynamic display
  const thinkingMessages = [
    "Thinking...",
    "Pondering your question...",
    "Reflecting on this matter...",
    "Considering the depths of this inquiry...",
    "Gathering thoughts...",
    "Contemplating...",
    "Preparing a response...",
  ]

  // Convert personas object to array for easier handling
  const heroesArray = Object.keys(personas).map((key) => ({
    id: key,
    ...personas[key],
  }))

  // Load voice IDs on component mount
  useEffect(() => {
    const initVoices = async () => {
      try {
        await loadVoiceIds()
        setVoicesLoaded(true)
        console.log("Voice IDs loaded successfully")
      } catch (error) {
        console.error("Failed to load voice IDs:", error)
        setVoicesLoaded(true) // Continue anyway
      }
    }
    initVoices()
  }, [])

  // Generate topics when two heroes are selected
  useEffect(() => {
    if (selectedHeroes.length === 2 && mode === "debate-select") {
      generateTopics()
    }
  }, [selectedHeroes, mode])

  // Thinking message rotation effect
  useEffect(() => {
    let interval
    if (isProcessingQuestion) {
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
  }, [isProcessingQuestion])

  // Handle single hero selection for Q&A
  const handleHeroSelect = (hero) => {
    setSelectedHero(hero)
    setMode("qa")
  }

  // Handle hero selection for debate
  const handleDebateHeroSelect = (hero) => {
    if (selectedHeroes.find((h) => h.id === hero.id)) {
      // Remove if already selected
      setSelectedHeroes(selectedHeroes.filter((h) => h.id !== hero.id))
    } else if (selectedHeroes.length < 2) {
      // Add if less than 2 selected
      setSelectedHeroes([...selectedHeroes, hero])
    }
  }

  // Generate debate topics
  const generateTopics = async () => {
    if (selectedHeroes.length !== 2) return

    setIsGeneratingTopics(true)
    try {
      const response = await fetch("/api/generate-character-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1: selectedHeroes[0].id,
          character2: selectedHeroes[1].id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate topics")
      }

      const data = await response.json()
      // Ensure we're getting the topic strings, not objects
      const topics = data.topics || []
      const topicStrings = topics.map((topic) => {
        if (typeof topic === "string") {
          return topic
        } else if (topic && topic.title) {
          return topic.title
        } else if (topic && topic.description) {
          return topic.description
        }
        return "A debate topic for these historical figures"
      })
      setGeneratedTopics(topicStrings)
    } catch (error) {
      console.error("Error generating topics:", error)
      setGeneratedTopics(["The nature of human knowledge and creativity", "The role of art and science in society"])
    } finally {
      setIsGeneratingTopics(false)
    }
  }

  // Start debate with selected topic - store topic for DebateInterface
  const startDebate = (topic) => {
    if (selectedHeroes.length !== 2) return
    // Store the topic in the selected heroes for the DebateInterface
    setSelectedHeroes((prev) => prev.map((hero) => ({ ...hero, debateTopic: topic })))
    setMode("debate")
  }

  const resetSelection = () => {
    setMode(null)
    setSelectedHero(null)
    setSelectedHeroes([])
    setGeneratedTopics([])
    setUserQuestion("")
    setHeroResponse("")
    setCurrentAudioUrl("")
    setThinkingMessage("")
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
  }

  // Handle question submission - optimized for speed
  const handleQuestionSubmit = async (question) => {
    if (!selectedHero) return

    setUserQuestion(question)
    setIsProcessingQuestion(true)
    setHeroResponse("")
    setCurrentAudioUrl("")

    try {
      // Start both text generation and voice preparation in parallel
      const textPromise = fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          persona: selectedHero.id,
        }),
      })

      const textResponse = await textPromise
      if (!textResponse.ok) {
        throw new Error("Failed to get response")
      }

      const data = await textResponse.json()
      setHeroResponse(data.response)

      // Generate audio using the correct ElevenLabs voice ID
      if (data.response) {
        // Use the getVoiceId function to get the correct ElevenLabs voice
        const voiceId = selectedHero.getVoiceId ? selectedHero.getVoiceId() : selectedHero.voiceId || "echo"
        console.log(`Using voice ID for ${selectedHero.name}: ${voiceId}`)

        const audioResponse = await fetch("/api/speak", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: data.response,
            voice: voiceId,
          }),
        })

        if (audioResponse.ok) {
          const audioData = await audioResponse.json()
          setCurrentAudioUrl(audioData.audioUrl)

          // Auto-play the audio
          if (audioRef.current && audioData.audioUrl) {
            audioRef.current.src = audioData.audioUrl
            audioRef.current.load()
            audioRef.current.play().catch(console.error)
          }
        }
      }
    } catch (error) {
      console.error("Error getting response:", error)
      setHeroResponse("I'm sorry, I couldn't process your question at this time.")
    } finally {
      setIsProcessingQuestion(false)
      setThinkingMessage("")
    }
  }

  // Handle canned question click
  const handleCannedQuestionClick = (question) => {
    handleQuestionSubmit(question)
  }

  // Handle audio play/pause
  const toggleAudio = () => {
    if (!audioRef.current || !currentAudioUrl) return

    if (isPlayingAudio) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(console.error)
    }
  }

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePlay = () => setIsPlayingAudio(true)
    const handlePause = () => setIsPlayingAudio(false)
    const handleEnded = () => setIsPlayingAudio(false)

    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [currentAudioUrl])

  // If in Q&A mode with a selected hero
  if (mode === "qa" && selectedHero) {
    return (
      <Layout title={`Q&A with ${selectedHero.name}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <button
              onClick={resetSelection}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </button>
          </div>

          {/* Hero Q&A Interface */}
          <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl p-8 shadow-lg">
            <div className="flex flex-col md:flex-row items-center mb-8">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 md:mb-0 md:mr-6 shadow-lg relative">
                <img
                  src={
                    selectedHero.image || `/placeholder.svg?height=128&width=128&query=${selectedHero.name} portrait`
                  }
                  alt={selectedHero.name}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    isProcessingQuestion ? "animate-pulse opacity-75" : ""
                  }`}
                />
                {/* Thinking indicator overlay */}
                {isProcessingQuestion && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{selectedHero.name}</h1>
                <p className="text-slate-600 mb-4">{selectedHero.systemPrompt?.substring(8) || "Historical figure"}</p>
                {/* Dynamic thinking message */}
                {isProcessingQuestion && <p className="text-blue-600 font-medium animate-pulse">{thinkingMessage}</p>}
              </div>
            </div>

            {/* Conversation Area */}
            {userQuestion && (
              <div className="mb-8 bg-white rounded-lg p-6 shadow-sm">
                <div className="mb-4">
                  <p className="font-semibold text-slate-700">Your question:</p>
                  <p className="text-slate-600 mt-2">{userQuestion}</p>
                </div>

                {isProcessingQuestion ? (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <span className="text-slate-500 ml-2">{thinkingMessage}</span>
                    </div>
                  </div>
                ) : heroResponse ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-slate-700">{selectedHero.name}'s response:</p>
                      {currentAudioUrl && (
                        <button
                          onClick={toggleAudio}
                          className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {isPlayingAudio ? (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                              </svg>
                              Pause
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15"
                                />
                              </svg>
                              Play
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-slate-600 mt-2">{heroResponse}</p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Canned Questions */}
            {selectedHero.questions && selectedHero.questions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-4">Suggested Questions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedHero.questions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleCannedQuestionClick(question)}
                      disabled={isProcessingQuestion}
                      className="p-4 text-left bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <p className="text-slate-700">{question}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Input Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Ask Your Own Question</h3>
              <div className="flex justify-center">
                <VoiceInput onSubmit={handleQuestionSubmit} buttonText={`Ask ${selectedHero.name}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Hidden audio element */}
        <audio ref={audioRef} preload="auto" className="hidden" />
      </Layout>
    )
  }

  // If in debate mode - use original approach with proper props
  if (mode === "debate" && selectedHeroes.length === 2) {
    return (
      <Layout title={`Debate: ${selectedHeroes[0].name} vs ${selectedHeroes[1].name}`}>
        <DebateInterface
          character1={selectedHeroes[0].id}
          character2={selectedHeroes[1].id}
          initialTopic={selectedHeroes[0].debateTopic}
          onBack={resetSelection}
        />
      </Layout>
    )
  }

  // Main home page
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-6">
            Heroes of History
          </h1>
        </div>

        {/* Voice loading indicator */}
        {!voicesLoaded && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading character voices...
            </div>
          </div>
        )}

        {/* Mode Selection - Only show Watch Heroes Debate button */}
        <div className="flex justify-center mb-12">
          <button
            onClick={() => setMode("debate-select")}
            className={`px-8 py-4 rounded-xl font-semibold transition-all ${
              mode === "debate-select"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-white text-slate-700 border-2 border-slate-200 hover:border-purple-300"
            }`}
          >
            Watch Heroes Debate
          </button>
        </div>

        {/* Debate Topic Selection - Show when two heroes are selected */}
        {mode === "debate-select" && selectedHeroes.length === 2 && (
          <div className="mb-12 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-slate-800 mb-4 text-center">
              {selectedHeroes[0].name} vs {selectedHeroes[1].name}
            </h3>

            {isGeneratingTopics ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <span className="text-slate-500 ml-2">Generating debate topics...</span>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-slate-800 mb-4">Choose a Debate Topic</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedTopics.map((topic, index) => (
                      <button
                        key={index}
                        onClick={() => startDebate(topic)}
                        className="p-4 text-left bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-slate-200 hover:border-slate-300"
                      >
                        <p className="text-slate-700">{topic}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h4 className="text-xl font-semibold text-slate-800 mb-4">Suggest Your Own Topic</h4>
                  <div className="flex justify-center">
                    <VoiceInput onSubmit={(topic) => startDebate(topic)} buttonText="Record Custom Topic" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Heroes Grid - Always show this */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {heroesArray.map((hero) => {
            const isSelected = mode === "debate-select" && selectedHeroes.find((h) => h.id === hero.id)
            const isDisabled = mode === "debate-select" && selectedHeroes.length >= 2 && !isSelected

            return (
              <div
                key={hero.id}
                className={`group transform transition-all duration-300 ${
                  isDisabled ? "opacity-50" : "hover:scale-105"
                }`}
              >
                <div
                  className={`bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${
                    isSelected ? "border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100" : "border-white/50"
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex justify-center mb-4">
                    <div
                      className={`w-20 h-20 rounded-full overflow-hidden shadow-lg border-4 ${
                        isSelected ? "border-purple-500" : "border-white"
                      }`}
                    >
                      <img
                        src={hero.image || `/placeholder.svg?height=80&width=80&query=${hero.name} portrait`}
                        alt={hero.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 group-hover:text-slate-900 transition-colors">
                      {hero.name}
                    </h3>

                    {/* Selection indicator for debate mode */}
                    {mode === "debate-select" && isSelected && (
                      <div className="mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Selected for Debate
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="space-y-2">
                      {/* Ask Question button - always show unless in debate mode */}
                      {mode !== "debate-select" && (
                        <button
                          onClick={() => handleHeroSelect(hero)}
                          className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <span>Ask a Question</span>
                          <svg
                            className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}

                      {/* Select for Debate button - only show in debate mode */}
                      {mode === "debate-select" && (
                        <button
                          onClick={() => {
                            if (!isDisabled) {
                              handleDebateHeroSelect(hero)
                            }
                          }}
                          disabled={isDisabled}
                          className={`w-full inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 ${
                            isSelected
                              ? "bg-purple-600 text-white"
                              : isDisabled
                                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                : "bg-slate-600 text-white hover:bg-slate-700"
                          }`}
                        >
                          <span>{isSelected ? "Selected" : "Select for Debate"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Features Section - only show when no mode is selected */}
        {!mode && (
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-800 mb-4">Personal Q&A Sessions</h3>
              <p className="text-slate-600 leading-relaxed">
                Have one-on-one conversations with history's greatest minds. Ask them anything and hear their responses
                in their own voice.
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-800 mb-4">Historical Debates</h3>
              <p className="text-slate-600 leading-relaxed">
                Watch fascinating debates between historical figures on topics that shaped our world. See how different
                minds approach the same questions.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
