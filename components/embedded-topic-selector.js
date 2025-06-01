"use client"

import { useState, useEffect } from "react"

export default function EmbeddedTopicSelector({ onSelectTopic, character1, character2 }) {
  const [topics, setTopics] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  console.log("🔍 [TOPIC SELECTOR DEBUG] Component mounted with:", { character1, character2 })

  useEffect(() => {
    async function fetchTopics() {
      try {
        console.log("🔍 [TOPIC SELECTOR DEBUG] Fetching topics for:", [character1, character2])
        setIsLoading(true)
        setError(null)

        const response = await fetch("/api/generate-character-topics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            characters: [character1, character2],
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch topics: ${response.status}`)
        }

        const data = await response.json()
        console.log("🔍 [TOPIC SELECTOR DEBUG] Topics received:", data)

        if (data.topics && Array.isArray(data.topics)) {
          setTopics(data.topics)
        } else {
          throw new Error("Invalid topics format received")
        }
      } catch (error) {
        console.error("🔍 [TOPIC SELECTOR DEBUG] Error fetching topics:", error)
        setError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (character1 && character2) {
      fetchTopics()
    }
  }, [character1, character2])

  const handleTopicClick = (topic) => {
    console.log("🔍 [TOPIC SELECTOR DEBUG] Topic selected:", topic)
    onSelectTopic(topic)
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">Generating Debate Topics...</h3>
        <div className="flex justify-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900 rounded-xl p-6 mb-8">
        <h3 className="text-xl font-bold text-red-400 mb-4 text-center">Error Loading Topics</h3>
        <p className="text-red-200 text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 mx-auto block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-8">
      <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">Choose a Debate Topic</h3>
      <p className="text-gray-300 text-center mb-6">
        Select a topic for the debate between {character1} and {character2}
      </p>

      {topics.length === 0 ? (
        <div className="text-center text-gray-400">No topics available. Please try again.</div>
      ) : (
        <div className="grid gap-3">
          {topics.map((topic, index) => (
            <button
              key={index}
              onClick={() => handleTopicClick(topic)}
              className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-all duration-300 hover:scale-105 border-2 border-transparent hover:border-yellow-400"
            >
              <div className="text-white font-medium">{topic.title}</div>
              {topic.description && <div className="text-gray-400 text-sm mt-1">{topic.description}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
