import { personas } from "../../lib/personas"

export default async function handler(req, res) {
  try {
    const { character1, character2, topic, format, historicalContext } = req.body

    // Get character details
    const char1 = personas[character1]
    const char2 = personas[character2]

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // In a real implementation, you would use AI to generate these responses
    // For now, we'll return placeholder text
    const opening1 = `As ${char1.name}, I would approach the topic of "${topic}" by considering the fundamental principles that have guided my work. This subject is fascinating because it touches on the core of human understanding and progress.`

    const opening2 = `From my perspective as ${char2.name}, I see "${topic}" through a different lens. While I appreciate ${char1.name}'s approach, I believe we must also consider the practical implications and historical context of this matter.`

    // Generate audio using our streaming API
    const timestamp = Date.now()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    // Create URLs to our streaming API
    const audioUrl1 = `/api/stream-audio?id=debate_${character1}_${timestamp}&text=${encodeURIComponent(opening1)}&voice=${encodeURIComponent(char1.voice || "en-US-Neural2-D")}`
    const audioUrl2 = `/api/stream-audio?id=debate_${character2}_${timestamp + 1}&text=${encodeURIComponent(opening2)}&voice=${encodeURIComponent(char2.voice || "en-US-Neural2-D")}`

    console.log(`Generated audio URLs: ${audioUrl1}, ${audioUrl2}`)

    return res.json({
      opening1,
      opening2,
      audioUrl1,
      audioUrl2,
    })
  } catch (error) {
    console.error("Error starting debate:", error)
    return res.status(500).json({ error: "Internal server error", details: error.message })
  }
}
