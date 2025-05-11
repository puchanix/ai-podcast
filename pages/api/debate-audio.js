// pages/api/debate-audio.js
import fs from "fs"
import path from "path"

export const config = {
  api: {
    bodyParser: true,
  },
}

export default async function handler(req, res) {
  try {
    const { text, voice, characterId } = req.body

    if (!text) {
      return res.status(400).json({ error: "No text provided" })
    }

    // Use ElevenLabs API for high-quality TTS
    const voiceId = getVoiceId(voice)
    
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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

      // Store the audio file
      const audioUrl = await storeAudioFile(audioBuffer, characterId)

      return res.status(200).json({ audioUrl })
    } catch (error) {
      console.error("Error in TTS API:", error)
      return res.status(500).json({ error: "Failed to generate speech" })
    }
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
  }

  return voiceMap[voice] || "21m00Tcm4TlvDq8ikWAM" // Default to a male voice if not found
}

// Helper function to store audio file
async function storeAudioFile(audioBuffer, characterId) {
  // Create a unique filename
  const filename = `debate_${characterId}_${Date.now()}.mp3`
  
  // Ensure the directory exists
  const dir = path.join(process.cwd(), "public", "audio")
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  // Write the file
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, Buffer.from(audioBuffer))
  
  // Return the URL to the audio file
  return `/audio/${filename}`
}