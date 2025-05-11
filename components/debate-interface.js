// components/debate-interface.js
import { useState, useEffect, useRef } from "react"
import { characters } from "../data/characters"
import { Button } from "../components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Input } from "../components/ui/input"
import { Card, CardContent } from "../components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Loader2, MessageSquare, History, Lightbulb, Volume2, VolumeX } from 'lucide-react'
import Image from "next/image"

export function DebateInterface() {
  const [character1, setCharacter1] = useState(characters[0].id)
  const [character2, setCharacter2] = useState(characters[1].id)
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [isDebating, setIsDebating] = useState(false)
  const [debateMessages, setDebateMessages] = useState([])
  const [suggestedTopics, setSuggestedTopics] = useState([])
  const [customQuestion, setCustomQuestion] = useState("")
  const [currentTopic, setCurrentTopic] = useState(null)
  const [debateFormat, setDebateFormat] = useState("pointCounterpoint")
  const [historicalContext, setHistoricalContext] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [currentAudioIndex, setCurrentAudioIndex] = useState(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  // Refs
  const audioRef = useRef(null)
  const audioQueue = useRef([])
  const isProcessingAudio = useRef(false)
  const messagesEndRef = useRef(null)

  // Get character objects
  const char1 = characters.find((c) => c.id === character1) || characters[0]
  const char2 = characters.find((c) => c.id === character2) || characters[1]

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [debateMessages])

  // Generate debate topics when characters change
  useEffect(() => {
    generateDebateTopics()
  }, [character1, character2])

  // Audio player event handlers
  useEffect(() => {
    if (!audioRef.current) return
    
    const handleEnded = () => {
      setIsPlayingAudio(false)
      setCurrentAudioIndex(null)
      playNextInQueue()
    }
    
    const handlePlay = () => setIsPlayingAudio(true)
    const handlePause = () => setIsPlayingAudio(false)
    const handleError = (e) => {
      console.error("Audio playback error:", e)
      setIsPlayingAudio(false)
      setCurrentAudioIndex(null)
      isProcessingAudio.current = false
      playNextInQueue() // Try the next one
    }
    
    audioRef.current.addEventListener('ended', handleEnded)
    audioRef.current.addEventListener('play', handlePlay)
    audioRef.current.addEventListener('pause', handlePause)
    audioRef.current.addEventListener('error', handleError)
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded)
        audioRef.current.removeEventListener('play', handlePlay)
        audioRef.current.removeEventListener('pause', handlePause)
        audioRef.current.removeEventListener('error', handleError)
      }
    }
  }, [])

  // Function to generate debate topics based on selected characters
  const generateDebateTopics = async () => {
    if (character1 === character2) return

    setIsGeneratingTopics(true)

    try {
      const response = await fetch("/api/generate-debate-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate topics")

      const data = await response.json()
      setSuggestedTopics(data.topics || [])
    } catch (error) {
      console.error("Error generating debate topics:", error)
      // Fallback topics if API fails
      setSuggestedTopics([
        {
          id: "science-method",
          title: "Scientific Method",
          description: "Approaches to scientific discovery and experimentation",
          category: "science",
        },
        {
          id: "human-nature",
          title: "Human Nature",
          description: "The fundamental characteristics of humanity",
          category: "philosophy",
        },
        {
          id: "technology-progress",
          title: "Technological Progress",
          description: "The benefits and risks of advancing technology",
          category: "technology",
        },
      ])
    } finally {
      setIsGeneratingTopics(false)
    }
  }

  // Start a debate on a specific topic
  const startDebate = async (topic) => {
    setCurrentTopic(topic)
    setIsDebating(true)
    setDebateMessages([])
    setStatusMessage("Starting debate...")
    audioQueue.current = []

    try {
      const response = await fetch("/api/start-debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
          topic,
          format: debateFormat,
          historicalContext,
        }),
      })

      if (!response.ok) throw new Error("Failed to start debate")

      const data = await response.json()

      // Add initial messages
      const newMessages = []
      
      // First character's opening statement
      newMessages.push({
        character: character1,
        content: data.opening1,
        timestamp: Date.now(),
        audioUrl: null,
        isGeneratingAudio: !isMuted
      })
      
      // Second character's opening statement
      newMessages.push({
        character: character2,
        content: data.opening2,
        timestamp: Date.now() + 100,
        audioUrl: null,
        isGeneratingAudio: !isMuted
      })
      
      setDebateMessages(newMessages)
      setStatusMessage("")
      
      // Generate audio for each message if not muted
      if (!isMuted) {
        generateAudioForMessage(0)
        generateAudioForMessage(1)
      }
    } catch (error) {
      console.error("Error starting debate:", error)
      setStatusMessage("Failed to start debate")
      setIsDebating(false)
    }
  }

  // Submit a custom question to the debate
  const submitCustomQuestion = async () => {
    if (!customQuestion.trim() || !isDebating) return

    const userQuestion = customQuestion.trim()
    setCustomQuestion("")
    setStatusMessage("Processing question...")

    // Add user question as a special message
    setDebateMessages((prev) => [
      ...prev,
      {
        character: "user",
        content: userQuestion,
        timestamp: Date.now(),
      },
    ])

    try {
      const response = await fetch("/api/continue-debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
          userQuestion,
          currentMessages: debateMessages,
          format: debateFormat,
          historicalContext,
        }),
      })

      if (!response.ok) throw new Error("Failed to continue debate")

      const data = await response.json()

      // Add responses
      setDebateMessages((prev) => {
        const newMessages = [...prev]
        const startIndex = newMessages.length
        
        // First character's response
        newMessages.push({
          character: character1,
          content: data.response1,
          timestamp: Date.now() + 100,
          audioUrl: null,
          isGeneratingAudio: !isMuted
        })
        
        // Second character's response
        newMessages.push({
          character: character2,
          content: data.response2,
          timestamp: Date.now() + 200,
          audioUrl: null,
          isGeneratingAudio: !isMuted
        })
        
        // Generate audio for new messages if not muted
        if (!isMuted) {
          setTimeout(() => {
            generateAudioForMessage(startIndex)
            generateAudioForMessage(startIndex + 1)
          }, 100)
        }
        
        return newMessages
      })
      
      setStatusMessage("")
    } catch (error) {
      console.error("Error continuing debate:", error)
      setStatusMessage("Failed to process question")
    }
  }

  // Generate audio for a specific message
  const generateAudioForMessage = async (messageIndex) => {
    if (!debateMessages[messageIndex] || debateMessages[messageIndex].character === "user") return
    
    // Update message to show it's generating audio
    setDebateMessages(prev => {
      const updated = [...prev]
      if (updated[messageIndex]) {
        updated[messageIndex] = {
          ...updated[messageIndex],
          isGeneratingAudio: true
        }
      }
      return updated
    })
    
    try {
      // Create form data for the API
      const formData = new FormData()
      formData.append("characterId", debateMessages[messageIndex].character)
      formData.append("text", debateMessages[messageIndex].content)
      
      const response = await fetch("/api/debate-audio", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Audio API error:", errorText)
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      
      // Update message with audio URL
      setDebateMessages(prev => {
        const updated = [...prev]
        if (updated[messageIndex]) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            audioUrl: data.audioUrl,
            isGeneratingAudio: false
          }
        }
        return updated
      })
      
      // Add to audio queue
      audioQueue.current.push(messageIndex)
      
      // Play if nothing is currently playing
      if (!isPlayingAudio && !isProcessingAudio.current) {
        playNextInQueue()
      }
    } catch (error) {
      console.error("Error generating audio:", error)
      
      // Update message to show audio generation failed
      setDebateMessages(prev => {
        const updated = [...prev]
        if (updated[messageIndex]) {
          updated[messageIndex] = {
            ...updated[messageIndex],
            isGeneratingAudio: false
          }
        }
        return updated
      })
    }
  }

  // Play the next audio in the queue
  const playNextInQueue = () => {
    if (isMuted || audioQueue.current.length === 0 || isProcessingAudio.current) return
    
    isProcessingAudio.current = true
    const nextMessageIndex = audioQueue.current.shift()
    const message = debateMessages[nextMessageIndex]
    
    if (!message || !message.audioUrl) {
      isProcessingAudio.current = false
      playNextInQueue()
      return
    }
    
    setCurrentAudioIndex(nextMessageIndex)
    
    if (audioRef.current) {
      audioRef.current.src = message.audioUrl
      audioRef.current.load()
      audioRef.current.play()
        .then(() => {
          isProcessingAudio.current = false
        })
        .catch(err => {
          console.error("Error playing audio:", err)
          isProcessingAudio.current = false
          setCurrentAudioIndex(null)
          playNextInQueue() // Try the next one
        })
    } else {
      isProcessingAudio.current = false
    }
  }

  // Toggle mute state
  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setCurrentAudioIndex(null)
    audioQueue.current = []
  }

  // Play audio for a specific message
  const playMessageAudio = (messageIndex) => {
    const message = debateMessages[messageIndex]
    if (!message || !message.audioUrl || isMuted) return
    
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause()
    }
    
    setCurrentAudioIndex(messageIndex)
    
    if (audioRef.current) {
      audioRef.current.src = message.audioUrl
      audioRef.current.load()
      audioRef.current.play()
        .catch(err => {
          console.error("Error playing audio:", err)
          setCurrentAudioIndex(null)
        })
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold text-center mb-8">Historical Debates</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Character 1 Selection */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-primary">
            <Image
              src={char1.image || "/placeholder.svg"}
              alt={char1.name}
              width={128}
              height={128}
              className="object-cover"
            />
          </div>
          <Select value={character1} onValueChange={setCharacter1}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select character" />
            </SelectTrigger>
            <SelectContent>
              {characters.map((char) => (
                <SelectItem key={char.id} value={char.id}>
                  {char.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Character 2 Selection */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-secondary">
            <Image
              src={char2.image || "/placeholder.svg"}
              alt={char2.name}
              width={128}
              height={128}
              className="object-cover"
            />
          </div>
          <Select value={character2} onValueChange={setCharacter2}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select character" />
            </SelectTrigger>
            <SelectContent>
              {characters.map((char) => (
                <SelectItem key={char.id} value={char.id}>
                  {char.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audio Controls */}
      <div className="flex justify-center mb-6">
        <Button 
          variant="outline" 
          className="flex items-center gap-2" 
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {isMuted ? "Unmute" : "Mute"}
        </Button>
        <audio ref={audioRef} hidden />
      </div>

      {/* Debate Format Options */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Debate Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Format</h3>
            <Tabs value={debateFormat} onValueChange={(v) => setDebateFormat(v)}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="pointCounterpoint">Point/Counterpoint</TabsTrigger>
                <TabsTrigger value="moderated">Moderated</TabsTrigger>
                <TabsTrigger value="freeform">Free Discussion</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Historical Context</h3>
            <Tabs
              value={historicalContext ? "historical" : "modern"}
              onValueChange={(v) => setHistoricalContext(v === "historical")}
            >
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="historical">Historical Knowledge Only</TabsTrigger>
                <TabsTrigger value="modern">Include Modern Knowledge</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="bg-muted p-3 rounded-md text-center mb-4">
          <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
          {statusMessage}
        </div>
      )}

      {/* Suggested Topics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Suggested Debate Topics</h2>
        {isGeneratingTopics ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Generating topics...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestedTopics.map((topic) => (
              <Card key={topic.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => startDebate(topic.title)}>
                  <div className="flex items-start">
                    <div className={`p-2 rounded-full mr-3 ${getCategoryColor(topic.category)}`}>
                      {getCategoryIcon(topic.category)}
                    </div>
                    <div>
                      <h3 className="font-bold">{topic.title}</h3>
                      <p className="text-sm text-gray-500">{topic.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Custom Question Input */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Ask Your Own Question</h2>
        <div className="flex gap-2">
          <Input
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Enter a debate question or topic..."
            disabled={!isDebating}
            className="flex-1"
          />
          <Button onClick={submitCustomQuestion} disabled={!isDebating || !customQuestion.trim()}>
            Submit
          </Button>
        </div>
      </div>

      {/* Debate Content */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {currentTopic ? `Debate: ${currentTopic}` : "Select a topic to begin"}
        </h2>

        <div className="bg-muted rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
          {debateMessages.length === 0 && !isDebating ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
              <MessageSquare className="h-12 w-12 mb-4" />
              <p>Select a topic above to start the debate</p>
            </div>
          ) : (
            <div className="space-y-4">
              {debateMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.character === "user" ? "justify-center" : ""} ${
                    currentAudioIndex === idx ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                >
                  {msg.character !== "user" && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <Image
                          src={(msg.character === character1 ? char1 : char2).image || "/placeholder.svg"}
                          alt={(msg.character === character1 ? char1 : char2).name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <div className={`flex-1 ${getMessageStyle(msg.character, character1, character2)}`}>
                    {msg.character === "user" ? (
                      <div className="text-center py-2 px-4 bg-gray-100 dark:bg-gray-800 rounded-lg inline-block">
                        <span className="font-medium">You asked:</span> {msg.content}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold">{msg.character === character1 ? char1.name : char2.name}</p>
                          <div className="flex items-center">
                            {msg.isGeneratingAudio && (
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Generating audio...
                              </span>
                            )}
                            {msg.audioUrl && !isMuted && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 ml-2"
                                onClick={() => playMessageAudio(idx)}
                              >
                                <Volume2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p>{msg.content}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper function to get message style based on character
function getMessageStyle(messageCharacter, character1, character2) {
  if (messageCharacter === "user") return "text-center"
  if (messageCharacter === character1) return "bg-primary/10 p-4 rounded-lg"
  if (messageCharacter === character2) return "bg-secondary/10 p-4 rounded-lg"
  return "p-4 rounded-lg"
}

// Helper function to get category color
function getCategoryColor(category) {
  switch (category) {
    case "science":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
    case "philosophy":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
    case "politics":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
    case "arts":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
    case "technology":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
    case "history":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  }
}

// Helper function to get category icon
function getCategoryIcon(category) {
  switch (category) {
    case "science":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 2v8L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45L14 10V2"></path>
          <path d="M8.5 2h7"></path>
          <path d="M7 16h10"></path>
        </svg>
      )
    case "philosophy":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
      )
    case "politics":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 20h.01"></path>
          <path d="M7 20v-4"></path>
          <path d="M12 20v-8"></path>
          <path d="M17 20V8"></path>
          <path d="M22 4v16"></path>
        </svg>
      )
    case "arts":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="13.5" cy="6.5" r="2.5"></circle>
          <path d="M17 4c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
          <path d="M19 8c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
          <path d="M15 10c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
          <path d="M11 12c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
          <path d="m3 16 2 2 4-4"></path>
          <path d="M3 12h.01"></path>
          <path d="M7 12h.01"></path>
          <path d="M11 16h.01"></path>
          <path d="M15 16h.01"></path>
          <path d="M19 16h.01"></path>
        </svg>
      )
    case "technology":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="4" width="16" height="16" rx="2"></rect>
          <rect x="9" y="9" width="6" height="6"></rect>
          <path d="M15 2v2"></path>
          <path d="M15 20v2"></path>
          <path d="M2 15h2"></path>
          <path d="M20 15h2"></path>
        </svg>
      )
    case "history":
      return <History className="h-4 w-4" />
    default:
      return <Lightbulb className="h-4 w-4" />
  }
}