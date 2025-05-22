// pages/api/stream-audio.js
import { ElevenLabs } from "elevenlabs"
import OpenAI from "openai"

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabs({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

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

    // Check if the voice is an ElevenLabs voice ID (UUID format)
    // This regex checks for a UUID format which ElevenLabs uses
    const isElevenLabsVoice =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(voice) ||
      /^[a-zA-Z0-9]{20,25}$/i.test(voice) // Also check for ElevenLabs' 21-character IDs

    if (isElevenLabsVoice) {
      // Use ElevenLabs for voice generation
      console.log(`Streaming with ElevenLabs voice: ${voice}`)

      try {
        // Stream the audio from ElevenLabs
        const stream = await elevenlabs.generate({
          voice: voice,
          text: text,
          stream: true,
        })

        // Pipe the stream to the response
        for await (const chunk of stream) {
          res.write(chunk)
        }

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
