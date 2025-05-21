// pages/api/speak.js
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Replace the handler function with this version that matches how pages/index.js handles voices:
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { text, voice = "en-US-Neural2-D" } = req.body

    if (!text) {
      return res.status(400).json({ error: "Text is required" })
    }

    console.log(`Generating audio with voice: "${voice}" for text: ${text.substring(0, 50)}...`)

    // Use the stream-audio endpoint that's used in pages/index.js
    const streamAudioUrl = `/api/stream-audio?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`

    // Create a data URL with the stream-audio endpoint
    // This matches how pages/index.js handles audio
    const audioUrl = streamAudioUrl

    // Return the URL to the stream-audio endpoint
    res.status(200).json({ audioUrl })
  } catch (error) {
    console.error("Error generating audio:", error)
    res.status(500).json({ error: "Failed to generate audio", details: error.message })
  }
}
