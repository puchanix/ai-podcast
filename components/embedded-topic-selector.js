"use client"

import { useState, useEffect } from "react"

export default function EmbeddedTopicSelector({ onSelectTopic, character1, character2, onCharactersUpdate }) {
  const [topics, setTopics] = useState([
    "Artificial Intelligence",
    "Climate Change",
    "Space Exploration",
    "Quantum Computing",
    "Renewable Energy",
    "Genetic Engineering",
    "Cybersecurity",
    "Virtual Reality",
    "Blockchain Technology",
    "Mental Health Awareness",
  ])

  const [selectedTopic, setSelectedTopic] = useState(null)
  const [selectedCharacters, setSelectedCharacters] = useState([])

  useEffect(() => {
    if (character1) {
      setSelectedCharacters((prev) => {
        if (!prev.includes(character1)) {
          return [...prev, character1]
        }
        return prev
      })
    }
  }, [character1])

  useEffect(() => {
    if (character2) {
      setSelectedCharacters((prev) => {
        if (!prev.includes(character2)) {
          return [...prev, character2]
        }
        return prev
      })
    }
  }, [character2])

  // Update parent component when characters change
  useEffect(() => {
    if (selectedCharacters.length === 2 && onCharactersUpdate) {
      console.log("🔍 Notifying parent of character selection:", selectedCharacters)
      onCharactersUpdate(selectedCharacters[0], selectedCharacters[1])
    }
  }, [selectedCharacters, onCharactersUpdate])

  const handleTopicSelect = (topic) => {
    console.log("🔍 EmbeddedTopicSelector - handleTopicSelect called")
    console.log("🔍 Topic:", topic)
    console.log("🔍 Character1 prop:", character1)
    console.log("🔍 Character2 prop:", character2)
    console.log("🔍 Selected characters:", selectedCharacters)

    if (selectedCharacters.length === 2) {
      console.log("🔍 Calling onSelectTopic with:", topic)
      onSelectTopic(topic)
    } else {
      console.log("🔍 Not enough characters selected:", selectedCharacters.length)
    }
  }

  return (
    <div>
      <h3>Select a Topic:</h3>
      <ul>
        {topics.map((topic, index) => (
          <li key={index}>
            <button onClick={() => handleTopicSelect(topic)}>{topic}</button>
          </li>
        ))}
      </ul>
      {selectedTopic && <p>Selected Topic: {selectedTopic}</p>}
    </div>
  )
}
