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

    // Generate opening statements for both characters
    const [opening1Promise, opening2Promise] = await Promise.all([
      generateOpening(persona1, persona2, topic, format, historicalContext),
      generateOpening(persona2, persona1, topic, format, historicalContext),
    ])

    const opening1 = await opening1Promise
    const opening2 = await opening2Promise

    // Get voice IDs for both characters
    const voice1 = persona1.getVoiceId ? persona1.getVoiceId() : persona1.voiceId || "echo"
    const voice2 = persona2.getVoiceId ? persona2.getVoiceId() : persona2.voiceId || "echo"

    // Generate audio for both openings in parallel
    const [audioUrl1Promise, audioUrl2Promise] = await Promise.all([
      generateAudio(opening1, voice1),
      generateAudio(opening2, voice2),
    ])

    const audioUrl1 = await audioUrl1Promise
    const audioUrl2 = await audioUrl2Promise

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
  // Create a system prompt that includes the character's persona and debate context
  const systemPrompt = `${persona.systemPrompt}
You are participating in a debate with ${otherPersona.name} on the topic of "${topic}".
Keep your opening statement concise (100-150 words) but insightful.
${historicalContext ? `Speak from your historical perspective and knowledge.` : ""}
${
  format === "pointCounterpoint"
    ? "This debate will follow a point-counterpoint format. Present your initial position clearly."
    : format === "socratic"
      ? "This debate will follow a Socratic dialogue format. Ask thoughtful questions and present your views."
      : "Present your opening statement on this topic."
}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Using GPT-4 for better quality
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `You are ${persona.name}. Give your opening statement on the topic: "${topic}". Keep it concise but insightful.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    })

    return completion.choices[0].message.content.trim()
  } catch (error) {
    console.error("Error generating opening statement:", error)
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
