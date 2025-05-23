"use client"

import { useState, useEffect } from "react"

export function VoiceInput({ onSubmit, buttonText = "Voice Input" }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [recognition, setRecognition] = useState(null)

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      try {
        const speechRecognition = new window.webkitSpeechRecognition()
        speechRecognition.continuous = false
        speechRecognition.interimResults = false
        speechRecognition.lang = "en-US"

        speechRecognition.onstart = () => {
          setIsListening(true)
        }

        speechRecognition.onresult = (event) => {
          try {
            const speechResult = event.results[0][0].transcript
            setTranscript(speechResult)

            // Auto-submit after a short delay
            setTimeout(() => {
              if (speechResult && speechResult.trim()) {
                onSubmit(speechResult.trim())
              }
              setIsListening(false)
            }, 500)
          } catch (err) {
            console.error("Error processing speech result:", err)
            setIsListening(false)
          }
        }

        speechRecognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
        }

        speechRecognition.onend = () => {
          setIsListening(false)
        }

        setRecognition(speechRecognition)
      } catch (err) {
        console.error("Error initializing speech recognition:", err)
      }
    }
  }, [onSubmit])

  const toggleListening = () => {
    try {
      if (recognition) {
        if (isListening) {
          recognition.stop()
        } else {
          setTranscript("")
          recognition.start()
        }
      }
    } catch (err) {
      console.error("Error toggling speech recognition:", err)
      setIsListening(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={toggleListening}
        className={`px-6 py-3 rounded-full font-bold ${
          isListening
            ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isListening ? "Stop Recording" : buttonText}
      </button>

      {isListening && (
        <div className="mt-2 text-center text-gray-300">
          <div className="flex justify-center mt-2 mb-2">
            <div className="flex space-x-1">
              <div className="w-1 h-4 bg-blue-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]"></div>
              <div className="w-1 h-6 bg-yellow-500 rounded-full animate-[soundwave_0.7s_ease-in-out_infinite_0.1s]"></div>
              <div className="w-1 h-3 bg-green-500 rounded-full animate-[soundwave_0.4s_ease-in-out_infinite_0.2s]"></div>
              <div className="w-1 h-5 bg-red-500 rounded-full animate-[soundwave_0.6s_ease-in-out_infinite_0.3s]"></div>
              <div className="w-1 h-2 bg-purple-500 rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.4s]"></div>
            </div>
          </div>
          <p>Listening...</p>
        </div>
      )}

      {transcript && !isListening && (
        <div className="mt-2 text-center">
          <p className="text-gray-400">"{transcript}"</p>
        </div>
      )}
    </div>
  )
}
