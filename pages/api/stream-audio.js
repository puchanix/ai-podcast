// pages/api/stream-audio.js
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Map Google TTS voices to OpenAI voices
function mapVoice(googleVoice) {
  // Default to 'alloy' if no mapping exists
  const voiceMap = {
    "en-US-Neural2-D": "alloy", // Male voice
    "en-US-Neural2-F": "nova", // Female voice
    "en-US-Neural2-C": "echo", // Neutral voice
    "en-US-Neural2-A": "shimmer", // Female voice
    "en-US-Neural2-B": "fable", // Male voice
    "en-US-Neural2-E": "onyx", // Male voice
  }

  return voiceMap[googleVoice] || "alloy"
}

export default async function handler(req, res) {
  // Accept GET requests instead of just POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    // Use query parameters for GET requests
    const text = req.method === "GET" ? req.query.text : req.body.text
    const googleVoice =
      req.method === "GET" ? req.query.voice || "en-US-Neural2-D" : req.body.voice || "en-US-Neural2-D"

    // Map Google voice to OpenAI voice
    const openaiVoice = mapVoice(googleVoice)

    if (!text) {
      console.error("Text parameter is missing")
      return res.status(400).json({ error: "Text is required" })
    }

    console.log(`Generating audio for text: ${text.substring(0, 50)}...`)
    console.log(`Using OpenAI voice: ${openaiVoice} (mapped from ${googleVoice})`)

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set")
      return res.status(500).json({ error: "OpenAI API key is not configured" })
    }

    try {
      // Use OpenAI's TTS API
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: openaiVoice,
        input: text,
      })

      // Get the audio data as an ArrayBuffer
      const buffer = Buffer.from(await mp3.arrayBuffer())

      // Set appropriate headers
      res.setHeader("Content-Type", "audio/mpeg")
      res.setHeader("Content-Length", buffer.length)

      // Send the audio data
      res.status(200).send(buffer)
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError)
      return res.status(500).json({
        error: "OpenAI API error",
        message: openaiError.message,
        details: openaiError.toString(),
      })
    }
  } catch (error) {
    console.error("Error generating audio:", error)
    res.status(500).json({
      error: "Failed to generate audio",
      message: error.message,
      stack: error.stack,
    })
  }
}
