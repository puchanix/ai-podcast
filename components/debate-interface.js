"use client"

import { useState, useEffect } from "react"
import { personas } from "../lib/personas"

// Add this to prevent prerendering errors
export const config = {
  unstable_runtimeJS: true,
}

export function DebateInterface() {
  const [character1, setCharacter1] = useState(Object.keys(personas)[0])
  const [character2, setCharacter2] = useState(Object.keys(personas)[1])
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [isDebating, setIsDebating] = useState(false)
  const [debateMessages, setDebateMessages] = useState([])
  const [suggestedTopics, setSuggestedTopics] = useState([])
  const [customQuestion, setCustomQuestion] = useState("")
  const [currentTopic, setCurrentTopic] = useState(null)
  const [debateFormat, setDebateFormat] = useState("pointCounterpoint")
  const [historicalContext, setHistoricalContext] = useState(true)

  // Get character objects
  const char1 = personas[character1]
  const char2 = personas[character2]

  // Generate debate topics when characters change
  useEffect(() => {
    generateDebateTopics()
  }, [character1, character2])

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
      setDebateMessages([
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
      ])
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
      setDebateMessages((prev) => [
        ...prev,
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
      ])
    } catch (error) {
      console.error("Error continuing debate:", error)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold text-center mb-8">Historical Debates</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Character 1 Selection */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-primary">
            <img
              src={char1?.image || "/placeholder.svg"}
              alt={char1?.name || "Character 1"}
              className="w-full h-full object-cover"
            />
          </div>
          <select
            value={character1}
            onChange={(e) => setCharacter1(e.target.value)}
            className="w-[200px] p-2 rounded border"
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
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-secondary">
            <img
              src={char2?.image || "/placeholder.svg"}
              alt={char2?.name || "Character 2"}
              className="w-full h-full object-cover"
            />
          </div>
          <select
            value={character2}
            onChange={(e) => setCharacter2(e.target.value)}
            className="w-[200px] p-2 rounded border"
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
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDebateFormat("pointCounterpoint")}
                className={`p-2 rounded ${
                  debateFormat === "pointCounterpoint" ? "bg-primary text-white" : "bg-gray-200"
                }`}
              >
                Point/Counterpoint
              </button>
              <button
                onClick={() => setDebateFormat("moderated")}
                className={`p-2 rounded ${debateFormat === "moderated" ? "bg-primary text-white" : "bg-gray-200"}`}
              >
                Moderated
              </button>
              <button
                onClick={() => setDebateFormat("freeform")}
                className={`p-2 rounded ${debateFormat === "freeform" ? "bg-primary text-white" : "bg-gray-200"}`}
              >
                Free Discussion
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Historical Context</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setHistoricalContext(true)}
                className={`p-2 rounded ${historicalContext ? "bg-primary text-white" : "bg-gray-200"}`}
              >
                Historical Knowledge Only
              </button>
              <button
                onClick={() => setHistoricalContext(false)}
                className={`p-2 rounded ${!historicalContext ? "bg-primary text-white" : "bg-gray-200"}`}
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
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <span className="ml-2">Generating topics...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestedTopics.map((topic) => (
              <div
                key={topic.id}
                className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
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
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Enter a debate question or topic..."
            disabled={!isDebating}
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={submitCustomQuestion}
            disabled={!isDebating || !customQuestion.trim()}
            className="bg-primary text-white px-4 py-2 rounded disabled:bg-gray-300"
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
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
                          src={(msg.character === character1 ? char1 : char2)?.image || "/placeholder.svg"}
                          alt={(msg.character === character1 ? char1 : char2)?.name || "Character"}
                          className="w-full h-full object-cover"
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
                        <p className="font-bold">{msg.character === character1 ? char1?.name : char2?.name}</p>
                        <p>{msg.content}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
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
  if (messageCharacter === character2) return "bg-green-100 p-4 rounded-lg"
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
          <polyline points="12 6 12 12 16 14"></polyline>
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
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      )
  }
}
