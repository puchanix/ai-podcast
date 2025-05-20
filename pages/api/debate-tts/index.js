import { personas } from "../../../lib/personas"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { text, characterId } = req.body

    if (!text || !characterId) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Find the character
    const character = personas[characterId]
    if (!character) {
      return res.status(404).json({ error: "Character not found" })
    }

    // For testing purposes, we'll return a URL to our streaming API
    const timestamp = Date.now()
    const audioId = `debate_${characterId}_${timestamp}`

    // Create a URL to our streaming API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const audioUrl = `/api/stream-audio?id=${audioId}&text=${encodeURIComponent(text)}&voice=${encodeURIComponent(character.voice || "en-US-Neural2-D")}`

    console.log(`Generated audio URL: ${audioUrl}`)

    return res.json({
      success: true,
      audioUrl,
      audioId,
    })
  } catch (error) {
    console.error("Error in debate-tts:", error)
    return res.status(500).json({ error: "Internal server error", details: error.message })
  }
}
