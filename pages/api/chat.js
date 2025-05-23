import { OpenAI } from "openai"
import { personas } from "../../lib/personas"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { message, persona } = req.body

  if (!message || !persona) {
    return res.status(400).json({ error: "Message and persona are required" })
  }

  const selectedPersona = personas[persona]
  if (!selectedPersona) {
    return res.status(400).json({ error: "Invalid persona" })
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Reverted back to GPT-4
      messages: [
        {
          role: "system",
          content:
            selectedPersona.systemPrompt + " Keep your responses concise and engaging, around 60-80 words maximum.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 100, // Reverted back to 100 tokens
      temperature: 0.7,
    })

    const response = completion.choices[0].message.content

    res.status(200).json({ response })
  } catch (error) {
    console.error("Error generating response:", error)
    res.status(500).json({ error: "Failed to generate response" })
  }
}
