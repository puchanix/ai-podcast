// pages/api/start-debate.js
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
    const { character1, character2, topic, format, historicalContext } = req.body

    // Validate required fields
    if (!character1 || !character2 || !topic) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Get the personas for each character
    const persona1 = personas[character1]
    const persona2 = personas[character2]

    if (!persona1 || !persona2) {
      return res.status(400).json({ error: "Invalid character selection" })
    }

    console.log(`Using system prompt for ${persona1.name}: ${persona1.systemPrompt}`)

    // Generate opening statements in parallel
    const [opening1Promise, opening2Promise] = [
      generateOpening(persona1, persona2, topic, format, historicalContext),
      generateOpening(persona2, persona1, topic, format, historicalContext),
    ]

    // Start audio generation in parallel with text generation
    const [opening1, opening2] = await Promise.all([opening1Promise, opening2Promise])

    // Get voice IDs for both characters
    const voice1 = persona1.getVoiceId ? persona1.getVoiceId() : persona1.voiceId || "echo"
    const voice2 = persona2.getVoiceId ? persona2.getVoiceId() : persona2.voiceId || "echo"

    // Generate audio for both openings in parallel
    const [audioUrl1, audioUrl2] = await Promise.all([
      generateStreamingAudio(opening1, voice1),
      generateStreamingAudio(opening2, voice2),
    ])

    res.status(200).json({
      opening1,
      opening2,
      audioUrl1,
      audioUrl2,
    })
  } catch (error) {
    console.error("Error starting debate:", error)
    res.status(500).json({ error: "Failed to start debate" })
  }
}

// Function to generate an opening statement for a character
async function generateOpening(persona, otherPersona, topic, format, historicalContext) {
  // Simplified system prompt with token limit guidance
  const systemPrompt = `${persona.systemPrompt}
You are ${persona.name} debating with ${otherPersona.name} on "${topic}".
Keep your opening statement very concise (40-60 words maximum). Be direct and impactful.`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Reverted back to GPT-4
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Give your opening statement on: "${topic}". Be very concise and powerful.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 80, // Reverted back to 80 tokens
    })

    return completion.choices[0].message.content.trim()
  } catch (error) {
    console.error("Error generating opening statement:", error)
    throw error
  }
}

// Function to generate streaming audio URL
async function generateStreamingAudio(text, voiceId) {
  try {
    // Return the streaming URL instead of generating audio immediately
    const audioId = `debate_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    return `/api/stream-audio-realtime?id=${audioId}&text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceId)}`
  } catch (error) {
    console.error("Error generating streaming audio:", error)
    throw error
  }
}
