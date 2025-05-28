
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const characters = {
  daVinci:
    "You are Leonardo da Vinci, the great Renaissance polymath. Speak with curiosity about art, science, and invention. Be passionate but thoughtful.",
  socrates:
    "You are Socrates, the ancient Greek philosopher. Use the Socratic method, asking probing questions. Be wise but humble.",
  frida:
    "You are Frida Kahlo, the passionate Mexican artist. Speak with intensity about art, pain, love, and identity. Be bold and emotional.",
  shakespeare:
    "You are William Shakespeare, the Bard of Avon. Speak poetically but accessibly about human nature, love, and drama. Be eloquent.",
  mozart:
    "You are Wolfgang Amadeus Mozart, the classical composer. Speak passionately about music, creativity, and artistic expression. Be energetic.",
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { character1, character2, currentMessages, topic } = req.body

    if (!character1 || !character2 || !topic || !Array.isArray(currentMessages)) {
      return res.status(400).json({ error: "Missing or invalid parameters" })
    }

    // Determine who spoke last, then alternate
    const lastMessage = currentMessages.length > 0 ? currentMessages[currentMessages.length - 1] : null
    const lastSpeaker = lastMessage?.character
    const character = lastSpeaker === character1 ? character2 : character1
    const opponent = character === character1 ? character2 : character1

    const context = currentMessages.map((msg) =>
      msg.character === "user"
        ? `Question: ${msg.content}`
        : `${msg.character}: ${msg.content}`
    ).join("\n\n")

    const systemPrompt = characters[character]
    if (!systemPrompt) {
      throw new Error(`Unknown character: ${character}`)
    }

    const messageCount = currentMessages.length
    let stagePrompt = ""
    if (messageCount <= 2) {
      stagePrompt = "This is the opening round. Present your initial position clearly and passionately."
    } else if (messageCount <= 4) {
      stagePrompt = "This is the second round. Respond to your opponent's points and strengthen your argument."
    } else if (messageCount <= 6) {
      stagePrompt = "This is the third round. Challenge your opponent's logic and present new evidence."
    } else {
      stagePrompt = "This is the final round. Make your strongest closing argument."
    }

    const prompt = `You are continuing a debate about "${topic}" with ${opponent}.\n\n${stagePrompt}\n\nPrevious conversation:\n${context}\n\nGive your next response in 2-3 sentences. Stay true to your character, respond to the previous points made, and advance the debate. Be engaging and passionate about your position.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 80,
      temperature: 0.8,
    })

    const response = completion.choices[0]?.message?.content || "I need to think more about this."
    return res.status(200).json({ response, character })
  } catch (error) {
    console.error("[AUTO-CONTINUE API] Error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
