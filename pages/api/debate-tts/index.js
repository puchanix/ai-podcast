import { characters } from "../../../data/characters"
import fs from "fs"
import path from "path"
import { promisify } from "util"

// Convert fs functions to promise-based
const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)
const existsAsync = promisify(fs.exists)

export default async function handler(req, res) {
  try {
    console.log("Debate TTS API called with:", JSON.stringify(req.body, null, 2))
    const { text, characterId } = req.body

    if (!text) {
      console.error("TTS API: No text provided")
      return res.status(400).json({ error: "No text provided" })
    }

    // Find the character to get their voice
    const character = characters.find((c) => c.id === characterId)
    if (!character) {
      console.error(`TTS API: Character not found: ${characterId}`)
      return res.status(400).json({ error: "Character not found" })
    }

    const voice = character.voice
    console.log(`TTS API: Generating audio for ${character.name} with voice ${voice}`)

    // Check if we have an ElevenLabs API key
    if (!process.env.ELEVENLABS_API_KEY) {
      console.warn("No ElevenLabs API key found, using test audio")
      return res.json({
        audioUrl: "/test-audio.mp3",
        fallback: true,
        error: "No ElevenLabs API key configured",
      })
    }

    // Use ElevenLabs API for high-quality TTS
    console.log(`Calling ElevenLabs API with voice ID: ${getVoiceId(voice)}`)
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + getVoiceId(voice), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`ElevenLabs API error: ${response.status} ${response.statusText}`)
      console.error(`Error details: ${errorText}`)

      // Return a test audio file as fallback
      return res.json({
        audioUrl: "/test-audio.mp3",
        fallback: true,
        error: `ElevenLabs API error: ${response.status} ${response.statusText}`,
      })
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer()
    console.log(`TTS API: Received audio buffer of size ${audioBuffer.byteLength} bytes`)

    if (audioBuffer.byteLength === 0) {
      console.error("Received empty audio buffer from ElevenLabs")
      return res.json({
        audioUrl: "/test-audio.mp3",
        fallback: true,
        error: "Received empty audio buffer from ElevenLabs",
      })
    }

    // Store the audio file
    const filename = `debate_${characterId}_${Date.now()}.mp3`
    const audioUrl = await storeAudioFile(Buffer.from(audioBuffer), filename)
    console.log(`TTS API: Generated audio URL: ${audioUrl}`)

    return res.json({ audioUrl })
  } catch (error) {
    console.error("Error in Debate TTS API:", error)
    // Return test audio as fallback
    return res.json({
      audioUrl: "/test-audio.mp3",
      fallback: true,
      error: error.message,
    })
  }
}

// Helper function to map voice names to ElevenLabs voice IDs
function getVoiceId(voice) {
  const voiceMap = {
    "en-US-Neural2-J": "21m00Tcm4TlvDq8ikWAM", // Male voice for Einstein
    "en-US-Neural2-F": "EXAVITQu4vr4xnSDxMaL", // Female voice for Curie
    "en-US-Neural2-D": "AZnzlk1XvdvUeBnXmlld", // Male voice for da Vinci
    "en-GB-Neural2-F": "MF3mGyEYCl7XYWbV9V6O", // Female British voice for Lovelace
    // Add more voice mappings as needed
  }

  return voiceMap[voice] || "21m00Tcm4TlvDq8ikWAM" // Default to a male voice if not found
}

// Helper function to store audio file
async function storeAudioFile(audioBuffer, filename) {
  try {
    // Create the public/audio directory if it doesn't exist
    const audioDir = path.join(process.cwd(), "public", "audio")
    if (!(await existsAsync(audioDir))) {
      await mkdirAsync(audioDir, { recursive: true })
    }

    // Write the audio file to the public directory
    const filePath = path.join(audioDir, filename)
    await writeFileAsync(filePath, audioBuffer)
    console.log(`Audio file saved to ${filePath}`)

    // Return a URL that can be accessed from the browser
    return `/audio/${filename}`
  } catch (error) {
    console.error("Error storing audio file:", error)
    throw error
  }
}
