// pages/api/speak.js
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

    console.log(`Generating audio with voice: ${voice} for text: ${text.substring(0, 50)}...`)

    // Use OpenAI's TTS API
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice, // Use the provided voice or default to "alloy"
      input: text,
    })

    // Get the audio data as an ArrayBuffer
    const buffer = Buffer.from(await mp3.arrayBuffer())

    // Convert to base64 for data URL
    const base64Audio = buffer.toString("base64")
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`

    // Return the data URL
    res.status(200).json({ audioUrl })
  } catch (error) {
    console.error("Error generating audio:", error)
    res.status(500).json({ error: "Failed to generate audio" })
  }
}
