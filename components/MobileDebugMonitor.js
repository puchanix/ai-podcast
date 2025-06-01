"use client"

import { useState, useEffect } from "react"

export default function MobileDebugMonitor({ isVisible = true }) {
  const [logs, setLogs] = useState([])
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    if (!isVisible) return

    // Capture console.log messages
    const originalLog = console.log
    const originalError = console.error

    console.log = (...args) => {
      originalLog(...args)
      const message = args.join(" ")
      if (message.includes("🎵") || message.includes("🔊") || message.includes("DEBATE")) {
        setLogs(prev => [...prev.slice(-20), {
          type: "log",
          message,
          timestamp: new Date().toLocaleTimeString()
        }])
      }
    }

    console.error = (...args) => {
      originalError(...args)
      const message = args.join(" ")
      setLogs(prev => [...prev.slice(-20), {
        type: "error",
        message,
        timestamp: new Date().toLocaleTimeString()
      }])
    }

    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-black bg-opacity-90 text-white text-xs rounded-lg border border-gray-600 ${isMinimized ? "w-12 h-12" : "w-80 max-h-60"}`}>
      <div className="flex justify-between items-center p-2 border-b border-gray-600">
        <span className="font-semibold">Debug</span>
        <button 
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-yellow-400 hover:text-yellow-300"
        >
          {isMinimized ? "+" : "-"}
        </button>
      </div>
      
      {!isMinimized && (
        <div className="p-2 max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-400">No debug logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`mb-1 ${log.type === "error" ? "text-red-400" : "text-green-400"}`}>
                <span className="text-gray-500">{log.timestamp}</span>
                <div className="break-words">{log.message}</div>
              </div>
            ))
          )}
        </div>
      )}
      
      {!isMinimized && (
        <div className="p-2 border-t border-gray-600">
          <button 
            onClick={() => setLogs([])}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}