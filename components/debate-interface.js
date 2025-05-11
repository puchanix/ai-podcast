// components/debate-interface.js
import { useState, useEffect } from "react"
import { personas } from "../lib/personas"

export function DebateInterface() {
  const [character1, setCharacter1] = useState("einstein")
  const [character2, setCharacter2] = useState("curie")
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [isDebating, setIsDebating] = useState(false)
  const [debateMessages, setDebateMessages] = useState([])
  const [suggestedTopics, setSuggestedTopics] = useState([])
  const [customQuestion, setCustomQuestion] = useState("")
  const [currentTopic, setCurrentTopic] = useState(null)
  const [debateFormat, setDebateFormat] = useState("pointCounterpoint")
  const [historicalContext, setHistoricalContext] = useState(true)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [audioQueue, setAudioQueue] = useState([])
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [currentAudio, setCurrentAudio] = useState(null)

  // Get character objects
  const char1 = personas[character1]
  const char2 = personas[character2]

  // Generate debate topics when characters change
  useEffect(() => {
    generateDebateTopics()
  }, [character1, character2])

  // Handle audio playback
  useEffect(() => {
    if (audioQueue.length > 0 && !isPlayingAudio) {
      playNextAudio()
    }
  }, [audioQueue, isPlayingAudio])

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
      setSuggestedTopics(data.topics)
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
    setAudioQueue([])

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
      const newMessages = [
        {
          character: character1,
          content: data.opening1,
          timestamp: Date.now(),
        },
        {
          character: character2,
          content: data.opening2,
          timestamp: Date.now() + 100,
        },
      ]
      
      setDebateMessages(newMessages)
      
      // Generate audio for both messages
      generateAudioForMessages(newMessages)
    } catch (error) {
      console.error("Error starting debate:", error)
      setIsDebating(false)
    }
  }

  // Submit a custom question to the debate
  const submitCustomQuestion = async () => {
    if (!customQuestion.trim() || !isDebating) return

    const userQuestion = customQuestion.trim()
    setCustomQuestion("")

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
      const newMessages = [
        {
          character: character1,
          content: data.response1,
          timestamp: Date.now() + 100,
        },
        {
          character: character2,
          content: data.response2,
          timestamp: Date.now() + 200,
        },
      ]
      
      setDebateMessages((prev) => [...prev, ...newMessages])
      
      // Generate audio for both messages
      generateAudioForMessages(newMessages)
    } catch (error) {
      console.error("Error continuing debate:", error)
    }
  }

  // Generate audio for messages
  const generateAudioForMessages = async (messages) => {
    setIsGeneratingAudio(true)
    
    for (const message of messages) {
      if (message.character === "user") continue
      
      try {
        const character = message.character === character1 ? char1 : char2
        
        const response = await fetch("/api/debate-audio", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: message.content,
            voice: character.voice || "en-US-Neural2-D",
            characterId: message.character,
          }),
        })
        
        if (!response.ok) throw new Error("Failed to generate audio")
        
        const data = await response.json()
        
        if (data.audioUrl) {
          setAudioQueue((prev) => [...prev, {
            url: data.audioUrl,
            character: message.character
          }])
        }
      } catch (error) {
        console.error("Error generating audio:", error)
      }
    }
    
    setIsGeneratingAudio(false)
  }

  // Play next audio in queue
  const playNextAudio = () => {
    if (audioQueue.length === 0) {
      setIsPlayingAudio(false)
      setCurrentAudio(null)
      return
    }
    
    const nextAudio = audioQueue[0]
    setAudioQueue((prev) => prev.slice(1))
    
    const audio = new Audio(nextAudio.url)
    setCurrentAudio(nextAudio.character)
    
    audio.onended = () => {
      setIsPlayingAudio(false)
      setCurrentAudio(null)
    }
    
    audio.onerror = () => {
      console.error("Error playing audio")
      setIsPlayingAudio(false)
      setCurrentAudio(null)
    }
    
    audio.play()
      .then(() => {
        setIsPlayingAudio(true)
      })
      .catch((err) => {
        console.error("Error playing audio:", err)
        setIsPlayingAudio(false)
        setCurrentAudio(null)
      })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Historical Debates</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Character 1 Selection */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-blue-500">
            <img
              src={char1.image || "/placeholder.svg"}
              alt={char1.name}
              className="w-full h-full object-cover"
            />
          </div>
          <select 
            value={character1} 
            onChange={(e) => setCharacter1(e.target.value)}
            className="p-2 border rounded"
          >
            {Object.keys(personas).map((id) => (
              <option key={id} value={id}>
                {personas[id].name}
              </option>
            ))}
          </select>
        </div>

        {/* Character 2 Selection */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-red-500">
            <img
              src={char2.image || "/placeholder.svg"}
              alt={char2.name}
              className="w-full h-full object-cover"
            />
          </div>
          <select 
            value={character2} 
            onChange={(e) => setCharacter2(e.target.value)}
            className="p-2 border rounded"
          >
            {Object.keys(personas).map((id) => (
              <option key={id} value={id}>
                {personas[id].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Debate Format Options */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Debate Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Format</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setDebateFormat("pointCounterpoint")}
                className={`px-3 py-1 rounded ${debateFormat === "pointCounterpoint" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              >
                Point/Counterpoint
              </button>
              <button 
                onClick={() => setDebateFormat("moderated")}
                className={`px-3 py-1 rounded ${debateFormat === "moderated" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              >
                Moderated
              </button>
              <button 
                onClick={() => setDebateFormat("freeform")}
                className={`px-3 py-1 rounded ${debateFormat === "freeform" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              >
                Free Discussion
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Historical Context</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setHistoricalContext(true)}
                className={`px-3 py-1 rounded ${historicalContext ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              >
                Historical Knowledge Only
              </button>
              <button 
                onClick={() => setHistoricalContext(false)}
                className={`px-3 py-1 rounded ${!historicalContext ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              >
                Include Modern Knowledge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Topics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Suggested Debate Topics</h2>
        {isGeneratingTopics ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Generating topics...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestedTopics.map((topic) => (
              <div 
                key={topic.id} 
                className="border rounded p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => startDebate(topic.title)}
              >
                <div className="flex items-start">
                  <div className={`p-2 rounded-full mr-3 ${getCategoryColor(topic.category)}`}>
                    {getCategoryIcon(topic.category)}
                  </div>
                  <div>
                    <h3 className="font-bold">{topic.title}</h3>
                    <p className="text-sm text-gray-500">{topic.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Question Input */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Ask Your Own Question</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Enter a debate question or topic..."
            disabled={!isDebating}
            className="flex-1 p-2 border rounded"
          />
          <button 
            onClick={submitCustomQuestion} 
            disabled={!isDebating || !customQuestion.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Debate Content */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {currentTopic ? `Debate: ${currentTopic}` : "Select a topic to begin"}
        </h2>

        <div className="bg-gray-100 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
          {debateMessages.length === 0 && !isDebating ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p>Select a topic above to start the debate</p>
            </div>
          ) : (
            <div className="space-y-4">
              {debateMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.character === "user" ? "justify-center" : ""}`}>
                  {msg.character !== "user" && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img
                          src={(msg.character === character1 ? char1 : char2).image || "/placeholder.svg"}
                          alt={(msg.character === character1 ? char1 : char2).name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <div className={`flex-1 ${getMessageStyle(msg.character, character1, character2)}`}>
                    {msg.character === "user" ? (
                      <div className="text-center py-2 px-4 bg-gray-200 rounded-lg inline-block">
                        <span className="font-medium">You asked:</span> {msg.content}
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <p className="font-bold">{msg.character === character1 ? char1.name : char2.name}</p>
                          {currentAudio === msg.character && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Speaking...</span>
                          )}
                        </div>
                        <p>{msg.content}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {isGeneratingAudio && (
                <div className="text-center py-2">
                  <span className="text-sm text-gray-500">Generating audio...</span>
                </div>
              )}
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
  if (messageCharacter === character1) return "bg-blue-100 p-4 rounded-lg"
  if (messageCharacter === character2) return "bg-red-100 p-4 rounded-lg"
  return "p-4 rounded-lg"
}

// Helper function to get category color
function getCategoryColor(category) {
  switch (category) {
    case "science":
      return "bg-blue-100 text-blue-700"
    case "philosophy":
      return "bg-purple-100 text-purple-700"
    case "politics":
      return "bg-red-100 text-red-700"
    case "arts":
      return "bg-yellow-100 text-yellow-700"
    case "technology":
      return "bg-green-100 text-green-700"
    case "history":
      return "bg-orange-100 text-orange-700"
    default:
      return "bg-gray-100 text-gray-700"
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
    default:
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
  }
}