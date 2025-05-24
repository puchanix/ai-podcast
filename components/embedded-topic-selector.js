"use client"

import { useState } from "react"

const EmbeddedTopicSelector = ({ topics, onSelectTopic, character1, character2 }) => {
  const [customTopic, setCustomTopic] = useState("")

  const handleTopicSelect = (topic) => {
    console.log("=== TOPIC SELECTION DEBUG ===")
    console.log("handleTopicSelect called with:", topic)
    console.log("onSelectTopic function:", onSelectTopic)
    console.log("typeof onSelectTopic:", typeof onSelectTopic)
    console.log("character1:", character1)
    console.log("character2:", character2)

    if (typeof onSelectTopic === "function") {
      console.log("Calling onSelectTopic with topic:", topic)
      onSelectTopic(topic)
      console.log("onSelectTopic called successfully")
    } else {
      console.error("onSelectTopic is not a function!")
    }
    console.log("=== END TOPIC SELECTION DEBUG ===")
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    console.log("Custom topic form submitted:", customTopic)
    if (customTopic.trim()) {
      console.log("Calling handleTopicSelect with custom topic:", customTopic.trim())
      handleTopicSelect(customTopic.trim())
      setCustomTopic("")
    }
  }

  return (
    <div>
      <h3>Choose a Topic:</h3>
      <div>
        {topics &&
          topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => {
                console.log("Topic button clicked:", topic.title)
                handleTopicSelect(topic.title)
              }}
            >
              {topic.title}
            </button>
          ))}
      </div>
      <form onSubmit={handleCustomSubmit}>
        <input
          type="text"
          placeholder="Enter custom topic"
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
        />
        <button type="submit">Submit Custom Topic</button>
      </form>
    </div>
  )
}

export default EmbeddedTopicSelector
