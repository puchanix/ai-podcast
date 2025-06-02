"use client"

import { useState, useEffect } from "react"
import Layout from "../components/layout"

export default function Admin() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    fetchFeedback()
  }, [])

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
