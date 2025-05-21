// pages/api/stream-audio.js
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { text, voice = "alloy" } = req.body

    if (!text) {
      return res.status(400).json({ error: "Text is required" })
    }

    console.log(`Generating audio for text: ${text.substring(0, 50)}...`)

    // Use OpenAI's TTS API instead of Google
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

    // Send the audio data
    res.status(200).send(buffer)
  } catch (error) {
    console.error("Error generating audio:", error)
    res.status(500).json({ error: "Failed to generate audio" })
  }
}
