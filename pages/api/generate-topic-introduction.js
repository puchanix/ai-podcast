// pages/api/generate-topic-introduction.js
import OpenAI from "openai"
import { personas } from "../../lib/personas"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { topic, character1, character2 } = req.body

    // Validate required fields
    if (!topic || !character1 || !character2) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Get the personas for each character
    const persona1 = personas[character1]
    const persona2 = personas[character2]

    if (!persona1 || !persona2) {
      return res.status(400).json({ error: "Invalid character selection" })
    }

    // Generate a neutral introduction for the topic
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a knowledgeable debate moderator introducing a debate between ${persona1.name} and ${persona2.name} on the topic of "${topic}". Create a brief, engaging introduction that sets the stage for their debate.`,
        },
        {
          role: "user",
          content: `Write a brief introduction (2-3 sentences) for a debate between ${persona1.name} and ${persona2.name} on the topic of "${topic}". The introduction should be neutral, informative, and set the context for why this topic is interesting for these two historical figures to debate.`,
        },
      ],
    })

    const introduction = completion.choices[0].message.content.trim()

    // Generate audio for the introduction
    const audioUrl = `/api/stream-audio?id=intro_${Date.now()}&text=${encodeURIComponent(introduction)}&voice=${encodeURIComponent(process.env.ELEVENLABS_VOICE_ID || "en-US-Neural2-D")}`

    res.status(200).json({
      introduction,
      audioUrl,
    })
  } catch (error) {
    console.error("Error generating topic introduction:", error)
    res.status(500).json({ error: "Failed to generate topic introduction" })
  }
}
