import OpenAI from "openai"
import { NextResponse } from "next/server"

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

export async function POST(request) {
  try {
    console.log("🔍 [AUTO-CONTINUE DEBUG] Auto-continue API called")
    const { character1, character2, currentMessages, topic } = await request.json()

    if (!character1 || !character2 || !topic || !currentMessages) {
      console.error("🔍 [AUTO-CONTINUE DEBUG] Missing required parameters:", {
        character1,
        character2,
        topic,
        currentMessages: !!currentMessages,
      })
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log("🔍 [AUTO-CONTINUE DEBUG] Generating responses for:", character1, "vs", character2)
    console.log("🔍 [AUTO-CONTINUE DEBUG] Topic:", topic)
    console.log("🔍 [AUTO-CONTINUE DEBUG] Current messages count:", currentMessages.length)

    // Build conversation context
    const conversationContext = currentMessages.map((msg) => `${msg.character}: ${msg.content}`).join("\n\n")
    console.log("🔍 [AUTO-CONTINUE DEBUG] Conversation context length:", conversationContext.length)

    // Generate next responses for both characters
    const [response1, response2] = await Promise.all([
      generateResponse(character1, character2, topic, conversationContext, currentMessages.length),
      generateResponse(character2, character1, topic, conversationContext, currentMessages.length),
    ])

    console.log("🔍 [AUTO-CONTINUE DEBUG] Generated response1 length:", response1.length)
    console.log("🔍 [AUTO-CONTINUE DEBUG] Generated response2 length:", response2.length)

    return NextResponse.json({
      response1,
      response2,
    })
  } catch (error) {
    console.error("🔍 [AUTO-CONTINUE DEBUG] Auto-continue API error:", error)
    return NextResponse.json({ error: "Failed to continue debate" }, { status: 500 })
  }
}

async function generateResponse(character, opponent, topic, context, messageCount) {
  const systemPrompt = characters[character]

  if (!systemPrompt) {
    console.error("🔍 [AUTO-CONTINUE DEBUG] No system prompt found for character:", character)
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

Give your next response in 2-3 sentences. Stay true to your character, respond to the previous points made, and advance the debate. Be engaging and passionate about your position.`

  console.log("🔍 [AUTO-CONTINUE DEBUG] Generating response for", character, "at stage:", stagePrompt)

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.8, // Slightly higher for more varied responses
    })

    const response = completion.choices[0]?.message?.content || "I need to think more about this."
    console.log("🔍 [AUTO-CONTINUE DEBUG] Generated response for", character, ":", response.substring(0, 100) + "...")
    return response
  } catch (error) {
    console.error("🔍 [AUTO-CONTINUE DEBUG] Error generating response for", character, ":", error)
    throw error
  }
}
