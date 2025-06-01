import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const characters = {
  daVinci:
    "You are Leonardo da Vinci, the great Renaissance polymath. Speak with curiosity about art, science, and invention. Be passionate but thoughtful.",
  socrates:
    "You are Socrates, the ancient Greek philosopher. Use the Socratic method, asking probing questions. Be wise but humble.",
  frida:
    "You are Frida Kahlo, the passionate Mexican artist. Speak with intensity about art, pain, love, and identity. Be bold and emotional.",
  shakespeare:
    "You are William Shakespeare, the Bard of Avon. Speak poetically but accessibly about human nature, love, and drama. Be eloquent.",
  mozart:
    "You are Wolfgang Amadeus Mozart, the classical composer. Speak passionately about music, creativity, and artistic expression. Be energetic.",
}

export default async function handler(req, res) {
  console.log("🔍 [AUTO-CONTINUE API] Request received")
  console.log("🔍 [AUTO-CONTINUE API] Method:", req.method)
  console.log("🔍 [AUTO-CONTINUE API] Headers:", req.headers)
  console.log("🔍 [AUTO-CONTINUE API] Body:", req.body)

  if (req.method !== "POST") {
    console.error("🔍 [AUTO-CONTINUE API] Wrong method:", req.method)
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { character1, character2, currentMessages, topic } = req.body

    console.log("🔍 [AUTO-CONTINUE API] Extracted parameters:")
    console.log("🔍 [AUTO-CONTINUE API] - character1:", character1)
    console.log("🔍 [AUTO-CONTINUE API] - character2:", character2)
    console.log("🔍 [AUTO-CONTINUE API] - topic:", topic)
    console.log("🔍 [AUTO-CONTINUE API] - currentMessages type:", typeof currentMessages)
    console.log("🔍 [AUTO-CONTINUE API] - currentMessages length:", currentMessages?.length)
    console.log("🔍 [AUTO-CONTINUE API] - currentMessages content:", currentMessages)

    // Detailed validation
    if (!character1) {
      console.error("🔍 [AUTO-CONTINUE API] Missing character1")
      return res.status(400).json({ error: "Missing character1" })
    }
    if (!character2) {
      console.error("🔍 [AUTO-CONTINUE API] Missing character2")
      return res.status(400).json({ error: "Missing character2" })
    }
    if (!topic) {
      console.error("🔍 [AUTO-CONTINUE API] Missing topic")
      return res.status(400).json({ error: "Missing topic" })
    }
    if (!currentMessages) {
      console.error("🔍 [AUTO-CONTINUE API] Missing currentMessages")
      return res.status(400).json({ error: "Missing currentMessages" })
    }
    if (!Array.isArray(currentMessages)) {
      console.error("🔍 [AUTO-CONTINUE API] currentMessages is not an array:", typeof currentMessages)
      return res.status(400).json({ error: "currentMessages must be an array" })
    }
    if (currentMessages.length === 0) {
      console.error("🔍 [AUTO-CONTINUE API] currentMessages is empty")
      return res.status(400).json({ error: "currentMessages cannot be empty" })
    }

    console.log("🔍 [AUTO-CONTINUE API] All validations passed")

    // Check if characters exist in our character definitions
    if (!characters[character1]) {
      console.error("🔍 [AUTO-CONTINUE API] Unknown character1:", character1)
      return res.status(400).json({ error: `Unknown character: ${character1}` })
    }
    if (!characters[character2]) {
      console.error("🔍 [AUTO-CONTINUE API] Unknown character2:", character2)
      return res.status(400).json({ error: `Unknown character: ${character2}` })
    }

    console.log("🔍 [AUTO-CONTINUE API] Characters validated successfully")

    // Build conversation context
    const conversationContext = currentMessages
      .map((msg, index) => {
        console.log(`🔍 [AUTO-CONTINUE API] Message ${index}:`, msg)
        return `${msg.character}: ${msg.content}`
      })
      .join("\n\n")

    console.log("🔍 [AUTO-CONTINUE API] Conversation context built:")
    console.log("🔍 [AUTO-CONTINUE API] Context length:", conversationContext.length)
    console.log("🔍 [AUTO-CONTINUE API] Context preview:", conversationContext.substring(0, 200) + "...")

    // Generate next responses for both characters
    console.log("🔍 [AUTO-CONTINUE API] Starting response generation...")

    const [response1, response2] = await Promise.all([
      generateResponse(character1, character2, topic, conversationContext, currentMessages.length),
      generateResponse(character2, character1, topic, conversationContext, currentMessages.length),
    ])

    console.log("🔍 [AUTO-CONTINUE API] Responses generated successfully")
    console.log("🔍 [AUTO-CONTINUE API] Response1 length:", response1.length)
    console.log("🔍 [AUTO-CONTINUE API] Response2 length:", response2.length)
    console.log("🔍 [AUTO-CONTINUE API] Response1 preview:", response1.substring(0, 100) + "...")
    console.log("🔍 [AUTO-CONTINUE API] Response2 preview:", response2.substring(0, 100) + "...")

    const result = {
      response1,
      response2,
    }

    console.log("🔍 [AUTO-CONTINUE API] Sending successful response")
    return res.status(200).json(result)
  } catch (error) {
    console.error("🔍 [AUTO-CONTINUE API] Caught error:", error)
    console.error("🔍 [AUTO-CONTINUE API] Error stack:", error.stack)
    return res.status(500).json({ error: "Internal server error: " + error.message })
  }
}

async function generateResponse(character, opponent, topic, context, messageCount) {
  console.log(`🔍 [AUTO-CONTINUE API] Generating response for ${character}`)
  console.log(`🔍 [AUTO-CONTINUE API] - opponent: ${opponent}`)
  console.log(`🔍 [AUTO-CONTINUE API] - topic: ${topic}`)
  console.log(`🔍 [AUTO-CONTINUE API] - messageCount: ${messageCount}`)

  const systemPrompt = characters[character]

  if (!systemPrompt) {
    console.error("🔍 [AUTO-CONTINUE API] No system prompt found for character:", character)
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

Give your next response in 1 sentence. Stay true to your character, respond to the previous points made, and advance the debate. Be engaging and passionate about your position.`

  console.log(`🔍 [AUTO-CONTINUE API] Generated prompt for ${character}:`, prompt.substring(0, 200) + "...")

  try {
    console.log(`🔍 [AUTO-CONTINUE API] Calling OpenAI for ${character}`)
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 30, // Reduced from 50 to 30 for easier testing
      temperature: 0.8,
    })

    const response = completion.choices[0]?.message?.content || "I need to think more about this."
    console.log(`🔍 [AUTO-CONTINUE API] OpenAI response for ${character}:`, response)
    return response
  } catch (error) {
    console.error(`🔍 [AUTO-CONTINUE API] OpenAI error for ${character}:`, error)
    throw error
  }
}
