// pages/api/debate-audio.js
import formidable from "formidable"
import fs from "fs"
import path from "path"
import { characters } from "../../data/characters"

// Disable body parser for this route
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    // Parse form with formidable
    const form = new formidable.IncomingForm({
      keepExtensions: true,
    })

    const [fields] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        resolve([fields, files])
      })
    })

    // Get character ID and text from form data
    const characterId = fields.characterId[0]
    const text = fields.text[0]

    if (!characterId || !text) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Find the character
    const character = characters.find((c) => c.id === characterId)
    if (!character) {
      return res.status(400).json({ error: "Character not found" })
    }

    // Use ElevenLabs API for high-quality TTS
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + getVoiceId(character.voice), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
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
      const error = await response.text()
      return res.status(response.status).json({ error: `ElevenLabs API error: ${error}` })
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer()

    // Store the audio file (using the same approach as in the main app)
    const audioUrl = await storeAudioFile(audioBuffer)

    return res.status(200).json({ audioUrl })
  } catch (error) {
    console.error("Error in debate audio API:", error)
    return res.status(500).json({ error: "Failed to generate speech" })
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

// Helper function to store audio file (same as in the main app)
async function storeAudioFile(audioBuffer) {
  // Create a unique filename
  const filename = `debate_audio_${Date.now()}.mp3`
  
  // Store the file (this is where you'd implement your storage logic)
  // For now, we'll just return a URL to a mock API route
  const filePath = path.join(process.cwd(), "public", "audio", filename)
  
  // Ensure the directory exists
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  // Write the file
  fs.writeFileSync(filePath, Buffer.from(audioBuffer))
  
  return `/audio/${filename}`
}