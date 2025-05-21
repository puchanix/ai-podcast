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
    console.log("Auto-continue API called with data:", JSON.stringify(req.body, null, 2))

    const { character1, character2, currentMessages, topic, format, historicalContext } = req.body

    // Validate required fields
    if (!character1 || !character2 || !currentMessages || !topic) {
      console.error("Missing required fields:", { character1, character2, currentMessages: !!currentMessages, topic })
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Get the personas for each character
    const persona1 = personas[character1]
    const persona2 = personas[character2]

    if (!persona1 || !persona2) {
      console.error("Invalid character selection:", {
        character1,
        character2,
        persona1: !!persona1,
        persona2: !!persona2,
      })
      return res.status(400).json({ error: "Invalid character selection" })
    }

    // Use the character-specific system prompts from the personas object
    const systemPrompt1 = persona1.systemPrompt || `You are ${persona1.name}, responding to questions.`
    const systemPrompt2 = persona2.systemPrompt || `You are ${persona2.name}, responding to questions.`

    console.log(`Using system prompt for ${persona1.name}:`, systemPrompt1)
    console.log(`Using system prompt for ${persona2.name}:`, systemPrompt2)

    // Format previous messages for context
    let debateContext = `Topic: ${topic}\n\n`

    if (!Array.isArray(currentMessages)) {
      console.error("currentMessages is not an array:", currentMessages)
      return res.status(400).json({ error: "currentMessages must be an array" })
    }

    currentMessages.forEach((msg) => {
      if (msg.character === "user") {
        debateContext += `Question: ${msg.content}\n\n`
      } else if (msg.character === character1) {
        debateContext += `${persona1.name}: ${msg.content}\n\n`
      } else if (msg.character === character2) {
        debateContext += `${persona2.name}: ${msg.content}\n\n`
      }
    })

    // Get the last speaker
    const lastMessage = currentMessages[currentMessages.length - 1]
    if (!lastMessage) {
      console.error("No messages in currentMessages array")
      return res.status(400).json({ error: "No messages to continue from" })
    }

    const lastSpeaker = lastMessage.character

    // Determine who speaks first in this round
    const firstSpeaker = lastSpeaker === character1 ? character2 : character1
    const secondSpeaker = firstSpeaker === character1 ? character2 : character1

    // Get personas for first and second speakers
    const firstPersona = firstSpeaker === character1 ? persona1 : persona2
    const secondPersona = secondSpeaker === character1 ? persona1 : persona2

    // Get system prompts for first and second speakers
    const firstSystemPrompt = firstSpeaker === character1 ? systemPrompt1 : systemPrompt2
    const secondSystemPrompt = secondSpeaker === character1 ? systemPrompt1 : systemPrompt2

    console.log("Generating response for first speaker:", firstSpeaker)

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set")
      return res.status(500).json({ error: "OpenAI API key is not configured" })
    }

    // Generate response for first speaker
    let response1
    try {
      const response1Completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `${firstSystemPrompt} You are participating in a debate on "${topic}".
                      Here is the context of the debate so far:
                      ${debateContext}
                      
                      Continue the debate by responding to the previous points.
                      Keep your response concise (2-3 sentences).
                      ${historicalContext ? "Only use knowledge available during your lifetime." : ""}`,
          },
          {
            role: "user",
            content: `As ${firstPersona.name}, continue the debate on "${topic}" by responding to the previous points.`,
          },
        ],
      })

      response1 = response1Completion.choices[0].message.content.trim()
      console.log("First speaker response generated:", response1.substring(0, 50) + "...")
    } catch (error) {
      console.error("Error generating first speaker response:", error)
      return res.status(500).json({
        error: "Failed to generate first speaker response",
        details: error.message,
      })
    }

    console.log("Generating response for second speaker:", secondSpeaker)

    // Generate response for second speaker
    let response2
    try {
      const response2Completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `${secondSystemPrompt} You are participating in a debate on "${topic}".
                      Here is the context of the debate so far:
                      ${debateContext}
                      
                      ${firstPersona.name} just said: "${response1}"
                      
                      Continue the debate by responding to ${firstPersona.name}'s points.
                      Keep your response concise (2-3 sentences).
                      ${historicalContext ? "Only use knowledge available during your lifetime." : ""}`,
          },
          {
            role: "user",
            content: `As ${secondPersona.name}, respond to ${firstPersona.name}'s statement: "${response1}"`,
          },
        ],
      })

      response2 = response2Completion.choices[0].message.content.trim()
      console.log("Second speaker response generated:", response2.substring(0, 50) + "...")
    } catch (error) {
      console.error("Error generating second speaker response:", error)
      return res.status(500).json({
        error: "Failed to generate second speaker response",
        details: error.message,
      })
    }

    // Map responses back to character1 and character2 format
    const responseMap = {
      [firstSpeaker]: response1,
      [secondSpeaker]: response2,
    }

    // Generate audio URLs
    const audioUrl1 = `/api/stream-audio?id=debate_${character1}_${Date.now()}&text=${encodeURIComponent(responseMap[character1])}&voice=${encodeURIComponent(getVoiceForCharacter(character1))}`
    const audioUrl2 = `/api/stream-audio?id=debate_${character2}_${Date.now() + 1}&text=${encodeURIComponent(responseMap[character2])}&voice=${encodeURIComponent(getVoiceForCharacter(character2))}`

    console.log("Auto-continue API completed successfully")

    res.status(200).json({
      response1: responseMap[character1],
      response2: responseMap[character2],
      audioUrl1,
      audioUrl2,
    })
  } catch (error) {
    console.error("Error in auto-continue API:", error)
    res.status(500).json({
      error: "Failed to continue debate",
      details: error.message,
      stack: error.stack,
    })
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
