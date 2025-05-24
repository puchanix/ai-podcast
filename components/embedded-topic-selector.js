"use client"

import { useState, useEffect } from "react"

const EmbeddedTopicSelector = ({ onSelectTopic, character1, character2 }) => {
  const [customTopic, setCustomTopic] = useState("")
  const [characterSpecificTopics, setCharacterSpecificTopics] = useState([])
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false)

  // Static fallback topics
  const staticTopics = [
    {
      id: "art-vs-science",
      title: "Art vs Science",
      description: "The relationship between artistic expression and scientific discovery",
    },
    {
      id: "creativity-innovation",
      title: "Creativity & Innovation",
      description: "The nature of creative thinking and innovation",
    },
  ]

  // Generate character-specific topics
  useEffect(() => {
    if (character1 && character2) {
      generateTopics()
    }
  }, [character1, character2])

  const generateTopics = async () => {
    setIsGeneratingTopics(true)
    try {
      const response = await fetch("/api/generate-character-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character1,
          character2,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCharacterSpecificTopics(data.topics.slice(0, 2))
      } else {
        setCharacterSpecificTopics(staticTopics)
      }
    } catch (error) {
      console.error("Error generating topics:", error)
      setCharacterSpecificTopics(staticTopics)
    } finally {
      setIsGeneratingTopics(false)
    }
  }

  const handleTopicSelect = (topic) => {
    console.log("Topic selected:", topic)
    if (typeof onSelectTopic === "function") {
      onSelectTopic(topic)
    }
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    if (customTopic.trim()) {
      handleTopicSelect(customTopic.trim())
      setCustomTopic("")
    }
  }

  const topicsToShow = characterSpecificTopics.length > 0 ? characterSpecificTopics : staticTopics

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-yellow-400 mb-4">Choose a Topic:</h3>

      {/* Suggested Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {isGeneratingTopics ? (
          <div className="col-span-2 text-center py-8">
            <div className="inline-block animate-spin h-6 w-6 border-2 border-yellow-500 border-t-transparent rounded-full mb-2"></div>
            <p className="text-yellow-400">Generating personalized topics...</p>
          </div>
        ) : (
          topicsToShow.map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleTopicSelect(topic.title)}
              className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-lg text-left transition-colors border-2 border-transparent hover:border-yellow-400"
            >
              <h4 className="font-semibold text-yellow-400 mb-2">{topic.title}</h4>
              <p className="text-sm text-gray-300">{topic.description}</p>
            </button>
          ))
        )}
      </div>

      {/* Custom Topic Input */}
      <div className="border-t border-gray-600 pt-4">
        <h4 className="text-lg font-medium text-yellow-400 mb-3">Or ask your own question:</h4>
        <form onSubmit={handleCustomSubmit} className="flex gap-3">
          <input
            type="text"
            placeholder="Enter your custom debate topic..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!customTopic.trim()}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Start Debate
          </button>
        </form>
      </div>
    </div>
  )
}

export { EmbeddedTopicSelector }
export default EmbeddedTopicSelector
