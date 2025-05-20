import { personas } from "../../lib/personas"

export default async function handler(req, res) {
  try {
    const { character1, character2, userQuestion, currentMessages, format, historicalContext } = req.body

    // Get character details
    const char1 = personas[character1]
    const char2 = personas[character2]

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // In a real implementation, you would use AI to generate these responses
    // For now, we'll return placeholder text
    const response1 = `That's an excellent question. As ${char1.name}, I would say that ${userQuestion} relates directly to my work on understanding the natural world. My approach has always been to observe carefully and draw conclusions based on evidence.`

    const response2 = `I find ${char1.name}'s perspective interesting, but I, ${char2.name}, would add that ${userQuestion} must also be considered in light of broader societal implications. My experience has taught me that context matters tremendously in such discussions.`

    // Generate audio using our streaming API
    const timestamp = Date.now()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    // Create URLs to our streaming API
    const audioUrl1 = `/api/stream-audio?id=debate_${character1}_${timestamp}&text=${encodeURIComponent(response1)}&voice=${encodeURIComponent(char1.voice || "en-US-Neural2-D")}`
    const audioUrl2 = `/api/stream-audio?id=debate_${character2}_${timestamp + 1}&text=${encodeURIComponent(response2)}&voice=${encodeURIComponent(char2.voice || "en-US-Neural2-D")}`

    console.log(`Generated audio URLs: ${audioUrl1}, ${audioUrl2}`)

    return res.json({
      response1,
      response2,
      audioUrl1,
      audioUrl2,
    })
  } catch (error) {
    console.error("Error continuing debate:", error)
    return res.status(500).json({ error: "Internal server error", details: error.message })
  }
}
