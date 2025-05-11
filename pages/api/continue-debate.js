// pages/api/continue-debate.js
import { personas } from "../../lib/personas"
import { Configuration, OpenAIApi } from "openai"

export default async function handler(req, res) {
  try {
    const { character1, character2, userQuestion, currentMessages, format, historicalContext } = req.body

    // Get character details
    const char1 = personas[character1]
    const char2 = personas[character2]

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

    // Configure OpenAI
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)

    // Generate response for character 1
    const response1Result = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are ${char1.name}. You are a historical figure known for your contributions to your field.
          
          ${contextPrompt}
          
          ${formatPrompt}`
        },
        {
          role: "user",
          content: `Previous conversation:
          ${conversationContext}
          
          The audience has asked: "${userQuestion}"
          
          Provide your response to this question. Be true to your historical character, beliefs, and speaking style.
          Keep your response under 100 words.`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const response1 = response1Result.data.choices[0]?.message?.content || "I'm sorry, I couldn't process your question."

    // Generate response for character 2
    const response2Result = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are ${char2.name}. You are a historical figure known for your contributions to your field.
          
          ${contextPrompt}
          
          ${formatPrompt}`
        },
        {
          role: "user",
          content: `Previous conversation:
          ${conversationContext}
          
          The audience has asked: "${userQuestion}"
          
          ${char1.name} has just responded with:
          "${response1}"
          
          Provide your response to the question, potentially addressing points made by ${char1.name}.
          Be true to your historical character, beliefs, and speaking style.
          Keep your response under 100 words.`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const response2 = response2Result.data.choices[0]?.message?.content || "I'm sorry, I couldn't process your question."

    return res.status(200).json({ response1, response2 })
  } catch (error) {
    console.error("Error continuing debate:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

function formatConversationContext(messages, char1, char2) {
  if (!messages || !Array.isArray(messages)) return ""
  
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