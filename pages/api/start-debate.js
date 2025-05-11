import { personas } from "../../lib/personas"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

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

    // Generate audio URLs (in a real implementation, you would call a TTS service)
    // For now, we'll use the podcast audio as a placeholder
    const audioUrl1 = char1.podcast || "/silent.mp3"
    const audioUrl2 = char2.podcast || "/silent.mp3"

    return res.status(200).json({
      opening1,
      opening2,
      audioUrl1,
      audioUrl2,
    })
  } catch (error) {
    console.error("Error starting debate:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
