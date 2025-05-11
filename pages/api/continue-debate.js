// pages/api/continue-debate.js
import { personas } from "../../lib/personas"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { character1, character2, userQuestion, currentMessages } = req.body

    // Get character details
    const char1 = personas[character1]
    const char2 = personas[character2]

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // Format previous conversation for context
    const conversationContext = formatConversationContext(currentMessages, character1, character2)

    // Generate response for character 1
    const response1 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are ${char1.name}. Respond as this historical figure would, with their knowledge, personality, and speaking style.`,
          },
          {
            role: "user",
            content: `Previous conversation:
            ${conversationContext}
            
            The audience has asked: "${userQuestion}"
            
            Provide your response to this question. Be true to your historical character, beliefs, and speaking style.
            Keep your response under 150 words.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response1.ok) {
      throw new Error(`OpenAI API error: ${response1.statusText}`)
    }

    const data1 = await response1.json()
    const responseText1 = data1.choices[0].message.content

    // Generate response for character 2
    const response2 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are ${char2.name}. Respond as this historical figure would, with their knowledge, personality, and speaking style.`,
          },
          {
            role: "user",
            content: `Previous conversation:
            ${conversationContext}
            
            The audience has asked: "${userQuestion}"
            
            ${char1.name} has just responded with:
            "${responseText1}"
            
            Provide your response to the question, potentially addressing points made by ${char1.name}.
            Be true to your historical character, beliefs, and speaking style.
            Keep your response under 150 words.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response2.ok) {
      throw new Error(`OpenAI API error: ${response2.statusText}`)
    }

    const data2 = await response2.json()
    const responseText2 = data2.choices[0].message.content

    return res.status(200).json({ response1: responseText1, response2: responseText2 })
  } catch (error) {
    console.error("Error continuing debate:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

function formatConversationContext(messages, char1Id, char2Id) {
  return messages
    .map((msg) => {
      if (msg.character === "user") {
        return `Audience: ${msg.content}`
      } else if (msg.character === char1Id) {
        return `${personas[char1Id].name}: ${msg.content}`
      } else if (msg.character === char2Id) {
        return `${personas[char2Id].name}: ${msg.content}`
      }
      return ""
    })
    .join("\n\n")
}