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
    const { character1, character2, currentMessages, topic, format, historicalContext, isPreparing, voice1, voice2 } =
      req.body

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

    // Determine which exchange this is
    const exchangeCount = Math.floor(currentMessages.length / 2) + 1

    // Generate both responses in parallel
    const [response1Promise, response2Promise] = await Promise.all([
      generateResponse(persona1, persona2, currentMessages, topic, format, historicalContext, exchangeCount),
      generateResponse(persona2, persona1, currentMessages, topic, format, historicalContext, exchangeCount),
    ])

    const response1 = await response1Promise
    const response2 = await response2Promise

    // Use provided voices or fall back to persona voices
    const finalVoice1 = voice1 || (persona1.getVoiceId ? persona1.getVoiceId() : persona1.voiceId || "echo")
    const finalVoice2 = voice2 || (persona2.getVoiceId ? persona2.getVoiceId() : persona2.voiceId || "echo")

    console.log(`Using voices for auto-continue: ${character1}=${finalVoice1}, ${character2}=${finalVoice2}`)

    // Generate audio for both responses in parallel
    const [audioUrl1Promise, audioUrl2Promise] = await Promise.all([
      generateAudio(response1, finalVoice1),
      generateAudio(response2, finalVoice2),
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
async function generateResponse(
  persona,
  otherPersona,
  currentMessages,
  topic,
  format,
  historicalContext,
  exchangeCount,
) {
  // Use GPT-4 for better quality responses
  const model = "gpt-4"

  try {
    // Create a system prompt that encourages concise responses
    const systemPrompt = `${persona.systemPrompt}
You are participating in a debate with ${otherPersona.name} on the topic of "${topic}".
Keep your response concise (100-150 words) but insightful.
This is exchange #${exchangeCount} in the debate.
Respond directly to the points made by ${otherPersona.name} in their last statement.`

    // Create a prompt from the current messages
    let prompt = `The debate topic is: "${topic}"\n\n`

    // Add the last few messages for context (to keep the prompt shorter)
    const relevantMessages = currentMessages.slice(-4)
    for (const msg of relevantMessages) {
      if (msg.character === "user") {
        prompt += `Question from audience: ${msg.content}\n\n`
      } else {
        const speakerName = msg.character === persona.id ? persona.name : otherPersona.name
        prompt += `${speakerName}: ${msg.content}\n\n`
      }
    }

    prompt += `Now, ${persona.name}, provide your response:`

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    })

    // Ensure we have a valid response
    if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      throw new Error("Invalid response from OpenAI API")
    }

    return completion.choices[0].message.content.trim() || "I'm sorry, I don't have a response at this time."
  } catch (error) {
    console.error("Error generating response:", error)
    // Return a fallback response instead of throwing
    return `As ${persona.name}, I would address this topic, but I'm having trouble formulating my thoughts at the moment.`
  }
}

// Function to generate audio for a response
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
