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

    // Get the personas for each character
    const persona1 = personas[character1]
    const persona2 = personas[character2]

    if (!persona1 || !persona2) {
      return res.status(400).json({ error: "Invalid character selection" })
    }

    // Use the character-specific system prompts from the personas object
    const systemPrompt1 = persona1.systemPrompt || `You are ${persona1.name}, responding to questions.`
    const systemPrompt2 = persona2.systemPrompt || `You are ${persona2.name}, responding to questions.`

    console.log(`Using system prompt for ${persona1.name}:`, systemPrompt1)
    console.log(`Using system prompt for ${persona2.name}:`, systemPrompt2)

    // Generate opening statement for character 1
    const opening1Completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `${systemPrompt1} You are participating in a debate on "${topic}". 
                    Give a thoughtful opening statement from your perspective. 
                    Keep your response concise (2-3 sentences).
                    ${historicalContext ? "Only use knowledge available during your lifetime." : ""}`,
        },
        {
          role: "user",
          content: `Give your opening statement on the topic of "${topic}".`,
        },
      ],
    })

    const opening1 = opening1Completion.choices[0].message.content.trim()

    // Generate opening statement for character 2
    const opening2Completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `${systemPrompt2} You are participating in a debate on "${topic}". 
                    Give a thoughtful opening statement from your perspective.
                    Keep your response concise (2-3 sentences).
                    ${historicalContext ? "Only use knowledge available during your lifetime." : ""}`,
        },
        {
          role: "user",
          content: `Give your opening statement on the topic of "${topic}".`,
        },
      ],
    })

    const opening2 = opening2Completion.choices[0].message.content.trim()

    // Generate audio for opening statements
    const audioUrl1 = `/api/stream-audio?id=debate_${character1}_${Date.now()}&text=${encodeURIComponent(opening1)}&voice=${encodeURIComponent(getVoiceForCharacter(character1))}`
    const audioUrl2 = `/api/stream-audio?id=debate_${character2}_${Date.now() + 1}&text=${encodeURIComponent(opening2)}&voice=${encodeURIComponent(getVoiceForCharacter(character2))}`

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

// Helper function to get the appropriate voice for a character
function getVoiceForCharacter(characterId) {
  // Default voice mapping
  const voiceMap = {
    daVinci: "en-US-Neural2-D",
    socrates: "en-US-Neural2-D",
    frida: "en-US-Neural2-F",
    shakespeare: "en-US-Neural2-D",
    mozart: "en-US-Neural2-D",
  }

  // Check if there's an environment variable for this character
  const envVoiceId = process.env[`${characterId.toUpperCase()}_VOICE_ID`]
  if (envVoiceId) {
    return envVoiceId
  }

  // Fall back to the default voice mapping
  return voiceMap[characterId] || "en-US-Neural2-D"
}
