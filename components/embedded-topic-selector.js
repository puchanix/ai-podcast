"use client"

import { useState, useEffect } from "react"
import { personas } from "../lib/personas"

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
]

// Character-specific topics for different combinations
const characterSpecificTopics = {
  // da Vinci and Socrates
  daVinci_socrates: [
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
  ],
  // da Vinci and Frida
  daVinci_frida: [
    {
      id: "artistic-expression",
      title: "Personal vs. Universal Art",
      description: "Is art more powerful when it's personal or when it's universal?",
      category: "arts",
    },
    {
      id: "innovation-tradition",
      title: "Innovation vs. Tradition",
      description: "The balance between breaking new ground and respecting artistic traditions",
      category: "arts",
    },
  ],
  // da Vinci and Shakespeare
  daVinci_shakespeare: [
    {
      id: "creative-genius",
      title: "Nature of Creative Genius",
      description: "What constitutes genius in art and literature?",
      category: "arts",
    },
    {
      id: "human-condition",
      title: "Portraying the Human Condition",
      description: "Visual art versus written word in capturing humanity",
      category: "arts",
    },
  ],
  // da Vinci and Mozart
  daVinci_mozart: [
    {
      id: "artistic-disciplines",
      title: "Visual Art vs. Music",
      description: "The different ways visual art and music affect human emotion",
      category: "arts",
    },
    {
      id: "patronage-freedom",
      title: "Patronage and Artistic Freedom",
      description: "How financial support affects creative expression",
      category: "arts",
    },
  ],
  // Socrates and Frida
  socrates_frida: [
    {
      id: "self-knowledge",
      title: "Self-Knowledge Through Art",
      description: "Can artistic expression lead to philosophical understanding?",
      category: "philosophy",
    },
    {
      id: "suffering-wisdom",
      title: "Suffering and Wisdom",
      description: "The relationship between personal pain and deeper understanding",
      category: "philosophy",
    },
  ],
  // Socrates and Shakespeare
  socrates_shakespeare: [
    {
      id: "moral-questions",
      title: "Exploring Moral Questions",
      description: "Philosophy versus drama as tools for ethical inquiry",
      category: "philosophy",
    },
    {
      id: "human-nature-understanding",
      title: "Understanding Human Nature",
      description: "Dialogue, questioning, and character development as means to truth",
      category: "philosophy",
    },
  ],
  // Socrates and Mozart
  socrates_mozart: [
    {
      id: "beauty-truth",
      title: "Beauty and Truth",
      description: "The relationship between aesthetic beauty and philosophical truth",
      category: "philosophy",
    },
    {
      id: "structure-freedom",
      title: "Structure vs. Freedom",
      description: "The balance between formal rules and creative expression",
      category: "arts",
    },
  ],
  // Frida and Shakespeare
  frida_shakespeare: [
    {
      id: "self-expression",
      title: "Self-Expression and Identity",
      description: "Personal identity in art and literature across different eras",
      category: "arts",
    },
    {
      id: "political-art",
      title: "Art as Political Statement",
      description: "How creative works can challenge or reinforce social norms",
      category: "politics",
    },
  ],
  // Frida and Mozart
  frida_mozart: [
    {
      id: "emotion-expression",
      title: "Emotional Expression",
      description: "Visual versus musical approaches to conveying human emotion",
      category: "arts",
    },
    {
      id: "tradition-rebellion",
      title: "Tradition vs. Rebellion",
      description: "Breaking artistic conventions across different time periods",
      category: "arts",
    },
  ],
  // Shakespeare and Mozart
  shakespeare_mozart: [
    {
      id: "structure-creativity",
      title: "Structure and Creativity",
      description: "How formal structures enable or constrain artistic expression",
      category: "arts",
    },
    {
      id: "entertainment-enlightenment",
      title: "Entertainment vs. Enlightenment",
      description: "The balance between pleasing audiences and elevating them",
      category: "arts",
    },
  ],
}

export function EmbeddedTopicSelector({ onSelectTopic, character1, character2 }) {
  const [topics, setTopics] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState(null)
  const [transcript, setTranscript] = useState("")

  // Load character-specific topics when the component mounts or characters change
  useEffect(() => {
    const isBrowser = typeof window !== "undefined"
    if (!isBrowser) return

    setIsLoading(true)

    // Create a key for the character pair (sorted alphabetically to ensure consistency)
    const chars = [character1, character2].sort()
    const pairKey = `${chars[0]}_${chars[1]}`

    // Check if we have predefined topics for this character pair
    if (characterSpecificTopics[pairKey]) {
      console.log(`Using predefined topics for ${pairKey}`)
      setTopics(characterSpecificTopics[pairKey])
      setIsLoading(false)
      return
    }

    // Check if we already have topics for this character pair in localStorage
    const topicKey = `${character1}_${character2}_topics`
    const storedTopics = localStorage.getItem(topicKey)

    if (storedTopics) {
      try {
        const parsedTopics = JSON.parse(storedTopics)
        // Limit to 2 topics
        setTopics(parsedTopics.slice(0, 2))
        setIsLoading(false)
        return
      } catch (e) {
        console.error("Error parsing stored topics:", e)
      }
    }

    // If no stored topics, try to fetch from API
    async function fetchTopics() {
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
          // Limit to only 2 topics
          const limitedTopics = data.topics.slice(0, 2)
          setTopics(limitedTopics)
          // Store in localStorage for future use
          localStorage.setItem(topicKey, JSON.stringify(limitedTopics))
        } else {
          // If no topics returned, generate character-specific fallback topics
          const fallbackTopics = generateFallbackTopics(character1, character2)
          setTopics(fallbackTopics)
          localStorage.setItem(topicKey, JSON.stringify(fallbackTopics))
        }
      } catch (error) {
        console.error("Error fetching topics:", error)
        setError("Failed to load custom topics. Using default topics instead.")
        // Generate character-specific fallback topics
        const fallbackTopics = generateFallbackTopics(character1, character2)
        setTopics(fallbackTopics)
        try {
          localStorage.setItem(topicKey, JSON.stringify(fallbackTopics))
        } catch (e) {
          console.error("Error storing topics in localStorage:", e)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopics()
  }, [character1, character2])

  // Set up speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const speechRecognition = new window.webkitSpeechRecognition()
      speechRecognition.continuous = false
      speechRecognition.interimResults = false
      speechRecognition.lang = "en-US"

      speechRecognition.onstart = () => {
        setIsListening(true)
      }

      speechRecognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript
        setTranscript(speechResult)

        // Auto-submit after a short delay
        setTimeout(() => {
          if (speechResult.trim()) {
            onSelectTopic(speechResult.trim())
          }
        }, 500)
      }

      speechRecognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }

      speechRecognition.onend = () => {
        setIsListening(false)
      }

      setRecognition(speechRecognition)
    }
  }, [onSelectTopic])

  const startListening = () => {
    if (recognition && !isListening) {
      setTranscript("")
      recognition.start()
    }
  }

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop()
    }
  }

  // Add this function to generate fallback topics based on character pair
  function generateFallbackTopics(char1, char2) {
    const persona1 = personas[char1]
    const persona2 = personas[char2]

    if (!persona1 || !persona2) return staticDebateTopics

    // Generate topics based on the characters' backgrounds
    const topics = []

    // Topic 1: Based on their expertise/fields
    let field1 = ""
    let field2 = ""

    // Determine fields based on character
    if (char1 === "daVinci") field1 = "art and science"
    else if (char1 === "socrates") field1 = "philosophy"
    else if (char1 === "frida") field1 = "personal expression in art"
    else if (char1 === "shakespeare") field1 = "literature and drama"
    else if (char1 === "mozart") field1 = "music composition"

    if (char2 === "daVinci") field2 = "art and science"
    else if (char2 === "socrates") field2 = "philosophy"
    else if (char2 === "frida") field2 = "personal expression in art"
    else if (char2 === "shakespeare") field2 = "literature and drama"
    else if (char2 === "mozart") field2 = "music composition"

    topics.push({
      id: `${char1}-${char2}-expertise`,
      title: `${field1} vs ${field2}`,
      description: `Comparing the approaches and philosophies of these historical figures`,
      category: "philosophy",
    })

    // Topic 2: Based on their time periods/cultural contexts
    let era1 = ""
    let era2 = ""

    // Determine eras based on character
    if (char1 === "daVinci") era1 = "Renaissance Italy"
    else if (char1 === "socrates") era1 = "Ancient Greece"
    else if (char1 === "frida") era1 = "20th century Mexico"
    else if (char1 === "shakespeare") era1 = "Elizabethan England"
    else if (char1 === "mozart") era1 = "Classical Europe"

    if (char2 === "daVinci") era2 = "Renaissance Italy"
    else if (char2 === "socrates") era2 = "Ancient Greece"
    else if (char2 === "frida") era2 = "20th century Mexico"
    else if (char2 === "shakespeare") era2 = "Elizabethan England"
    else if (char2 === "mozart") era2 = "Classical Europe"

    topics.push({
      id: `${char1}-${char2}-historical`,
      title: `${era1} vs ${era2}`,
      description: `How different historical contexts shaped these figures' worldviews`,
      category: "history",
    })

    return topics
  }

  // Helper function to get category color
  function getCategoryColor(category) {
    switch (category) {
      case "science":
        return "bg-blue-600/20 border-blue-500/30"
      case "philosophy":
        return "bg-purple-600/20 border-purple-500/30"
      case "politics":
        return "bg-red-600/20 border-red-500/30"
      case "arts":
        return "bg-yellow-600/20 border-yellow-500/30"
      case "technology":
        return "bg-green-600/20 border-green-500/30"
      case "history":
        return "bg-orange-600/20 border-orange-500/30"
      case "education":
        return "bg-teal-600/20 border-teal-500/30"
      default:
        return "bg-gray-600/20 border-gray-500/30"
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
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-400"
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
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-purple-400"
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
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-yellow-400"
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
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-400"
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
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        )
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl p-8 w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Select a Debate Topic</h2>
        <p className="text-gray-300">Choose from these curated topics or speak your own</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-300">Loading topics...</p>
        </div>
      ) : (
        <>
          {error && <div className="mb-6 p-4 bg-red-900/50 text-red-200 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {topics.map((topic, index) => (
              <div
                key={topic.id || index}
                className={`border-2 rounded-xl p-6 cursor-pointer hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 ${getCategoryColor(topic.category)}`}
                onClick={() => onSelectTopic(topic.title)}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">{getCategoryIcon(topic.category)}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg mb-2">{topic.title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{topic.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="border-t border-gray-700 pt-6 flex justify-center">
        <div className="flex flex-col items-center">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 ${
              isListening
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : "bg-yellow-500 hover:bg-yellow-600 text-black"
            }`}
          >
            {isListening ? "Stop Recording" : "Speak Your Own Topic"}
          </button>

          {isListening && (
            <div className="mt-4 text-center text-gray-300">
              <div className="flex justify-center mt-2 mb-2">
                <div className="flex space-x-1">
                  <div className="w-1 h-4 bg-yellow-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]"></div>
                  <div className="w-1 h-6 bg-yellow-400 rounded-full animate-[soundwave_0.7s_ease-in-out_infinite_0.1s]"></div>
                  <div className="w-1 h-3 bg-yellow-500 rounded-full animate-[soundwave_0.4s_ease-in-out_infinite_0.2s]"></div>
                  <div className="w-1 h-5 bg-yellow-400 rounded-full animate-[soundwave_0.6s_ease-in-out_infinite_0.3s]"></div>
                  <div className="w-1 h-2 bg-yellow-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.4s]"></div>
                </div>
              </div>
              <p>Listening...</p>
            </div>
          )}

          {transcript && !isListening && (
            <div className="mt-4 text-center">
              <p className="text-gray-400 italic">"{transcript}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
