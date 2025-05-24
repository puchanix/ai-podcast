"use client"
import PropTypes from "prop-types"

export default function EmbeddedTopicSelector({
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
  const handleTopicSelection = (topic) => {
    if (onSelectTopic) {
      onSelectTopic(topic)
    }
  }

  return (
    <div>
      <h2>Select a Topic</h2>
      <p>Character 1: {character1 || "Character 1"}</p>
      <p>Character 2: {character2 || "Character 2"}</p>
      <p>Is Debating: {isDebating ? "Yes" : "No"}</p>
      <p>Current Speaker: {currentSpeaker || "None"}</p>
      <p>Is Playing: {isPlaying ? "Yes" : "No"}</p>
      <p>Is Loading Audio: {isLoadingAudio ? "Yes" : "No"}</p>
      <p>Thinking Message: {thinkingMessage || "No message"}</p>
      <p>Character 1 Status: {char1Status || "Ready"}</p>
      <p>Character 2 Status: {char2Status || "Ready"}</p>

      <button onClick={() => handleTopicSelection("Topic 1")}>Topic 1</button>
      <button onClick={() => handleTopicSelection("Topic 2")}>Topic 2</button>
      <button onClick={() => handleTopicSelection("Topic 3")}>Topic 3</button>
    </div>
  )
}

EmbeddedTopicSelector.propTypes = {
  onSelectTopic: PropTypes.func,
  character1: PropTypes.string,
  character2: PropTypes.string,
  isDebating: PropTypes.bool,
  currentSpeaker: PropTypes.string,
  isPlaying: PropTypes.bool,
  isLoadingAudio: PropTypes.bool,
  thinkingMessage: PropTypes.string,
  char1Status: PropTypes.string,
  char2Status: PropTypes.string,
}

EmbeddedTopicSelector.defaultProps = {
  isDebating: false,
  isPlaying: false,
  isLoadingAudio: false,
  thinkingMessage: "",
  char1Status: "Ready",
  char2Status: "Ready",
}
