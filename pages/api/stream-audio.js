// pages/api/stream-audio.js
import OpenAI from "openai"
import fetch from "node-fetch"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Valid OpenAI voices
const VALID_OPENAI_VOICES = ["nova", "shimmer", "echo", "onyx", "fable", "alloy", "ash", "sage", "coral"]

export default async function handler(req, res) {
  // Set appropriate headers for streaming audio
  res.setHeader("Content-Type", "audio/mpeg")
  res.setHeader("Transfer-Encoding", "chunked")

  try {
    const { id, text, voice } = req.query

    if (!text) {
      res.status(400).end("Text is required")
      return
    }

    console.log(`Streaming audio for: ${text.substring(0, 50)}...`)
    console.log(`Requested voice: ${voice}`)

    // Check if the voice is an ElevenLabs voice ID (UUID format or 21-character alphanumeric)
    const isElevenLabsVoice =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(voice) ||
      /^[a-zA-Z0-9]{20,25}$/i.test(voice)

    // Check if the voice is a valid OpenAI voice
    const isValidOpenAIVoice = VALID_OPENAI_VOICES.includes(voice)

    // Determine which voice to use
    let finalVoice = "alloy" // Default fallback

    if (isElevenLabsVoice) {
      // Use ElevenLabs for voice generation
      console.log(`Streaming with ElevenLabs voice: ${voice}`)

      try {
        // Use the ElevenLabs API directly with lower quality settings for faster generation
        const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_monolingual_v1",
            output_format: "mp3_44100_64", // Lower bitrate for faster generation
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        })

        if (!elevenLabsResponse.ok) {
          throw new Error(`ElevenLabs API error: ${elevenLabsResponse.statusText}`)
        }

        // Get the response as an array buffer
        const audioBuffer = await elevenLabsResponse.arrayBuffer()

        // Write the buffer to the response
        res.write(Buffer.from(audioBuffer))
        res.end()
        return
      } catch (error) {
        console.error("ElevenLabs streaming error:", error)
        // Fall through to OpenAI fallback
      }
    }

    // If we get here, either it's not an ElevenLabs voice or ElevenLabs failed
    // Use a valid OpenAI voice
    if (isValidOpenAIVoice) {
      finalVoice = voice
    }

    console.log(`Streaming with OpenAI voice: ${finalVoice}`)

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: finalVoice,
      input: text,
      speed: 1.1, // Slightly faster speech
    })

    const buffer = await mp3.arrayBuffer()
    res.write(Buffer.from(buffer))
    res.end()
  } catch (error) {
    console.error("Error streaming audio:", error)
    res.status(500).end("Error streaming audio")
  }
}
