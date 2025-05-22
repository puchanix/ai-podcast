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
    const { text, voice } = req.body

    if (!text) {
      return res.status(400).json({ error: "Text is required" })
    }

    console.log(`Generating audio for text: ${text.substring(0, 50)}...`)

    // Check if the voice is an ElevenLabs voice ID (UUID format or 21-character alphanumeric)
    const isElevenLabsVoice =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(voice) ||
      /^[a-zA-Z0-9]{20,25}$/i.test(voice)

    let audioUrl

    if (isElevenLabsVoice) {
      // Use ElevenLabs for voice generation via our streaming endpoint
      console.log(`Using ElevenLabs voice: ${voice}`)

      // Generate a unique ID for this audio file
      const audioId = `elevenlabs_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

      // Return the streaming URL
      audioUrl = `/api/stream-audio?id=${audioId}&text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`
    } else {
      // Use OpenAI TTS as fallback
      console.log(`Using OpenAI voice: ${voice || "alloy"}`)

      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice || "alloy",
        input: text,
      })

      const buffer = Buffer.from(await mp3.arrayBuffer())

      // Convert buffer to base64
      const base64Audio = buffer.toString("base64")

      // Create a data URL
      audioUrl = `data:audio/mpeg;base64,${base64Audio}`
    }

    res.status(200).json({ audioUrl })
  } catch (error) {
    console.error("Error generating speech:", error)
    res.status(500).json({ error: "Failed to generate speech" })
  }
}
