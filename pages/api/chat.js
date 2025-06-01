import OpenAI from "openai"
import { characterPrompts, AI_CONFIG } from "../../lib/personas"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { messages, character, message, persona } = req.body

    // Handle both old and new API formats
    const characterKey = character || persona
    const userMessage = message || (messages && messages[0]?.content)

    if (!characterKey || !userMessage) {
      return res.status(400).json({ error: "Missing character or message" })
    }

    const characterPrompt = characterPrompts[characterKey]
    if (!characterPrompt) {
      return res.status(400).json({ error: `Unknown character: ${characterKey}` })
    }

    const systemPrompt = `${characterPrompt} ${AI_CONFIG.WORD_LIMIT_INSTRUCTION}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: AI_CONFIG.TOKEN_LIMIT,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content || "I need to think more about this."

    // Return in both formats for compatibility
    return res.status(200).json({
      content: response, // New format
      response: response, // Old format
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return res.status(500).json({ error: "Failed to generate response" })
  }
}
