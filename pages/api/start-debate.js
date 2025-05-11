// pages/api/start-debate.js
import { personas } from "../../lib/personas"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { character1, character2, topic } = req.body

    // Get character details
    const char1 = personas[character1]
    const char2 = personas[character2]

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // Generate opening statement for character 1
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
            content: `The topic of debate is: "${topic}"
            
            Provide your opening statement on this topic. Be true to your historical character, beliefs, and speaking style.
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
    const opening1 = data1.choices[0].message.content

    // Generate opening statement for character 2
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
            content: `The topic of debate is: "${topic}"
            
            Your debate opponent, ${char1.name}, has made the following opening statement:
            "${opening1}"
            
            Provide your opening statement on this topic, responding to some points made by ${char1.name} if appropriate.
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
    const opening2 = data2.choices[0].message.content

    return res.status(200).json({ opening1, opening2 })
  } catch (error) {
    console.error("Error starting debate:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}