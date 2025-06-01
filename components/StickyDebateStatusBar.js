"use client"

export default function StickyDebateStatusBar({
  isDebating,
  debateTopic,
  selectedCharacters,
  currentSpeaker,
  personas,
  debateRound,
  isDebatePaused,
  pauseDebateAudio,
  resumeDebateAudio,
  endDebate,
}) {
  if (!isDebating || !debateTopic || selectedCharacters.length !== 2) return null

  // Get character data
  const character1 = personas[selectedCharacters[0]]
  const character2 = personas[selectedCharacters[1]]
  const currentSpeakerData = personas[currentSpeaker]

  // Helper function to get round display text
  const getRoundDisplayText = () => {
    if (debateRound === 1) return "Opening Statements"
    if (debateRound === 4) return "Closing Remarks"
    return `Round ${debateRound} of 4`
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        {/* Mobile Layout */}
        <div className="block md:hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="flex -space-x-1">
                <img
                  src={character1?.image || "/placeholder.svg"}
                  alt={character1?.name}
                  className={`w-8 h-8 rounded-full border-2 ${
                    currentSpeaker === selectedCharacters[0] ? "border-green-400" : "border-gray-500"
                  }`}
                />
                <img
                  src={character2?.image || "/placeholder.svg"}
                  alt={character2?.name}
                  className={`w-8 h-8 rounded-full border-2 ${
                    currentSpeaker === selectedCharacters[1] ? "border-green-400" : "border-gray-500"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-yellow-400 font-semibold truncate">
                  {debateTopic.length > 30 ? debateTopic.substring(0, 30) + "..." : debateTopic}
                </p>
                <p className="text-xs text-gray-300">
                  {currentSpeakerData?.name} • {getRoundDisplayText()}
                </p>
              </div>
            </div>
            <button onClick={endDebate} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs">
              End
            </button>
          </div>
          <div className="flex justify-center space-x-2">
            {!isDebatePaused ? (
              <button
                onClick={pauseDebateAudio}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-1 rounded text-xs flex items-center space-x-1"
              >
                <span>⏸</span>
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={resumeDebateAudio}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded text-xs flex items-center space-x-1"
              >
                <span>▶</span>
                <span>Resume</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img
                src={character1?.image || "/placeholder.svg"}
                alt={character1?.name}
                className={`w-10 h-10 rounded-full border-2 ${
                  currentSpeaker === selectedCharacters[0] ? "border-green-400" : "border-gray-500"
                }`}
              />
              <span className="text-sm text-gray-300">vs</span>
              <img
                src={character2?.image || "/placeholder.svg"}
                alt={character2?.name}
                className={`w-10 h-10 rounded-full border-2 ${
                  currentSpeaker === selectedCharacters[1] ? "border-green-400" : "border-gray-500"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-yellow-400">{debateTopic}</p>
              <p className="text-xs text-gray-300">
                {currentSpeakerData?.name} speaking • {getRoundDisplayText()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!isDebatePaused ? (
              <button
                onClick={pauseDebateAudio}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm flex items-center space-x-2"
              >
                <span>⏸</span>
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={resumeDebateAudio}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm flex items-center space-x-2"
              >
                <span>▶</span>
                <span>Resume</span>
              </button>
            )}
            <button onClick={endDebate} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm">
              End Debate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
