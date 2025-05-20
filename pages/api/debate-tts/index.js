// Define a simple set of characters for testing
const characters = [
    {
      id: "einstein",
      name: "Albert Einstein",
      voice: "en-US-Neural2-J",
    },
    {
      id: "curie",
      name: "Marie Curie",
      voice: "en-US-Neural2-F",
    },
    {
      id: "daVinci",
      name: "Leonardo da Vinci",
      voice: "en-US-Neural2-D",
    },
    {
      id: "socrates",
      name: "Socrates",
      voice: "en-US-Neural2-J",
    },
  ]
  
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
  
      // Generate a unique ID for this audio request
      const audioId = `debate_${characterId}_${Date.now()}`
  
      // Instead of storing the file, return a URL to our streaming API
      const audioUrl = `/api/stream-audio?id=${audioId}&text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`
  
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
  