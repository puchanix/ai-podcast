// pages/api/stream-audio.js
import OpenAI from "openai"
import fetch from "node-fetch"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    // Check if the voice is an ElevenLabs voice ID (UUID format or 21-character alphanumeric)
    const isElevenLabsVoice =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(voice) ||
      /^[a-zA-Z0-9]{20,25}$/i.test(voice)

    if (isElevenLabsVoice) {
      // Use ElevenLabs for voice generation
      console.log(`Streaming with ElevenLabs voice: ${voice}`)

      try {
        // Use the ElevenLabs API directly
        const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_monolingual_v1",
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
      } catch (error) {
        console.error("ElevenLabs streaming error:", error)

        // Fall back to OpenAI if ElevenLabs fails
        console.log("Falling back to OpenAI TTS")
        const mp3 = await openai.audio.speech.create({
          model: "tts-1",
          voice: "alloy",
          input: text,
        })

        const buffer = await mp3.arrayBuffer()
        res.write(Buffer.from(buffer))
        res.end()
      }
    } else {
      // Use OpenAI TTS
      console.log(`Streaming with OpenAI voice: ${voice || "alloy"}`)

      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice || "alloy",
        input: text,
      })

      const buffer = await mp3.arrayBuffer()
      res.write(Buffer.from(buffer))
      res.end()
    }
  } catch (error) {
    console.error("Error streaming audio:", error)
    res.status(500).end("Error streaming audio")
  }
}
