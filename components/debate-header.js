"use client"

import { personas } from "../lib/personas"

export function DebateHeader({
  character1,
  character2,
  currentSpeaker,
  isPlaying,
  exchangeCount,
  maxExchanges,
  onCharacter1Change,
  onCharacter2Change,
}) {
  // Get character objects
  const char1 = personas[character1]
  const char2 = personas[character2]

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

        {/* Debate Status */}
        <div className="flex flex-col items-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-yellow-400 mb-2">Debate Progress</h2>
            <div className="mt-2 text-sm text-gray-400">
              Exchange {exchangeCount || 0} of {maxExchanges}
              <div className="w-full bg-gray-700 h-2 rounded-full mt-1">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((exchangeCount || 0) / maxExchanges) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
