export default async function handler(req, res) {
  try {
    const { id, text, voice } = req.query

    if (!text || !voice) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    console.log(`Stream Audio API: Generating audio for text: "${text.substring(0, 50)}..." with voice: ${voice}`)

    // Check if we have an ElevenLabs API key
    if (!process.env.ELEVENLABS_API_KEY) {
      console.warn("No ElevenLabs API key found, redirecting to test audio")
      return res.redirect("/test-audio.mp3")
    }

    // Get the voice ID
    const voiceId = getVoiceId(voice)
    console.log(`Using ElevenLabs voice ID: ${voiceId}`)

    // Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: decodeURIComponent(text),
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      console.error(`ElevenLabs API error: ${response.status} ${response.statusText}`)
      return res.redirect("/test-audio.mp3")
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer()
    console.log(`Received audio buffer of size ${audioBuffer.byteLength} bytes`)

    if (audioBuffer.byteLength === 0) {
      console.error("Received empty audio buffer from ElevenLabs")
      return res.redirect("/test-audio.mp3")
    }

    // Set appropriate headers
    res.setHeader("Content-Type", "audio/mpeg")
    res.setHeader("Content-Length", audioBuffer.byteLength)

    // Stream the audio data directly to the client
    res.send(Buffer.from(audioBuffer))
  } catch (error) {
    console.error("Error in Stream Audio API:", error)
    res.redirect("/test-audio.mp3")
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
