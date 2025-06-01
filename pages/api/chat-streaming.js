import { OpenAI } from "openai"
import { personas } from "../../lib/personas"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { messages, character } = req.body

  if (!messages || !character) {
    return res.status(400).json({ error: "Messages and character are required" })
  }

  const selectedPersona = personas[character]
  if (!selectedPersona) {
    return res.status(400).json({ error: "Invalid character" })
  }

  try {
    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
    })

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: selectedPersona.systemPrompt + " Keep your responses concise and engaging.",
        },
        ...messages,
      ],
      max_tokens: 150,
      temperature: 0.7,
      stream: true,
    })

    let fullResponse = ""

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || ""
      if (content) {
        fullResponse += content
        res.write(JSON.stringify({ type: "chunk", content }) + "\n")
      }
    }

    res.write(JSON.stringify({ type: "complete", content: fullResponse }) + "\n")
    res.end()

  } catch (error) {
    console.error("Error in chat streaming:", error)
    res.write(JSON.stringify({ type: "error", content: error.message }) + "\n")
    res.end()
  }
}