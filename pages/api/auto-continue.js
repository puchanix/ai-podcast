import OpenAI from "openai"
import { NextResponse } from "next/server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const characters = {
  daVinci:
    "You are Leonardo da Vinci, the great Renaissance polymath. Speak with curiosity about art, science, and invention.",
  socrates: "You are Socrates, the ancient Greek philosopher. Use the Socratic method, asking probing questions.",
  frida:
    "You are Frida Kahlo, the passionate Mexican artist. Speak with intensity about art, pain, love, and identity.",
  shakespeare:
    "You are William Shakespeare, the Bard of Avon. Speak poetically but accessibly about human nature, love, and drama.",
  mozart:
    "You are Wolfgang Amadeus Mozart, the classical composer. Speak passionately about music, creativity, and artistic expression.",
}

export async function POST(request) {
  try {
    const { character1, character2, currentMessages, topic } = await request.json()

    if (!character1 || !character2 || !topic || !currentMessages) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Build conversation context
    const conversationContext = currentMessages.map((msg) => `${msg.character}: ${msg.content}`).join("\n\n")

    // Generate next responses for both characters
    const [response1, response2] = await Promise.all([
      generateResponse(character1, character2, topic, conversationContext),
      generateResponse(character2, character1, topic, conversationContext),
    ])

    return NextResponse.json({
      response1,
      response2,
    })
  } catch (error) {
    console.error("Auto-continue API error:", error)
    return NextResponse.json({ error: "Failed to continue debate" }, { status: 500 })
  }
}

async function generateResponse(character, opponent, topic, context) {
  const systemPrompt = characters[character]

  const prompt = `You are continuing a debate about "${topic}" with ${opponent}. 
  
Previous conversation:
${context}

Give your next response in 2-3 sentences. Stay true to your character and respond to the previous points made.`

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    max_tokens: 200,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content || "I need to think more about this."
}
