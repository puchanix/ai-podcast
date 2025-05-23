"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/router"
import Layout from "../components/layout"
import { VoiceInput } from "../components/voice-input"
import { personas } from "../lib/personas"

export default function Home() {
  const router = useRouter()
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

  // Audio ref for playing responses
  const audioRef = useRef(null)

  // Convert personas object to array for easier handling
  const heroesArray = Object.keys(personas).map((key) => ({
    id: key,
    ...personas[key],
  }))

  // Generate topics when two heroes are selected
  useEffect(() => {
    if (selectedHeroes.length === 2 && mode === "debate-select") {
      generateTopics()
    }
  }, [selectedHeroes, mode])

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
      setGeneratedTopics(data.topics || [])
    } catch (error) {
      console.error("Error generating topics:", error)
      setGeneratedTopics(["The nature of human knowledge and creativity", "The role of art and science in society"])
    } finally {
      setIsGeneratingTopics(false)
    }
  }

  // Start debate with selected topic
  const startDebate = (topic) => {
    if (selectedHeroes.length !== 2) return

    router.push({
      pathname: "/debate",
      query: {
        character1: selectedHeroes[0].id,
        character2: selectedHeroes[1].id,
        topic: topic,
      },
    })
  }

  const resetSelection = () => {
    setMode(null)
    setSelectedHero(null)
    setSelectedHeroes([])
    setGeneratedTopics([])
    setUserQuestion("")
    setHeroResponse("")
    setCurrentAudioUrl("")
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
  }

  // Handle question submission - using the original working approach
  const handleQuestionSubmit = async (question) => {
    if (!selectedHero) return

    setUserQuestion(question)
    setIsProcessingQuestion(true)
    setHeroResponse("")
    setCurrentAudioUrl("")

    try {
      // Use the same approach as the original working system
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          persona: selectedHero.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()
      setHeroResponse(data.response)

      // Generate audio using the same approach as the original system
      if (data.response) {
        const audioResponse = await fetch("/api/speak", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: data.response,
            voice: selectedHero.voiceId || "echo",
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
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 md:mb-0 md:mr-6 shadow-lg">
                <img
                  src={
                    selectedHero.image || `/placeholder.svg?height=128&width=128&query=${selectedHero.name} portrait`
                  }
                  alt={selectedHero.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{selectedHero.name}</h1>
                <p className="text-slate-600 mb-4">{selectedHero.systemPrompt?.substring(8) || "Historical figure"}</p>
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
                    <div className="inline-block animate-pulse">
                      <span className="text-slate-500">Thinking...</span>
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

        {/* Mode Selection */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={() => setMode("qa-select")}
            className={`px-8 py-4 rounded-xl font-semibold transition-all ${
              mode === "qa-select"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-300"
            }`}
          >
            Ask Questions to a Hero
          </button>
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

        {/* Instructions */}
        {mode === "qa-select" && (
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Choose a Hero to Question</h2>
            <p className="text-slate-600">Click on any historical figure to start a conversation</p>
          </div>
        )}

        {mode === "debate-select" && (
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Select Two Heroes for a Debate</h2>
            <p className="text-slate-600">Choose exactly 2 heroes ({selectedHeroes.length}/2 selected)</p>
          </div>
        )}

        {/* Debate Topic Selection - Show when two heroes are selected */}
        {mode === "debate-select" && selectedHeroes.length === 2 && (
          <div className="mb-12 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-slate-800 mb-4 text-center">
              {selectedHeroes[0].name} vs {selectedHeroes[1].name}
            </h3>

            {isGeneratingTopics ? (
              <div className="text-center py-8">
                <div className="inline-block animate-pulse">
                  <span className="text-slate-500">Generating debate topics...</span>
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
                onClick={() => {
                  if (isDisabled) return
                  if (mode === "qa-select") {
                    handleHeroSelect(hero)
                  } else if (mode === "debate-select") {
                    handleDebateHeroSelect(hero)
                  } else {
                    // If no mode is selected, default to Q&A
                    handleHeroSelect(hero)
                  }
                }}
                className={`group cursor-pointer transform transition-all duration-300 ${
                  isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
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
                    <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                      {hero.name}
                    </h3>

                    {/* Selection indicator for debate mode */}
                    {mode === "debate-select" && isSelected && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Selected
                        </span>
                      </div>
                    )}

                    {/* Action button - only show if a mode is selected */}
                    {mode && (
                      <div
                        className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 ${
                          mode === "qa-select" || !mode
                            ? "bg-blue-600 text-white group-hover:bg-blue-700"
                            : isSelected
                              ? "bg-purple-600 text-white"
                              : "bg-slate-600 text-white group-hover:bg-slate-700"
                        }`}
                      >
                        <span>
                          {mode === "qa-select" || !mode
                            ? "Ask Questions"
                            : isSelected
                              ? "Selected"
                              : "Select for Debate"}
                        </span>
                        {(mode === "qa-select" || !mode) && (
                          <svg
                            className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    )}
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
