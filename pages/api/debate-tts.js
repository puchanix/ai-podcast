import { personas } from "../../lib/personas"

export default async function handler(req, res) {
  try {
    const { text, characterId } = req.body

    if (!text) {
      console.error("TTS API: No text provided")
      return res.status(400).json({ error: "No text provided" })
    }

    // Find the character to get their voice
    const character = personas[characterId]
    if (!character) {
      console.error(`TTS API: Character not found: ${characterId}`)
      return res.status(400).json({ error: "Character not found" })
    }

    const voice = character.voice || "en-US-Neural2-D" // Default voice if not specified
    console.log(`TTS API: Generating audio for ${character.name} with voice ${voice}`)

    // Check if we have an ElevenLabs API key
    if (!process.env.ELEVENLABS_API_KEY) {
      console.warn("No ElevenLabs API key found, using fallback audio")
      return res.json({
        audioUrl: "/silent.mp3",
        fallback: true,
        error: "No ElevenLabs API key configured",
      })
    }

    // Use ElevenLabs API for high-quality TTS
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
      console.error(`ElevenLabs API error: ${errorText}`)

      // Return a test audio file as fallback
      return res.json({
        audioUrl: "/silent.mp3",
        fallback: true,
        error: `ElevenLabs API error: ${response.status} ${response.statusText}`,
      })
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer()
    console.log(`TTS API: Received audio buffer of size ${audioBuffer.byteLength} bytes`)

    // Store the audio file (you could use Vercel Blob or another storage solution)
    const audioUrl = await storeAudioFile(audioBuffer, characterId)
    console.log(`TTS API: Generated audio URL: ${audioUrl}`)

    return res.json({ audioUrl })
  } catch (error) {
    console.error("Error in Debate TTS API:", error)
    // Return test audio as fallback
    return res.json({
      audioUrl: "/silent.mp3",
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
// This is a placeholder - implement with your preferred storage solution
async function storeAudioFile(audioBuffer, characterId) {
  // For this example, we'll use a simple API route that serves the audio
  // In a real implementation, you would use Vercel Blob, S3, or another storage solution

  // Create a unique filename
  const filename = `debate_${characterId}_${Date.now()}.mp3`

  // Store the file (this is where you'd implement your storage logic)
  // For now, we'll just return a URL to a mock API route
  return `/api/audio/${filename}`
}
