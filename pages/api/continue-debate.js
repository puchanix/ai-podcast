import { personas } from "../../lib/personas"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

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

    // Generate audio using our TTS endpoint
    let audioUrl1 = "/silent.mp3"
    let audioUrl2 = "/silent.mp3"

    try {
      // Generate audio for character 1
      const ttsResponse1 = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/debate-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: response1,
            characterId: character1,
          }),
        },
      )

      if (ttsResponse1.ok) {
        const ttsData1 = await ttsResponse1.json()
        audioUrl1 = ttsData1.audioUrl
      }

      // Generate audio for character 2
      const ttsResponse2 = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/debate-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: response2,
            characterId: character2,
          }),
        },
      )

      if (ttsResponse2.ok) {
        const ttsData2 = await ttsResponse2.json()
        audioUrl2 = ttsData2.audioUrl
      }
    } catch (error) {
      console.error("Error generating TTS:", error)
      // Use fallback audio if TTS fails
    }

    return res.status(200).json({
      response1,
      response2,
      audioUrl1,
      audioUrl2,
    })
  } catch (error) {
    console.error("Error continuing debate:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
