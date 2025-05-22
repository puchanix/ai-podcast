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

// Character-specific topics for da Vinci and Socrates
const daVinciSocratesTopics = [
  {
    id: "knowledge-truth",
    title: "Knowledge vs. Truth",
    description: "Is knowledge the same as truth, and how do we discover either?",
    category: "philosophy",
  },
  {
    id: "art-science-relationship",
    title: "Art and Science",
    description: "The relationship between artistic expression and scientific inquiry",
    category: "arts",
  },
  {
    id: "human-potential",
    title: "Human Potential",
    description: "The limits and possibilities of human achievement and understanding",
    category: "philosophy",
  },
  {
    id: "ideal-society",
    title: "Ideal Society",
    description: "What constitutes the perfect social and political structure?",
    category: "politics",
  },
  {
    id: "beauty-truth",
    title: "Beauty and Truth",
    description: "Is beauty objective or subjective, and how does it relate to truth?",
    category: "arts",
  },
  {
    id: "innovation-tradition",
    title: "Innovation vs. Tradition",
    description: "The value of new ideas versus established wisdom",
    category: "philosophy",
  },
]

export function EmbeddedTopicSelector({ onSelectTopic, character1, character2 }) {
  const [topics, setTopics] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [customTopic, setCustomTopic] = useState("")
  const [error, setError] = useState(null)

  // Load character-specific topics when the component mounts or characters change
  useEffect(() => {
    const isBrowser = typeof window !== "undefined"
    if (!isBrowser) return

    // Check if we already have topics for this character pair in localStorage
    const topicKey = `${character1}_${character2}_topics`
    const storedTopics = localStorage.getItem(topicKey)

    if (storedTopics) {
      try {
        const parsedTopics = JSON.parse(storedTopics)
        setTopics(parsedTopics)
        setIsLoading(false)
        return
      } catch (e) {
        console.error("Error parsing stored topics:", e)
      }
    }

    // Special case for da Vinci and Socrates
    if (
      (character1 === "daVinci" && character2 === "socrates") ||
      (character1 === "socrates" && character2 === "daVinci")
    ) {
      setTopics(daVinciSocratesTopics)
      setIsLoading(false)
      try {
        localStorage.setItem(topicKey, JSON.stringify(daVinciSocratesTopics))
      } catch (e) {
        console.error("Error storing topics in localStorage:", e)
      }
      return
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
        } else {
          // If no topics returned, use static topics
          setTopics(staticDebateTopics)
        }
      } catch (error) {
        console.error("Error fetching topics:", error)
        setError("Failed to load custom topics. Using default topics instead.")
        // Fall back to static topics
        setTopics(staticDebateTopics)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopics()
  }, [character1, character2])

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
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
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
            <path d="M3 22v-6h6"></path>
            <path d="M3 16l6-6-6-6"></path>
            <path d="M21 22v-6h-6"></path>
            <path d="M21 16l-6-6 6-6"></path>
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
    <div className="bg-gray-800 rounded-lg p-6 w-full">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-yellow-400 mb-2">Select a Debate Topic</h2>
        <p className="text-gray-400">Choose a topic for these historical figures to debate</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
          <p>Loading topics...</p>
        </div>
      ) : (
        <>
          {error && <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded-md text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {topics.map((topic, index) => (
              <div
                key={topic.id || index}
                className="border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => onSelectTopic(topic.title)}
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

      <div className="mt-4 border-t border-gray-700 pt-4">
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
  )
}
