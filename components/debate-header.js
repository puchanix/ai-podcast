"use client"

import { personas } from "../lib/personas"
import { useEffect, useState } from "react"

export function DebateHeader({
  character1,
  character2,
  currentSpeaker,
  isPlaying,
  isLoadingAudio,
  isPreparing,
  isIntroPlaying,
  debateMessages,
  currentTopic,
  speakerStatus,
  isAutoplaying,
  isDebating,
  onToggleAutoplay,
  onCharacter1Change,
  onCharacter2Change,
  onFinishDebate,
  onDownloadTranscript,
}) {
  // Get character objects
  const char1 = personas[character1]
  const char2 = personas[character2]

  // Track previous speaker to prevent blank state
  const [displayedSpeaker, setDisplayedSpeaker] = useState(currentSpeaker)

  // Track when we're transitioning between speakers
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Update displayed speaker with a transition animation
  useEffect(() => {
    if (currentSpeaker && displayedSpeaker !== currentSpeaker) {
      // Start transition animation
      setIsTransitioning(true)

      // After a short delay, update the displayed speaker
      const transitionTimer = setTimeout(() => {
        setDisplayedSpeaker(currentSpeaker)

        // End transition after the speaker has changed
        setTimeout(() => {
          setIsTransitioning(false)
        }, 300)
      }, 300)

      return () => clearTimeout(transitionTimer)
    }
  }, [currentSpeaker, displayedSpeaker])

  // Get the current speaker's image and status
  const getCurrentSpeakerDisplay = () => {
    if (!displayedSpeaker) return null

    const speaker = displayedSpeaker === character1 ? char1 : char2
    const isChar1 = displayedSpeaker === character1

    return {
      type: "speaker",
      speaker,
      isChar1,
      borderColor: isChar1 ? "border-blue-500" : "border-red-500",
    }
  }

  const speakerDisplay = getCurrentSpeakerDisplay()

  // Only show speaker display if there's actually a speaker
  const shouldShowSpeakerDisplay = Boolean(speakerDisplay) && Boolean(displayedSpeaker)

  // Determine the actual speaker status
  const actualSpeakerStatus = isLoadingAudio ? "thinking" : isPreparing ? "preparing" : isPlaying ? "speaking" : null

  return (
    <div className="mb-8 bg-gray-800 p-6 rounded-lg shadow-lg" style={{ minHeight: "200px" }}>
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-yellow-400">Historical Debates</h1>

        {/* Display current topic during debate */}
        {currentTopic && (isPlaying || isLoadingAudio || isPreparing || isDebating) && (
          <div className="mt-2 md:mt-0 text-center md:text-right">
            <h2 className="text-xl font-semibold text-yellow-400">Topic: {currentTopic}</h2>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center md:justify-between">
        {/* Character Selection - centered when not debating */}
        <div className={`flex flex-col md:flex-row items-center gap-6 mb-4 md:mb-0 ${isDebating ? "" : "md:mx-auto"}`}>
          {/* Character 1 */}
          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 rounded-full overflow-hidden mb-2 border-4 ${
                displayedSpeaker === character1 ? "border-blue-500 animate-pulse" : "border-blue-800"
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
              className="w-[180px] p-1 text-sm rounded border bg-gray-800 text-white border-gray-600"
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
                displayedSpeaker === character2 ? "border-red-500 animate-pulse" : "border-red-800"
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
              className="w-[180px] p-1 text-sm rounded border bg-gray-800 text-white border-gray-600"
            >
              {Object.keys(personas).map((id) => (
                <option key={id} value={id}>
                  {personas[id].name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Speaker Display - Only show when there's a speaker */}
        {shouldShowSpeakerDisplay && (
          <div className="flex flex-col items-center" style={{ minHeight: "180px", width: "250px" }}>
            {speakerDisplay ? (
              <div className="flex flex-col items-center">
                <div className="relative">
                  {/* Microphone passing animation */}
                  {isTransitioning && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <div className="w-10 h-10 text-yellow-400 animate-bounce">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                          <line x1="12" y1="19" x2="12" y2="22"></line>
                        </svg>
                      </div>
                    </div>
                  )}

                  <div
                    className={`w-32 h-32 rounded-full overflow-hidden border-4 ${speakerDisplay.borderColor} p-2 mb-4 ${
                      isTransitioning ? "opacity-50" : "opacity-100"
                    } transition-opacity duration-300`}
                  >
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
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-yellow-400 mb-1">
                    {actualSpeakerStatus === "thinking"
                      ? `${speakerDisplay.speaker?.name} is thinking...`
                      : actualSpeakerStatus === "preparing"
                        ? `${speakerDisplay.speaker?.name} is preparing...`
                        : actualSpeakerStatus === "speaking"
                          ? `${speakerDisplay.speaker?.name} is speaking...`
                          : speakerDisplay.speaker?.name}
                  </h3>
                  {(() => {
                    // Find the most recent message for the current speaker
                    const speakerMessages = debateMessages.filter((m) => m.character === displayedSpeaker)
                    const latestMessage = speakerMessages[speakerMessages.length - 1]
                    return (
                      latestMessage?.responseType && (
                        <p className="text-sm text-gray-400 mb-2">{latestMessage.responseType}</p>
                      )
                    )
                  })()}
                  {/* Fixed height container for sound wave animation */}
                  <div className="h-6 flex justify-center items-center">
                    {isPlaying && (
                      <div className="flex space-x-1">
                        <div className="w-1 h-4 bg-blue-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]"></div>
                        <div className="w-1 h-6 bg-yellow-500 rounded-full animate-[soundwave_0.7s_ease-in-out_infinite_0.1s]"></div>
                        <div className="w-1 h-3 bg-green-500 rounded-full animate-[soundwave_0.4s_ease-in-out_infinite_0.2s]"></div>
                        <div className="w-1 h-5 bg-red-500 rounded-full animate-[soundwave_0.6s_ease-in-out_infinite_0.3s]"></div>
                        <div className="w-1 h-2 bg-purple-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.4s]"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pause/Resume button - always visible during intro or debate */}
                <button
                  onClick={onToggleAutoplay}
                  className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-full font-bold"
                >
                  {isAutoplaying ? "⏸️ Pause" : "▶️ Resume"}
                </button>

                {/* Finish Debate button */}
                {isDebating && (
                  <button
                    onClick={onFinishDebate}
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold"
                  >
                    Finish Debate
                  </button>
                )}

                {/* Download Transcript button */}
                {isDebating && (
                  <button
                    onClick={onDownloadTranscript}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full font-bold"
                  >
                    Download Transcript
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
