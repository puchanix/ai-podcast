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
    const { character1, character2, currentMessages, topic } = req.body

    // Validation
    if (
      !character1 ||
      !character2 ||
      !topic ||
      !currentMessages ||
      !Array.isArray(currentMessages) ||
      currentMessages.length === 0
    ) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    // Check if characters exist in our character definitions
    if (!characterPrompts[character1] || !characterPrompts[character2]) {
      return res.status(400).json({ error: "Unknown character" })
    }

    // Build conversation context
    const conversationContext = currentMessages.map((msg) => `${msg.character}: ${msg.content}`).join("\n\n")

    // Generate next responses for both characters
    const [response1, response2] = await Promise.all([
      generateResponse(character1, character2, topic, conversationContext, currentMessages.length),
      generateResponse(character2, character1, topic, conversationContext, currentMessages.length),
    ])

    return res.status(200).json({
      response1,
      response2,
    })
  } catch (error) {
    console.error("Auto-continue API error:", error)
    return res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

async function generateResponse(character, opponent, topic, context, messageCount) {
  const systemPrompt = characterPrompts[character]

  if (!systemPrompt) {
    throw new Error(`Unknown character: ${character}`)
  }

  // Determine the stage of debate based on message count
  let stagePrompt = ""
  if (messageCount <= 2) {
    stagePrompt = "This is the opening round. Present your initial position clearly and passionately."
  } else if (messageCount <= 4) {
    stagePrompt = "This is the second round. Respond to your opponent's points and strengthen your argument."
  } else if (messageCount <= 6) {
    stagePrompt = "This is the third round. Challenge your opponent's logic and present new evidence."
  } else {
    stagePrompt = "This is the final round. Make your strongest closing argument."
  }

  const prompt = `You are continuing a debate about "${topic}" with ${opponent}. 

${stagePrompt}

Previous conversation:
${context}

Give your next response in 2-3 sentences. Stay true to your character, respond to the previous points made, and advance the debate. Be engaging and passionate about your position. ${AI_CONFIG.WORD_LIMIT_INSTRUCTION}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: AI_CONFIG.TOKEN_LIMIT,
      temperature: 0.8,
    })

    const response = completion.choices[0]?.message?.content || "I need to think more about this."
    return response
  } catch (error) {
    console.error(`OpenAI error for ${character}:`, error)
    throw error
  }
}
