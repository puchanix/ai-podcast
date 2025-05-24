import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const characters = {
  daVinci:
    "You are Leonardo da Vinci, the great Renaissance polymath. Speak with curiosity about art, science, and invention. Be passionate but thoughtful. Keep responses very concise and direct.",
  socrates:
    "You are Socrates, the ancient Greek philosopher. Use the Socratic method, asking probing questions. Be wise but humble. Keep responses very concise and direct.",
  frida:
    "You are Frida Kahlo, the passionate Mexican artist. Speak with intensity about art, pain, love, and identity. Be bold and emotional. Keep responses very concise and direct.",
  shakespeare:
    "You are William Shakespeare, the Bard of Avon. Speak poetically but accessibly about human nature, love, and drama. Be eloquent. Keep responses very concise and direct.",
  mozart:
    "You are Wolfgang Amadeus Mozart, the classical composer. Speak passionately about music, creativity, and artistic expression. Be energetic. Keep responses very concise and direct.",
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { messages, character, message, persona } = req.body
    const characterKey = character || persona
    const userMessage = message || (messages && messages[0]?.content)

    if (!characterKey || !userMessage) {
      return res.status(400).json({ error: "Missing character or message" })
    }

    const systemPrompt = characters[characterKey]
    if (!systemPrompt) {
      return res.status(400).json({ error: `Unknown character: ${characterKey}` })
    }

    // Set up streaming response
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    })

    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 80,
      temperature: 0.7,
      stream: true,
    })

    let accumulatedText = ""
    let wordCount = 0
    const CHUNK_SIZE = 15 // Send chunk after 15 words

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ""
      if (content) {
        accumulatedText += content
        wordCount += content.split(" ").length - 1

        // Send chunk when we have enough words or hit sentence boundary
        if (wordCount >= CHUNK_SIZE || content.includes(".") || content.includes("!") || content.includes("?")) {
          res.write(
            JSON.stringify({
              type: "chunk",
              content: accumulatedText.trim(),
              isComplete: false,
            }) + "\n",
          )

          accumulatedText = ""
          wordCount = 0
        }
      }
    }

    // Send final chunk
    if (accumulatedText.trim()) {
      res.write(
        JSON.stringify({
          type: "chunk",
          content: accumulatedText.trim(),
          isComplete: false,
        }) + "\n",
      )
    }

    // Send completion signal
    res.write(
      JSON.stringify({
        type: "complete",
        content: "",
        isComplete: true,
      }) + "\n",
    )

    res.end()
  } catch (error) {
    console.error("Streaming chat error:", error)
    res.write(
      JSON.stringify({
        type: "error",
        content: error.message,
        isComplete: true,
      }) + "\n",
    )
    res.end()
  }
}
