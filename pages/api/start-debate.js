import { characters } from "../../data/characters"

export default async function handler(req, res) {
  try {
    const { character1, character2, topic, format, historicalContext } = req.body

    // Get character details
    const char1 = characters.find((c) => c.id === character1)
    const char2 = characters.find((c) => c.id === character2)

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // In a real implementation, you would use AI to generate these responses
    // For now, we'll return placeholder text
    const opening1 = `As ${char1.name}, I would approach the topic of "${topic}" by considering the fundamental principles that have guided my work. This subject is fascinating because it touches on the core of human understanding and progress.`

    const opening2 = `From my perspective as ${char2.name}, I see "${topic}" through a different lens. While I appreciate ${char1.name}'s approach, I believe we must also consider the practical implications and historical context of this matter.`

    // Generate audio using our TTS endpoint
    let audioUrl1 = "/silent.mp3"
    let audioUrl2 = "/silent.mp3"

    try {
      // Generate audio for character 1
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      const ttsResponse1 = await fetch(`${baseUrl}/api/debate-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: opening1,
          characterId: character1,
        }),
      })

      if (ttsResponse1.ok) {
        const ttsData1 = await ttsResponse1.json()
        audioUrl1 = ttsData1.audioUrl
      }

      // Generate audio for character 2
      const ttsResponse2 = await fetch(`${baseUrl}/api/debate-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: opening2,
          characterId: character2,
        }),
      })

      if (ttsResponse2.ok) {
        const ttsData2 = await ttsResponse2.json()
        audioUrl2 = ttsData2.audioUrl
      }
    } catch (error) {
      console.error("Error generating TTS:", error)
      // Use fallback audio if TTS fails
    }

    return res.json({
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
