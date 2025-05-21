// pages/api/stream-audio.js
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  // Accept GET requests instead of just POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    // Use query parameters for GET requests
    const text = req.method === "GET" ? req.query.text : req.body.text
    const voice = req.method === "GET" ? req.query.voice || "alloy" : req.body.voice || "alloy"

    if (!text) {
      return res.status(400).json({ error: "Text is required" })
    }

    console.log(`Generating audio for text: ${text.substring(0, 50)}...`)

    // Use OpenAI's TTS API
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
    })

    // Get the audio data as an ArrayBuffer
    const buffer = Buffer.from(await mp3.arrayBuffer())

    // Set appropriate headers
    res.setHeader("Content-Type", "audio/mpeg")
    res.setHeader("Content-Length", buffer.length)

    // Add CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    // Send the audio data
    res.status(200).send(buffer)
  } catch (error) {
    console.error("Error generating audio:", error)
    res.status(500).json({ error: "Failed to generate audio: " + error.message })
  }
}
