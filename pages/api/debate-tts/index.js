import { personas } from "../../../lib/personas"

export default async function handler(req, res) {
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

    const voice = character.voice

    // Use ElevenLabs API for high-quality TTS
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + getVoiceId(voice), {
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
        // If ElevenLabs fails, return a silent MP3 as fallback
        console.error(`ElevenLabs API error: ${await response.text()}`)
        return res.status(200).json({ audioUrl: "/silent.mp3" })
      }

      // In a real implementation, you would store the audio file
      // For now, we'll just return a URL to a mock API route
      const filename = `debate_${characterId}_${Date.now()}.mp3`
      const audioUrl = `/api/audio/${filename}`

      return res.status(200).json({ audioUrl })
    } catch (error) {
      console.error("Error calling ElevenLabs:", error)
      return res.status(200).json({ audioUrl: "/silent.mp3" })
    }
  } catch (error) {
    console.error("Error in Debate TTS API:", error)
    return res.status(200).json({ audioUrl: "/silent.mp3" })
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