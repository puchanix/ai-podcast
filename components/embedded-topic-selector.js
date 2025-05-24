"use client"

import { useState, useEffect } from "react"

function EmbeddedTopicSelector({ onSelectTopic, character1, character2 }) {
  const [topics, setTopics] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchTopics() {
      if (!character1 || !character2) return

      setIsLoading(true)
      setError(null)

      try {
        console.log("🔍 Fetching topics for:", character1, "vs", character2)

        const response = await fetch("/api/generate-character-topics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            character1: typeof character1 === "string" ? character1 : character1.name || character1,
            character2: typeof character2 === "string" ? character2 : character2.name || character2,
          }),
        })

        console.log("🔍 API Response status:", response.status)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("🔍 API Response data:", data)

        if (data.topics && Array.isArray(data.topics)) {
          setTopics(data.topics)
        } else {
          throw new Error("Invalid response format")
        }
      } catch (error) {
        console.error("🔍 Error fetching topics:", error)
        setError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopics()
  }, [character1, character2])

  const handleTopicClick = (topic) => {
    console.log("🔍 Topic selected:", topic)
    if (onSelectTopic) {
      onSelectTopic(topic.title)
    }
  }

  // Get character data safely
  const getCharacterInfo = (char) => {
    if (!char) return { name: "Unknown", image: "/placeholder.svg" }
    if (typeof char === "string") return { name: char, image: "/placeholder.svg" }
    return { name: char.name || "Unknown", image: char.image || "/placeholder.svg" }
  }

  const char1Info = getCharacterInfo(character1)
  const char2Info = getCharacterInfo(character2)

  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-8">
      <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">SELECT A DEBATE TOPIC</h2>

      {/* Character VS Display */}
      <div className="flex justify-center items-center mb-8">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 ring-4 ring-yellow-400">
            <img
              src={char1Info.image || "/placeholder.svg"}
              alt={char1Info.name}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-yellow-400 font-bold text-lg">{char1Info.name}</p>
          <p className="text-sm text-gray-400">Ready</p>
        </div>

        <div className="mx-12 text-yellow-400 text-3xl font-bold">VS</div>

        <div className="text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 ring-4 ring-yellow-400">
            <img
              src={char2Info.image || "/placeholder.svg"}
              alt={char2Info.name}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-yellow-400 font-bold text-lg">{char2Info.name}</p>
          <p className="text-sm text-gray-400">Ready</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-yellow-400 text-lg">Generating custom debate topics...</p>
          <p className="text-gray-400 text-sm mt-2">
            Tailored for {char1Info.name} vs {char2Info.name}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900 text-red-100 p-4 rounded-lg mb-6 text-center">
          <p className="font-bold">Failed to generate topics</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Topics Display */}
      {!isLoading && topics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topics.map((topic, index) => {
            const colors = [
              "bg-purple-700 hover:bg-purple-600 border-purple-500",
              "bg-blue-700 hover:bg-blue-600 border-blue-500",
            ]
            const colorClass = colors[index % colors.length]

            return (
              <button
                key={topic.id || index}
                onClick={() => handleTopicClick(topic)}
                className={`${colorClass} text-white p-6 rounded-xl transition-all duration-300 text-left border-2 hover:scale-105 transform`}
              >
                <h3 className="font-bold mb-3 text-xl uppercase tracking-wide">{topic.title}</h3>
                <p className="text-gray-200 text-sm leading-relaxed">{topic.description}</p>
                <div className="mt-4 text-xs text-gray-300 uppercase tracking-wider">
                  {topic.category || "Philosophy"}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-6 p-3 bg-gray-700 rounded text-xs text-gray-300">
        <p>
          Debug: {char1Info.name} vs {char2Info.name}
        </p>
        <p>
          Topics: {topics.length}, Loading: {isLoading ? "yes" : "no"}, Error: {error || "none"}
        </p>
        <p>API Call: /api/generate-character-topics</p>
      </div>
    </div>
  )
}

export default EmbeddedTopicSelector
export { EmbeddedTopicSelector }
