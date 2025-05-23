// pages/api/auto-continue.js
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
    const { character1, character2, currentMessages, topic, format, historicalContext } = req.body

    // Validate required fields
    if (!character1 || !character2 || !currentMessages || !topic) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Get the personas for each character
    const persona1 = personas[character1]
    const persona2 = personas[character2]

    if (!persona1 || !persona2) {
      return res.status(400).json({ error: "Invalid character selection" })
    }

    // Generate responses for both characters
    const [response1Promise, response2Promise] = await Promise.all([
      generateResponse(persona1, persona2, currentMessages, topic, format, historicalContext),
      generateResponse(persona2, persona1, currentMessages, topic, format, historicalContext),
    ])

    const response1 = await response1Promise
    const response2 = await response2Promise

    // Get voice IDs for both characters
    const voice1 = persona1.getVoiceId ? persona1.getVoiceId() : persona1.voiceId || "echo"
    const voice2 = persona2.getVoiceId ? persona2.getVoiceId() : persona2.voiceId || "echo"

    // Generate audio for both responses in parallel
    const [audioUrl1Promise, audioUrl2Promise] = await Promise.all([
      generateAudio(response1, voice1),
      generateAudio(response2, voice2),
    ])

    const audioUrl1 = await audioUrl1Promise
    const audioUrl2 = await audioUrl2Promise

    res.status(200).json({
      response1,
      response2,
      audioUrl1,
      audioUrl2,
    })
  } catch (error) {
    console.error("Error continuing debate:", error)
    res.status(500).json({ error: "Failed to continue debate" })
  }
}

// Function to generate a response for a character
async function generateResponse(persona, otherPersona, currentMessages, topic, format, historicalContext) {
  // Build conversation context (last few messages only to save tokens)
  const recentMessages = currentMessages.slice(-4) // Only last 4 messages
  const conversationContext = recentMessages
    .map((msg) => {
      if (msg.character === "user") {
        return `Question: ${msg.content}`
      } else {
        const speaker = msg.character === persona.id ? persona.name : otherPersona.name
        return `${speaker}: ${msg.content}`
      }
    })
    .join("\n")

  const systemPrompt = `${persona.systemPrompt}
You are ${persona.name} in a debate with ${otherPersona.name} on "${topic}".
Keep your response very concise (40-60 words maximum). Be direct and engaging.

Recent conversation:
${conversationContext}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Continue the debate. Give your next response. Be very concise and impactful.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 80, // Reduced from 150 to 80
    })

    return completion.choices[0].message.content.trim()
  } catch (error) {
    console.error("Error generating response:", error)
    throw error
  }
}

// Function to generate audio for a statement
async function generateAudio(text, voiceId) {
  try {
    // Generate a unique ID for this audio file
    const audioId = `debate_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // Return the streaming URL
    return `/api/stream-audio?id=${audioId}&text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceId)}`
  } catch (error) {
    console.error("Error generating audio:", error)
    throw error
  }
}
