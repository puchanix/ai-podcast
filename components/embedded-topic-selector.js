"use client"

import { useState, useEffect } from "react"

function EmbeddedTopicSelector({
  onSelectTopic,
  character1,
  character2,
  isDebating = false,
  currentSpeaker = null,
  isPlaying = false,
  isLoadingAudio = false,
  thinkingMessage = "",
  char1Status = "Ready",
  char2Status = "Ready",
}) {
  const [topics, setTopics] = useState([])
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)
  const [topicsError, setTopicsError] = useState(null)

  // Generate topics when characters are provided
  useEffect(() => {
    async function generateTopics() {
      if (!character1 || !character2) return

      setIsGeneratingTopics(true)
      setTopicsError(null)

      try {
        const response = await fetch("/api/generate-character-topics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            character1: typeof character1 === "string" ? character1 : character1.name,
            character2: typeof character2 === "string" ? character2 : character2.name,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to generate topics: ${response.status}`)
        }

        const data = await response.json()
        setTopics(data.topics || [])
      } catch (error) {
        console.error("Error generating topics:", error)
        setTopicsError(error.message)
        // Fallback topics
        setTopics([
          {
            id: "fallback-1",
            title: "Philosophy and Wisdom",
            description: "Different approaches to understanding life and truth",
            category: "philosophy",
          },
          {
            id: "fallback-2",
            title: "Art and Expression",
            description: "The role of creativity in human experience",
            category: "arts",
          },
        ])
      } finally {
        setIsGeneratingTopics(false)
      }
    }

    generateTopics()
  }, [character1, character2])

  const handleTopicSelection = (topic) => {
    if (onSelectTopic) {
      onSelectTopic(topic.title || topic)
    }
  }

  // Get character data safely
  const getCharacterData = (char) => {
    if (!char) return { name: "Unknown Character", image: "/placeholder.svg" }
    if (typeof char === "object") return char
    return { name: char, image: "/placeholder.svg" }
  }

  const char1Data = getCharacterData(character1)
  const char2Data = getCharacterData(character2)

  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-8">
      <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">SELECT A DEBATE TOPIC</h2>

      {/* Character VS Display */}
      <div className="flex justify-center items-center mb-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 ring-2 ring-yellow-400">
            <img
              src={char1Data.image || "/placeholder.svg"}
              alt={char1Data.name}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-yellow-400 font-semibold">{char1Data.name}</p>
          <p className="text-sm text-gray-400">{char1Status}</p>
        </div>

        <div className="mx-8 text-yellow-400 text-2xl font-bold">VS</div>

        <div className="text-center">
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 ring-2 ring-yellow-400">
            <img
              src={char2Data.image || "/placeholder.svg"}
              alt={char2Data.name}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-yellow-400 font-semibold">{char2Data.name}</p>
          <p className="text-sm text-gray-400">{char2Status}</p>
        </div>
      </div>

      {/* Loading State */}
      {isGeneratingTopics && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-yellow-400">Generating debate topics...</p>
        </div>
      )}

      {/* Error State */}
      {topicsError && (
        <div className="bg-red-900 text-red-100 p-4 rounded-lg mb-4">
          <p className="font-bold">Error generating topics:</p>
          <p>{topicsError}</p>
        </div>
      )}

      {/* Topics Grid */}
      {!isGeneratingTopics && topics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic, index) => {
            const colors = [
              "bg-purple-700 hover:bg-purple-600",
              "bg-blue-700 hover:bg-blue-600",
              "bg-green-700 hover:bg-green-600",
              "bg-red-700 hover:bg-red-600",
              "bg-pink-700 hover:bg-pink-600",
              "bg-orange-700 hover:bg-orange-600",
            ]
            const colorClass = colors[index % colors.length]

            return (
              <button
                key={topic.id || index}
                onClick={() => handleTopicSelection(topic)}
                className={`${colorClass} text-white p-6 rounded-lg transition-colors duration-300 text-left`}
              >
                <h3 className="font-bold mb-2 text-lg uppercase tracking-wide">{topic.title}</h3>
                <p className="text-sm text-gray-200">{topic.description}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-2 bg-gray-700 rounded text-xs text-gray-300">
          <p>
            Topics: {topics.length}, Generating: {isGeneratingTopics ? "true" : "false"}
          </p>
          <p>
            Characters: {char1Data.name} vs {char2Data.name}
          </p>
        </div>
      )}
    </div>
  )
}

export default EmbeddedTopicSelector
export { EmbeddedTopicSelector }
