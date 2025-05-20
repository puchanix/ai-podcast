import { personas } from "../../../lib/personas"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { text, characterId } = req.body

    if (!text) {
      return res.status(400).json({ error: "No text provided" })
    }

    // Find the character to get their voice
    const character = personas[characterId]
    if (!character) {
      return res.status(400).json({ error: "Character not found" })
    }

    const voice = character.voice || "en-US-Neural2-D" // Default voice if not specified

    // Use ElevenLabs API for high-quality TTS
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${getVoiceId(voice)}`, {
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
        console.error(`ElevenLabs API error: ${await response.text()}`)
        return res.status(200).json({ audioUrl: "/silent.mp3" }) // Return silent audio as fallback
      }

      // Get the audio data
      const audioBuffer = await response.arrayBuffer()

      // Create a unique filename
      const filename = `debate_${characterId}_${Date.now()}.mp3`

      // Return the URL to the audio file
      return res.status(200).json({ audioUrl: `/api/audio/${filename}` })
    } catch (error) {
      console.error("Error in TTS API:", error)
      return res.status(200).json({ audioUrl: "/silent.mp3" }) // Return silent audio as fallback
    }
  } catch (error) {
    console.error("Error in Debate TTS API:", error)
    return res.status(200).json({ audioUrl: "/silent.mp3" }) // Return silent audio as fallback
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
