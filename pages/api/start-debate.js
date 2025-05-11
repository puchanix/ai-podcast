// pages/api/start-debate.js
import { personas } from "../../lib/personas"
import { Configuration, OpenAIApi } from "openai"

export default async function handler(req, res) {
  try {
    const { character1, character2, topic, format, historicalContext } = req.body

    // Get character details
    const char1 = personas[character1]
    const char2 = personas[character2]

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // Generate opening statements for both characters
    const contextPrompt = historicalContext
      ? `Respond as if you only have knowledge available during your lifetime. Do not reference events, discoveries, or concepts that occurred after your death.`
      : `You can reference modern events and discoveries even if they occurred after your lifetime.`

    const formatPrompt = getFormatPrompt(format)

    // Configure OpenAI
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)

    // Generate opening statement for character 1
    const opening1Result = await openai.createChatCompletion({
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
          content: `The topic of debate is: "${topic}"
          
          Provide your opening statement on this topic. Be true to your historical character, beliefs, and speaking style.
          Keep your response under 100 words.`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const opening1 = opening1Result.data.choices[0]?.message?.content || "I'm sorry, I couldn't process your request."

    // Generate opening statement for character 2
    const opening2Result = await openai.createChatCompletion({
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
          content: `The topic of debate is: "${topic}"
          
          Your debate opponent, ${char1.name}, has made the following opening statement:
          "${opening1}"
          
          Provide your opening statement on this topic, responding to some points made by ${char1.name} if appropriate.
          Be true to your historical character, beliefs, and speaking style.
          Keep your response under 100 words.`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const opening2 = opening2Result.data.choices[0]?.message?.content || "I'm sorry, I couldn't process your request."

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