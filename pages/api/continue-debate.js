// pages/api/continue-debate.js
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
    const { character1, character2, userQuestion, currentMessages, format, historicalContext } = req.body

    // Get character details
    const char1 = characters.find((c) => c.id === character1)
    const char2 = characters.find((c) => c.id === character2)

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // Format previous conversation for context
    const conversationContext = formatConversationContext(currentMessages, char1, char2)

    // Context prompt based on historical setting
    const contextPrompt = historicalContext
      ? `Respond as if you only have knowledge available during your lifetime. Do not reference events, discoveries, or concepts that occurred after your death.`
      : `You can reference modern events and discoveries even if they occurred after your lifetime.`

    const formatPrompt = getFormatPrompt(format)

    // Generate response for character 1
    const { text: response1 } = await generateText({
      model: openai("gpt-4o"),
      prompt: `You are ${char1.name}. ${char1.systemPrompt}
      
      ${contextPrompt}
      
      ${formatPrompt}
      
      Previous conversation:
      ${conversationContext}
      
      The audience has asked: "${userQuestion}"
      
      Provide your response to this question. Be true to your historical character, beliefs, and speaking style.
      Keep your response concise, under 75 words.`,
      temperature: 0.7,
      maxTokens: 200,
    })

    // Generate response for character 2
    const { text: response2 } = await generateText({
      model: openai("gpt-4o"),
      prompt: `You are ${char2.name}. ${char2.systemPrompt}
      
      ${contextPrompt}
      
      ${formatPrompt}
      
      Previous conversation:
      ${conversationContext}
      
      The audience has asked: "${userQuestion}"
      
      ${char1.name} has just responded with:
      "${response1}"
      
      Provide your response to the question, potentially addressing points made by ${char1.name}.
      Be true to your historical character, beliefs, and speaking style.
      Keep your response concise, under 75 words.`,
      temperature: 0.7,
      maxTokens: 200,
    })

    return res.status(200).json({ response1, response2 })
  } catch (error) {
    console.error("Error continuing debate:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

function formatConversationContext(messages, char1, char2) {
  return messages
    .map((msg) => {
      if (msg.character === "user") {
        return `Audience: ${msg.content}`
      } else if (msg.character === char1.id) {
        return `${char1.name}: ${msg.content}`
      } else if (msg.character === char2.id) {
        return `${char2.name}: ${msg.content}`
      }
      return ""
    })
    .join("\n\n")
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