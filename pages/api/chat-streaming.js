import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { messages, character } = req.body

    // Set up streaming response
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked",
    })

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: `You are ${character}. Respond in character.` }, ...messages],
      stream: true,
      max_tokens: 500,
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
    res.write(JSON.stringify({ type: "error", content: error.message }) + "\n")
    res.end()
  }
}
