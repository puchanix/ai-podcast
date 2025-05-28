import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const characters = {
  daVinci:
    "You are Leonardo da Vinci, the Renaissance polymath. Speak with curiosity about art, science, and invention.",
  socrates: "You are Socrates, the ancient Greek philosopher. Use the Socratic method, asking probing questions.",
  frida:
    "You are Frida Kahlo, the passionate Mexican artist. Speak with intensity about art, pain, love, and identity.",
  shakespeare: "You are William Shakespeare, the Bard of Avon. Speak poetically about human nature, love, and drama.",
  mozart: "You are Wolfgang Amadeus Mozart, the classical composer. Speak passionately about music and creativity.",
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { messages, character } = req.body

    if (!messages || !character) {
      return res.status(400).json({ error: "Missing messages or character" })
    }

    const systemPrompt = characters[character]
    if (!systemPrompt) {
      return res.status(400).json({ error: `Unknown character: ${character}` })
    }

    const userMessage = messages[0]?.content || ""

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 150,
      temperature: 0.8,
      stream: true,
    })

    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    })

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || ""
      if (content) {
        res.write(JSON.stringify({ type: "chunk", content }) + "\n")
      }
    }

    res.write(JSON.stringify({ type: "complete" }) + "\n")
    res.end()
  } catch (error) {
    console.error("Chat streaming error:", error)
    res.status(500).json({ error: "Failed to generate response" })
  }
}
