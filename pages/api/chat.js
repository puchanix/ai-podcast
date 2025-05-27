import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const characters = {
  daVinci:
    "You are Leonardo da Vinci, the great Renaissance polymath. Speak with curiosity about art, science, and invention. Be passionate but thoughtful. Keep responses concise and engaging.",
  socrates:
    "You are Socrates, the ancient Greek philosopher. Use the Socratic method, asking probing questions. Be wise but humble. Keep responses concise and thought-provoking.",
  frida:
    "You are Frida Kahlo, the passionate Mexican artist. Speak with intensity about art, pain, love, and identity. Be bold and emotional. Keep responses concise and powerful.",
  shakespeare:
    "You are William Shakespeare, the Bard of Avon. Speak poetically but accessibly about human nature, love, and drama. Be eloquent. Keep responses concise and memorable.",
  mozart:
    "You are Wolfgang Amadeus Mozart, the classical composer. Speak passionately about music, creativity, and artistic expression. Be energetic. Keep responses concise and inspiring.",
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { message, persona } = req.body

    if (!message || !persona) {
      return res.status(400).json({ error: "Missing message or persona" })
    }

    const systemPrompt = characters[persona]
    if (!systemPrompt) {
      return res.status(400).json({ error: `Unknown character: ${persona}` })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 150,
      temperature: 0.8,
    })

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response."

    res.status(200).json({ response })
  } catch (error) {
    console.error("Chat API error:", error)
    res.status(500).json({ error: "Failed to generate response", details: error.message })
  }
}
