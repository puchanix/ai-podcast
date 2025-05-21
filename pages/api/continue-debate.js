// pages/api/continue-debate.js
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
    const { character1, character2, userQuestion, currentMessages, format, historicalContext } = req.body

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

    // Format previous messages for context
    let debateContext = ""
    currentMessages.forEach((msg) => {
      if (msg.character === "user") {
        debateContext += `Question: ${msg.content}\n\n`
      } else if (msg.character === character1) {
        debateContext += `${persona1.name}: ${msg.content}\n\n`
      } else if (msg.character === character2) {
        debateContext += `${persona2.name}: ${msg.content}\n\n`
      }
    })

    // Generate response for character 1
    const response1Completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `${systemPrompt1} You are participating in a debate.
                    Here is the context of the debate so far:
                    ${debateContext}
                    
                    A user has asked: "${userQuestion}"
                    
                    Respond to this question from your unique perspective and knowledge.
                    Keep your response concise (2-3 sentences).
                    ${historicalContext ? "Only use knowledge available during your lifetime." : ""}`,
        },
        {
          role: "user",
          content: `How would you, ${persona1.name}, respond to the question: "${userQuestion}"?`,
        },
      ],
    })

    const response1 = response1Completion.choices[0].message.content.trim()

    // Generate response for character 2
    const response2Completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `${systemPrompt2} You are participating in a debate.
                    Here is the context of the debate so far:
                    ${debateContext}
                    
                    A user has asked: "${userQuestion}"
                    ${persona1.name} responded: "${response1}"
                    
                    Respond to both the question and ${persona1.name}'s response from your unique perspective.
                    Keep your response concise (2-3 sentences).
                    ${historicalContext ? "Only use knowledge available during your lifetime." : ""}`,
        },
        {
          role: "user",
          content: `How would you, ${persona2.name}, respond to the question: "${userQuestion}" and to ${persona1.name}'s response: "${response1}"?`,
        },
      ],
    })

    const response2 = response2Completion.choices[0].message.content.trim()

    // Generate audio for responses
    const audioUrl1 = `/api/stream-audio?id=debate_${character1}_${Date.now()}&text=${encodeURIComponent(response1)}&voice=${encodeURIComponent(getVoiceForCharacter(character1))}`
    const audioUrl2 = `/api/stream-audio?id=debate_${character2}_${Date.now() + 1}&text=${encodeURIComponent(response2)}&voice=${encodeURIComponent(getVoiceForCharacter(character2))}`

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
