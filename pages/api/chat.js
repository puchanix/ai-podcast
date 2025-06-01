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

    const systemPrompt = characters[characterKey]
    if (!systemPrompt) {
      return res.status(400).json({ error: `Unknown character: ${characterKey}` })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 50,
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
