import { personas } from "../../lib/personas"

export default async function handler(req, res) {
  try {
    const { character1, character2, currentMessages, topic, format, historicalContext } = req.body

    // Get character details
    const char1 = personas[character1]
    const char2 = personas[character2]

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // In a real implementation, you would use AI to generate these responses based on the conversation history
    // For now, we'll return placeholder text
    const response1 = `Building on our discussion about "${topic}", I, ${char1.name}, would like to emphasize that this topic has profound implications for how we understand the world. My research has consistently shown that careful observation and methodical experimentation lead to the most reliable conclusions.`

    const response2 = `While I appreciate ${char1.name}'s methodical approach, I, ${char2.name}, believe we must also consider the human element in this discussion. The topic of "${topic}" cannot be reduced to mere formulas or experiments. There is an artistic and intuitive dimension that must be acknowledged.`

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
    console.error("Error auto-continuing debate:", error)
    return res.status(500).json({ error: "Internal server error", details: error.message })
  }
}
