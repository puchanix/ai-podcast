// pages/api/start-debate.js
import { characters } from "../../data/characters"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const config = {
  runtime: "nodejs",
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { character1, character2, topic, format, historicalContext } = req.body

    // Get character details
    const char1 = characters.find((c) => c.id === character1)
    const char2 = characters.find((c) => c.id === character2)

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // Generate opening statements for both characters
    const contextPrompt = historicalContext
      ? `Respond as if you only have knowledge available during your lifetime. Do not reference events, discoveries, or concepts that occurred after your death.`
      : `You can reference modern events and discoveries even if they occurred after your lifetime.`

    const formatPrompt = getFormatPrompt(format)

    // Generate opening statement for character 1
    const { text: opening1 } = await generateText({
      model: openai("gpt-4o"),
      prompt: `You are ${char1.name}. ${char1.systemPrompt}
      
      ${contextPrompt}
      
      ${formatPrompt}
      
      The topic of debate is: "${topic}"
      
      Provide your opening statement on this topic. Be true to your historical character, beliefs, and speaking style.
      Keep your response concise, under 75 words.`,
      temperature: 0.7,
      maxTokens: 200,
    })

    // Generate opening statement for character 2
    const { text: opening2 } = await generateText({
      model: openai("gpt-4o"),
      prompt: `You are ${char2.name}. ${char2.systemPrompt}
      
      ${contextPrompt}
      
      ${formatPrompt}
      
      The topic of debate is: "${topic}"
      
      Your debate opponent, ${char1.name}, has made the following opening statement:
      "${opening1}"
      
      Provide your opening statement on this topic, responding to some points made by ${char1.name} if appropriate.
      Be true to your historical character, beliefs, and speaking style.
      Keep your response concise, under 75 words.`,
      temperature: 0.7,
      maxTokens: 200,
    })

    return res.status(200).json({ opening1, opening2 })
  } catch (error) {
    console.error("Error starting debate:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

function getFormatPrompt(format) {
  switch (format) {
    case "pointCounterpoint":
      return "This is a formal point/counterpoint debate. Make clear, structured arguments with evidence."
    case "moderated":
      return "This is a moderated debate. Address the topic directly and be prepared to respond to questions."
    case "freeform":
      return "This is a free-flowing conversation. Speak naturally as you would in a discussion with a peer."
    default:
      return "Present your perspective on the topic clearly and concisely."
  }
}