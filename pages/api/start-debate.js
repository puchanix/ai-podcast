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

    // Generate opening statement for character 1 (shorter)
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
            
            Provide a brief opening statement on this topic. Be concise and provocative to start a debate.
            Keep your response under 75 words.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!response1.ok) {
      throw new Error(`OpenAI API error: ${response1.statusText}`)
    }

    const data1 = await response1.json()
    const opening1 = data1.choices[0].message.content

    // Generate opening response from character 2 (shorter)
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
            
            Provide a brief response that challenges or questions their position.
            Keep your response under 75 words.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!response2.ok) {
      throw new Error(`OpenAI API error: ${response2.statusText}`)
    }

    const data2 = await response2.json()
    const opening2 = data2.choices[0].message.content

    // Generate follow-up from character 1
    const response3 = await fetch("https://api.openai.com/v1/chat/completions", {
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
            
            You said: "${opening1}"
            
            ${char2.name} responded: "${opening2}"
            
            Provide a brief rebuttal or follow-up to their response.
            Keep your response under 75 words.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!response3.ok) {
      throw new Error(`OpenAI API error: ${response3.statusText}`)
    }

    const data3 = await response3.json()
    const followup1 = data3.choices[0].message.content

    // Generate final response from character 2
    const response4 = await fetch("https://api.openai.com/v1/chat/completions", {
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
            
            You said: "${opening2}"
            
            ${char1.name} responded: "${followup1}"
            
            Provide a brief counter-argument or closing thought.
            Keep your response under 75 words.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!response4.ok) {
      throw new Error(`OpenAI API error: ${response4.statusText}`)
    }

    const data4 = await response4.json()
    const followup2 = data4.choices[0].message.content

    // Return all statements for the initial exchange
    return res.status(200).json({ 
      exchanges: [
        { character: character1, content: opening1 },
        { character: character2, content: opening2 },
        { character: character1, content: followup1 },
        { character: character2, content: followup2 }
      ]
    })
  } catch (error) {
    console.error("Error starting debate:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}