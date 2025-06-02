"use client"

import { useState } from "react"
import Layout from "../components/layout"

export default function Feedback() {
  const [submitted, setSubmitted] = useState(false)
  const [text, setText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("https://formspree.io/f/xeokqavy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          _subject: "AI Heroes Feedback",
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setText("")
      } else {
        setError("Failed to submit feedback. Please try again.")
      }
    } catch (error) {
      console.error("Error:", error)
      setError("Network error. Please try again later.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Feedback
            </h1>
            <p className="text-lg text-gray-300">
              Help us improve AI Heroes of History with your thoughts and suggestions
            </p>
          </div>

          <div className="bg-gray-800 rounded-xl p-8 shadow-2xl">
            {submitted ? (
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-green-400 mb-2">Thank you!</h2>
                  <p className="text-gray-300">Your feedback has been submitted successfully.</p>
                </div>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setText("")
                    setError("")
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  Submit More Feedback
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-yellow-400 mb-3">
                    Share your thoughts, suggestions, or report issues:
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full p-4 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 transition-all duration-300"
                    rows={6}
                    placeholder="Tell us what you think about the AI Heroes experience..."
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !text.trim()}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Feedback</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
