"use client"

import { useState, useEffect } from "react"

// Static debate topics as fallback
const staticDebateTopics = [
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
  {
    id: "art-purpose",
    title: "Purpose of Art",
    description: "The role of artistic expression in society",
    category: "arts",
  },
  {
    id: "education-methods",
    title: "Education Methods",
    description: "How to best educate future generations",
    category: "education",
  },
  {
    id: "historical-legacy",
    title: "Historical Legacy",
    description: "How history shapes our present and future",
    category: "history",
  },
]

export function TopicSelector({ isOpen, onClose, onSelectTopic, character1, character2 }) {
  const [topics, setTopics] = useState(staticDebateTopics)
  const [isLoading, setIsLoading] = useState(false)
  const [customTopic, setCustomTopic] = useState("")
  const [error, setError] = useState(null)

  // Load character-specific topics when the component mounts or characters change
  useEffect(() => {
    if (!isOpen) return

    const isBrowser = typeof window !== "undefined"
    if (!isBrowser) return

    // Check if we already have topics for this character pair in localStorage
    const topicKey = `${character1}_${character2}_topics`
    const storedTopics = localStorage.getItem(topicKey)

    if (storedTopics) {
      try {
        const parsedTopics = JSON.parse(storedTopics)
        setTopics(parsedTopics)
        return
      } catch (e) {
        console.error("Error parsing stored topics:", e)
      }
    }

    // If no stored topics, try to fetch from API
    async function fetchTopics() {
      setIsLoading(true)
      setError(null)

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

        if (!response.ok) {
          throw new Error("Failed to fetch topics")
        }

        const data = await response.json()

        if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
          setTopics(data.topics)
          // Store in localStorage for future use
          localStorage.setItem(topicKey, JSON.stringify(data.topics))
        }
      } catch (error) {
        console.error("Error fetching topics:", error)
        setError("Failed to load custom topics. Using default topics instead.")
        // Fall back to static topics (already set as default)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopics()
  }, [character1, character2, isOpen])

  if (!isOpen) return null

  // Helper function to get category color
  function getCategoryColor(category) {
    switch (category) {
      case "science":
        return "bg-blue-900 text-blue-300"
      case "philosophy":
        return "bg-purple-900 text-purple-300"
      case "politics":
        return "bg-red-900 text-red-300"
      case "arts":
        return "bg-yellow-900 text-yellow-300"
      case "technology":
        return "bg-green-900 text-green-300"
      case "history":
        return "bg-orange-900 text-orange-300"
      case "education":
        return "bg-teal-900 text-teal-300"
      default:
        return "bg-gray-700 text-gray-300"
    }
  }

  // Helper function to get category icon
  function getCategoryIcon(category) {
    // Simple SVG icons
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
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-yellow-400">Select a Debate Topic</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
            <p>Loading topics...</p>
          </div>
        ) : (
          <>
            {error && <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded-md text-sm">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((topic, index) => (
                <div
                  key={topic.id || index}
                  className="border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    onSelectTopic(topic.title)
                    onClose()
                  }}
                >
                  <div className="flex items-start">
                    <div className={`p-2 rounded-full mr-3 ${getCategoryColor(topic.category)}`}>
                      {getCategoryIcon(topic.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{topic.title}</h3>
                      <p className="text-sm text-gray-300">{topic.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 border-t border-gray-700 pt-4">
          <h3 className="font-semibold mb-2">Or enter your own topic:</h3>
          <div className="flex gap-2">
            <input
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Enter a debate topic..."
              className="flex-1 p-2 rounded border bg-gray-700 text-white border-gray-600 placeholder-gray-400"
            />
            <button
              onClick={() => {
                if (customTopic.trim()) {
                  onSelectTopic(customTopic.trim())
                  onClose()
                }
              }}
              disabled={!customTopic.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-600 disabled:text-gray-400"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
