"use client"

import { personas } from "../lib/personas"

export function DebateHeader({
  character1,
  character2,
  currentSpeaker,
  isPlaying,
  isLoadingAudio,
  isPreparing,
  debateMessages,
  onCharacter1Change,
  onCharacter2Change,
}) {
  // Get character objects
  const char1 = personas[character1]
  const char2 = personas[character2]

  // Get the current speaker's image and status
  const getCurrentSpeakerDisplay = () => {
    if (!currentSpeaker) return null

    const speaker = currentSpeaker === character1 ? char1 : char2
    const isChar1 = currentSpeaker === character1

    return {
      speaker,
      isChar1,
      borderColor: isChar1 ? "border-blue-500" : "border-red-500",
    }
  }

  const speakerDisplay = getCurrentSpeakerDisplay()

  return (
    <div className="mb-8 bg-gray-800 p-6 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-4 text-yellow-400">Historical Debates</h1>

      <div className="flex flex-col md:flex-row items-center justify-between">
        {/* Character Selection */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-4 md:mb-0">
          {/* Character 1 */}
          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-full overflow-hidden mb-2 border-4 ${
                currentSpeaker === character1 ? "border-blue-500 animate-pulse" : "border-blue-800"
              }`}
            >
              <img
                src={char1?.image || "/placeholder.png"}
                alt={char1?.name || "Character 1"}
                className="w-full h-full object-cover"
              />
            </div>
            <select
              value={character1}
              onChange={(e) => onCharacter1Change(e.target.value)}
              className="w-[150px] p-1 text-sm rounded border bg-gray-800 text-white border-gray-600"
            >
              {Object.keys(personas).map((id) => (
                <option key={id} value={id}>
                  {personas[id].name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xl font-bold text-yellow-400">VS</div>

          {/* Character 2 */}
          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-full overflow-hidden mb-2 border-4 ${
                currentSpeaker === character2 ? "border-red-500 animate-pulse" : "border-red-800"
              }`}
            >
              <img
                src={char2?.image || "/placeholder.png"}
                alt={char2?.name || "Character 2"}
                className="w-full h-full object-cover"
              />
            </div>
            <select
              value={character2}
              onChange={(e) => onCharacter2Change(e.target.value)}
              className="w-[150px] p-1 text-sm rounded border bg-gray-800 text-white border-gray-600"
            >
              {Object.keys(personas).map((id) => (
                <option key={id} value={id}>
                  {personas[id].name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Speaker Display */}
        <div className="flex flex-col items-center">
          {speakerDisplay ? (
            <div className="flex flex-col items-center">
              <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${speakerDisplay.borderColor} p-2`}>
                {isLoadingAudio || isPreparing ? (
                  <div className="relative w-full h-full">
                    <img
                      src={speakerDisplay.speaker?.image || "/placeholder.png"}
                      alt={speakerDisplay.speaker?.name || "Speaker"}
                      className="w-full h-full object-cover rounded-full"
                    />
                    <div className="absolute inset-0 bg-gray-800 opacity-50 flex items-center justify-center rounded-full">
                      <div className="h-8 w-8 text-yellow-400 animate-spin">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 6v6l4 2"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : isPlaying ? (
                  <div className="relative w-full h-full">
                    <img
                      src={speakerDisplay.speaker?.image || "/placeholder.png"}
                      alt={speakerDisplay.speaker?.name || "Speaker"}
                      className="w-full h-full object-cover rounded-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-pulse rounded-full"></div>
                  </div>
                ) : (
                  <img
                    src={speakerDisplay.speaker?.image || "/placeholder.png"}
                    alt={speakerDisplay.speaker?.name || "Speaker"}
                    className="w-full h-full object-cover rounded-full"
                  />
                )}
              </div>
              <div className="mt-2 text-center">
                <h3 className="text-lg font-bold text-yellow-400">
                  {isLoadingAudio || isPreparing
                    ? `${speakerDisplay.speaker?.name} is thinking...`
                    : isPlaying
                      ? `${speakerDisplay.speaker?.name} is speaking...`
                      : speakerDisplay.speaker?.name}
                </h3>
                {(() => {
                  // Find the most recent message for the current speaker
                  const speakerMessages = debateMessages.filter((m) => m.character === currentSpeaker)
                  const latestMessage = speakerMessages[speakerMessages.length - 1]
                  return (
                    latestMessage?.responseType && <p className="text-sm text-gray-400">{latestMessage.responseType}</p>
                  )
                })()}
                {isPlaying && (
                  <div className="flex justify-center mt-2">
                    <div className="flex space-x-1">
                      <div className="w-1 h-4 bg-blue-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]"></div>
                      <div className="w-1 h-6 bg-yellow-500 rounded-full animate-[soundwave_0.7s_ease-in-out_infinite_0.1s]"></div>
                      <div className="w-1 h-3 bg-green-500 rounded-full animate-[soundwave_0.4s_ease-in-out_infinite_0.2s]"></div>
                      <div className="w-1 h-5 bg-red-500 rounded-full animate-[soundwave_0.6s_ease-in-out_infinite_0.3s]"></div>
                      <div className="w-1 h-2 bg-purple-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.4s]"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full border-4 border-gray-600 p-2 flex items-center justify-center bg-gray-800">
                <div className="h-8 w-8 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                </div>
              </div>
              <div className="mt-2 text-center">
                <h3 className="text-lg font-bold text-gray-400">Ready to debate</h3>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
