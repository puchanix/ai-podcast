// pages/api/speak.js
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Replace the handler function with this version that uses ElevenLabs
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { text, voice = "alloy" } = req.body

    if (!text) {
      return res.status(400).json({ error: "Text is required" })
    }

    console.log(`Generating audio with voice ID: "${voice}" for text: ${text.substring(0, 50)}...`)

    // Check if this is an ElevenLabs voice ID (they typically start with numbers)
    const isElevenLabsVoice = /^\w{20}$/.test(voice)

    let audioUrl

    if (isElevenLabsVoice) {
      // Use ElevenLabs API
      const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY

      if (!ELEVEN_LABS_API_KEY) {
        console.warn("ELEVEN_LABS_API_KEY not found, falling back to OpenAI TTS")
        // Fall back to OpenAI if no ElevenLabs API key
        const mp3 = await openai.audio.speech.create({
          model: "tts-1",
          voice: "alloy", // Default fallback
          input: text,
        })

        const buffer = Buffer.from(await mp3.arrayBuffer())
        const base64Audio = buffer.toString("base64")
        audioUrl = `data:audio/mp3;base64,${base64Audio}`
      } else {
        // Use ElevenLabs
        const options = {
          method: "POST",
          headers: {
            "xi-api-key": ELEVEN_LABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }

        const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, options)

        if (!elevenLabsResponse.ok) {
          throw new Error(`ElevenLabs API returned ${elevenLabsResponse.status}`)
        }

        const arrayBuffer = await elevenLabsResponse.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64Audio = buffer.toString("base64")
        audioUrl = `data:audio/mp3;base64,${base64Audio}`
      }
    } else {
      // Use OpenAI's TTS API as fallback
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice, // Use the provided voice or default to "alloy"
        input: text,
      })

      // Get the audio data as an ArrayBuffer
      const buffer = Buffer.from(await mp3.arrayBuffer())
      const base64Audio = buffer.toString("base64")
      audioUrl = `data:audio/mp3;base64,${base64Audio}`
    }

    // Return the data URL
    res.status(200).json({ audioUrl })
  } catch (error) {
    console.error("Error generating audio:", error)
    res.status(500).json({ error: "Failed to generate audio", details: error.message })
  }
}
