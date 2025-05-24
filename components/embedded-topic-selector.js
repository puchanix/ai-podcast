"use client"

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
  const handleTopicSelection = (topic) => {
    if (onSelectTopic) {
      onSelectTopic(topic)
    }
  }

  // Convert character IDs to persona objects if needed
  const getPersonaObject = (character) => {
    if (typeof character === "string") {
      // If it's a string ID, we need to get it from personas
      // For now, return a default object
      return {
        name: character,
        image: "/placeholder.svg",
      }
    }
    return character || { name: "Unknown", image: "/placeholder.svg" }
  }

  const char1 = getPersonaObject(character1)
  const char2 = getPersonaObject(character2)

  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-8">
      <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">Select a Debate Topic</h2>

      <div className="flex justify-center items-center mb-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2">
            <img
              src={char1.image || "/placeholder.svg"}
              alt={char1.name || "Character 1"}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-yellow-400 font-semibold">{char1.name || "Character 1"}</p>
          <p className="text-sm text-gray-400">{char1Status}</p>
        </div>

        <div className="mx-8 text-yellow-400 text-2xl font-bold">VS</div>

        <div className="text-center">
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2">
            <img
              src={char2.image || "/placeholder.svg"}
              alt={char2.name || "Character 2"}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-yellow-400 font-semibold">{char2.name || "Character 2"}</p>
          <p className="text-sm text-gray-400">{char2Status}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => handleTopicSelection("The Nature of Reality")}
          className="bg-purple-700 hover:bg-purple-600 text-white p-4 rounded-lg transition-colors duration-300"
        >
          <h3 className="font-bold mb-2">The Nature of Reality</h3>
          <p className="text-sm text-gray-300">What is real? How do we know what exists?</p>
        </button>

        <button
          onClick={() => handleTopicSelection("Art vs Science")}
          className="bg-blue-700 hover:bg-blue-600 text-white p-4 rounded-lg transition-colors duration-300"
        >
          <h3 className="font-bold mb-2">Art vs Science</h3>
          <p className="text-sm text-gray-300">Which better reveals truth about the world?</p>
        </button>

        <button
          onClick={() => handleTopicSelection("Individual vs Society")}
          className="bg-green-700 hover:bg-green-600 text-white p-4 rounded-lg transition-colors duration-300"
        >
          <h3 className="font-bold mb-2">Individual vs Society</h3>
          <p className="text-sm text-gray-300">Should personal freedom or collective good take priority?</p>
        </button>

        <button
          onClick={() => handleTopicSelection("Progress vs Tradition")}
          className="bg-red-700 hover:bg-red-600 text-white p-4 rounded-lg transition-colors duration-300"
        >
          <h3 className="font-bold mb-2">Progress vs Tradition</h3>
          <p className="text-sm text-gray-300">Is change always good, or should we preserve the past?</p>
        </button>

        <button
          onClick={() => handleTopicSelection("Love and Human Connection")}
          className="bg-pink-700 hover:bg-pink-600 text-white p-4 rounded-lg transition-colors duration-300"
        >
          <h3 className="font-bold mb-2">Love and Human Connection</h3>
          <p className="text-sm text-gray-300">What role should emotion play in human decisions?</p>
        </button>

        <button
          onClick={() => handleTopicSelection("Power and Leadership")}
          className="bg-orange-700 hover:bg-orange-600 text-white p-4 rounded-lg transition-colors duration-300"
        >
          <h3 className="font-bold mb-2">Power and Leadership</h3>
          <p className="text-sm text-gray-300">How should societies be governed and by whom?</p>
        </button>
      </div>
    </div>
  )
}

export default EmbeddedTopicSelector
export { EmbeddedTopicSelector }
