"use client"

import { useState, useEffect } from "react"

export default function EmbeddedTopicSelector({
  onSelectTopic,
  character1,
  character2,
  isDebating = false,
  currentSpeaker = null,
  isPlaying = false,
  isLoadingAudio = false,
  thinkingMessage = "",
}) {
  const [topic, setTopic] = useState("")
  const [selectedCharacters, setSelectedCharacters] = useState([])
  const [personas, setPersonas] = useState({
    character1: {
      name: "Character 1",
      image: "https://placehold.co/100",
      description: "Description 1",
    },
    character2: {
      name: "Character 2",
      image: "https://placehold.co/100",
      description: "Description 2",
    },
  })

  useEffect(() => {
    if (character1 && character2) {
      setPersonas({
        character1: {
          name: character1.name,
          image: character1.image,
          description: character1.description,
        },
        character2: {
          name: character2.name,
          image: character2.image,
          description: character2.description,
        },
      })
    }
  }, [character1, character2])

  const handleTopicChange = (event) => {
    setTopic(event.target.value)
  }

  const handleCharacterSelect = (characterKey) => {
    setSelectedCharacters((prevSelected) => {
      if (prevSelected.includes(characterKey)) {
        return prevSelected.filter((key) => key !== characterKey)
      } else {
        return [...prevSelected, characterKey]
      }
    })
  }

  const handleSubmit = () => {
    if (topic && selectedCharacters.length > 0) {
      onSelectTopic({ topic, characters: selectedCharacters })
    } else {
      alert("Please enter a topic and select at least one character.")
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Topic Selector</h1>

      {/* Topic Input */}
      <div className="mb-4">
        <label htmlFor="topic" className="block text-gray-700 text-sm font-bold mb-2">
          Topic:
        </label>
        <input
          type="text"
          id="topic"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Enter topic here"
          value={topic}
          onChange={handleTopicChange}
        />
      </div>

      {/* Character Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        {Object.entries(personas).map(([key, persona]) => {
          const isSelected = selectedCharacters.includes(key)
          const isCurrentSpeaker = currentSpeaker === key
          const isLoadingForThisChar = isLoadingAudio && currentSpeaker === key
          const isPlayingForThisChar = isPlaying && currentSpeaker === key

          // Determine status text
          let statusText = ""
          let statusColor = "text-gray-400"

          if (isDebating) {
            if (isCurrentSpeaker) {
              if (isLoadingForThisChar) {
                statusText = thinkingMessage || "Thinking..."
                statusColor = "text-blue-300"
              } else if (isPlayingForThisChar) {
                statusText = "Speaking..."
                statusColor = "text-yellow-200"
              } else {
                statusText = "Ready"
                statusColor = "text-gray-400"
              }
            } else if (isSelected) {
              statusText = "Waiting turn..."
              statusColor = "text-gray-400"
            }
          } else if (isSelected) {
            statusText = "Selected"
            statusColor = "text-yellow-400"
          }

          return (
            <div
              key={key}
              className={`relative cursor-pointer transition-all duration-300 ${
                isSelected ? "transform scale-105" : "hover:scale-105"
              }`}
              onClick={() => !isDebating && handleCharacterSelect(key)}
            >
              <div
                className={`relative w-24 h-24 mx-auto rounded-full overflow-hidden transition-all duration-300 ${
                  isCurrentSpeaker && isPlayingForThisChar
                    ? "ring-4 ring-yellow-400 ring-opacity-75 shadow-lg shadow-yellow-400/50"
                    : isCurrentSpeaker && isLoadingForThisChar
                      ? "ring-4 ring-blue-400 ring-opacity-75"
                      : isSelected
                        ? "ring-4 ring-yellow-500"
                        : "ring-2 ring-gray-600 hover:ring-gray-500"
                }`}
              >
                <img
                  src={persona.image || "/placeholder.svg"}
                  alt={persona.name}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    isCurrentSpeaker && isPlayingForThisChar
                      ? "scale-110"
                      : isCurrentSpeaker && isLoadingForThisChar
                        ? "opacity-75"
                        : ""
                  }`}
                />

                {/* Loading overlay */}
                {isCurrentSpeaker && isLoadingForThisChar && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {/* Speaking overlay */}
                {isCurrentSpeaker && isPlayingForThisChar && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-400 opacity-10 animate-pulse"></div>
                )}

                {/* Selected indicator */}
                {isSelected && !isDebating && <div className="absolute inset-0 bg-yellow-500 bg-opacity-20"></div>}
              </div>

              {/* Pulsing ring animation when speaking */}
              {isCurrentSpeaker && isPlayingForThisChar && (
                <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-4 border-yellow-400 animate-ping opacity-75"></div>
              )}

              {/* Character name */}
              <p
                className={`text-center text-sm font-medium mt-2 transition-colors duration-300 ${
                  isCurrentSpeaker && isPlayingForThisChar
                    ? "text-yellow-300"
                    : isCurrentSpeaker
                      ? "text-yellow-400"
                      : isSelected
                        ? "text-yellow-400"
                        : "text-gray-300"
                }`}
              >
                {persona.name}
              </p>

              {/* Status text */}
              {statusText && (
                <p className={`text-center text-xs mt-1 transition-colors duration-300 ${statusColor}`}>{statusText}</p>
              )}

              {/* Sound wave animation */}
              {isCurrentSpeaker && isPlayingForThisChar && (
                <div className="flex justify-center mt-2">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-yellow-500 to-orange-400 rounded-full animate-pulse"
                        style={{
                          height: `${6 + (i % 3) * 3}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit Button */}
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        type="button"
        onClick={handleSubmit}
      >
        Start Debate
      </button>
    </div>
  )
}
