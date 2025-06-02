"use client"

import { useState, useEffect } from "react"
import { personas } from "../lib/personas"
import Layout from "../components/layout"

export default function Admin() {
  const [selectedPersona, setSelectedPersona] = useState("daVinci")
  const [questions, setQuestions] = useState([])
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`/api/question-count?character=${selectedPersona}`)
      const data = await res.json()
      setQuestions(data.questions || [])
    } catch (err) {
      console.error("Failed to fetch questions", err)
    }
  }

  const fetchFeedback = async () => {
    try {
      const res = await fetch(`/api/feedback`)
      const data = await res.json()
      setFeedback(data.feedback || [])
    } catch (err) {
      console.error("Failed to fetch feedback", err)
    } finally {
      setLoading(false)
    }
  }

  const deleteFeedback = async (timestamp) => {
    const confirmed = confirm("Delete this feedback?")
    if (!confirmed) return

    try {
      await fetch(`/api/feedback?timestamp=${timestamp}`, {
        method: "DELETE",
      })
      fetchFeedback()
    } catch (err) {
      console.error("Failed to delete feedback", err)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [selectedPersona])

  useEffect(() => {
    fetchFeedback()
  }, [])

  const handleResetAll = async () => {
    if (!confirm("Are you sure you want to reset ALL questions?")) return
    try {
      await fetch("/api/question-count", { method: "DELETE" })
      fetchQuestions()
    } catch (err) {
      console.error("Failed to reset all questions", err)
    }
  }

  const handleResetCharacter = async () => {
    if (!confirm(`Reset all questions for ${personas[selectedPersona].name}?`)) return
    try {
      await fetch(`/api/question-count?character=${selectedPersona}`, { method: "DELETE" })
      fetchQuestions()
    } catch (err) {
      console.error("Failed to reset character questions", err)
    }
  }

  const handleDeleteQuestion = async (q) => {
    if (!confirm(`Delete question: "${q}"?`)) return
    try {
      await fetch(`/api/question-count?character=${selectedPersona}&question=${encodeURIComponent(q)}`, {
        method: "DELETE",
      })
      fetchQuestions()
    } catch (err) {
      console.error("Failed to delete question", err)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-yellow-400">Loading admin data...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>

          {/* Questions Section */}
          <div className="bg-gray-800 rounded-xl p-6 mb-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-yellow-400 mb-6">Question Management</h2>

            <div className="flex flex-wrap gap-4 mb-6">
              <button
                onClick={handleResetAll}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300"
              >
                Reset All Questions
              </button>

              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className="p-2 rounded-lg border bg-gray-700 text-white border-gray-600 focus:border-yellow-400 focus:outline-none"
              >
                {Object.values(personas).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleResetCharacter}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300"
              >
                Reset {personas[selectedPersona].name} Questions
              </button>
            </div>

            <h3 className="text-xl font-semibold mb-4 text-gray-300">
              Questions for {personas[selectedPersona].name} ({questions.length})
            </h3>

            {questions.length === 0 ? (
              <p className="text-gray-400 italic">No questions recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {questions.map(({ question }, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                    <span className="text-gray-200 flex-1">{question}</span>
                    <button
                      onClick={() => handleDeleteQuestion(question)}
                      className="text-red-400 hover:text-red-300 ml-4 px-2 py-1 rounded transition-colors duration-300"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback Section */}
          <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-yellow-400 mb-6">User Feedback ({feedback.length})</h2>

            {feedback.length === 0 ? (
              <p className="text-gray-400 italic">No feedback submitted yet.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {feedback.map((entry, idx) => (
                  <div key={idx} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-gray-200 mb-2">{entry.text}</p>
                        <p className="text-gray-400 text-sm">{new Date(entry.timestamp).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => deleteFeedback(entry.timestamp)}
                        className="text-red-400 hover:text-red-300 ml-4 px-2 py-1 rounded transition-colors duration-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
