// Define personas directly to avoid import issues
const personas = {
  daVinci: {
    name: "Leonardo da Vinci",
    prompt:
      "You are Leonardo da Vinci, the Renaissance polymath. You speak with curiosity about art, science, and invention. You often reference your observations of nature and your artistic works.",
  },
  socrates: {
    name: "Socrates",
    prompt:
      "You are Socrates, the classical Greek philosopher. You speak through questioning, seeking wisdom through dialogue. You often say you know nothing and guide others to discover truth.",
  },
  frida: {
    name: "Frida Kahlo",
    prompt:
      "You are Frida Kahlo, the passionate Mexican artist. You speak with intensity about art, pain, love, and Mexican culture. You are direct and emotionally expressive.",
  },
  shakespeare: {
    name: "William Shakespeare",
    prompt:
      "You are William Shakespeare, the greatest playwright in English literature. You speak in eloquent, poetic language with wit and wisdom about human nature and the human condition.",
  },
  mozart: {
    name: "Wolfgang Amadeus Mozart",
    prompt:
      "You are Wolfgang Amadeus Mozart, the musical genius. You speak with passion about music, composition, and the divine nature of musical harmony. You are playful yet profound.",
  },
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    console.log("🔍 [START DEBATE API] Received request")
    const { character1, character2, topic } = req.body

    console.log("🔍 [START DEBATE API] Parameters:")
    console.log("🔍 [START DEBATE API] - character1:", character1)
    console.log("🔍 [START DEBATE API] - character2:", character2)
    console.log("🔍 [START DEBATE API] - topic:", topic)

    if (!character1 || !character2 || !topic) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    const persona1 = personas[character1]
    const persona2 = personas[character2]

    if (!persona1 || !persona2) {
      return res.status(400).json({ error: "Invalid characters" })
    }

    console.log("🔍 [START DEBATE API] Generating opening statements...")

    // Generate opening statements in parallel but with shorter, simpler prompts
    const [opening1Response, opening2Response] = await Promise.all([
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `${persona1.prompt} You are starting a debate about "${topic}". Give a brief opening statement (1-2 sentences max). Be authentic to your character.`,
            },
            {
              role: "user",
              content: `Give your opening statement on the topic: "${topic}"`,
            },
          ],
          max_tokens: 50, // Reduced from 150 to 50
          temperature: 0.8,
        }),
      }),
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `${persona2.prompt} You are starting a debate about "${topic}". Give a brief opening statement (1-2 sentences max). Be authentic to your character.`,
            },
            {
              role: "user",
              content: `Give your opening statement on the topic: "${topic}"`,
            },
          ],
          max_tokens: 50, // Reduced from 150 to 50
          temperature: 0.8,
        }),
      }),
    ])

    if (!opening1Response.ok || !opening2Response.ok) {
      console.error("🔍 [START DEBATE API] OpenAI API error")
      throw new Error("Failed to generate opening statements")
    }

    const [data1, data2] = await Promise.all([opening1Response.json(), opening2Response.json()])

    const opening1 = data1.choices[0]?.message?.content || "I'm ready to discuss this topic."
    const opening2 = data2.choices[0]?.message?.content || "I look forward to this debate."

    console.log("🔍 [START DEBATE API] Generated openings successfully")
    console.log("🔍 [START DEBATE API] Opening 1:", opening1.substring(0, 50) + "...")
    console.log("🔍 [START DEBATE API] Opening 2:", opening2.substring(0, 50) + "...")

    return res.status(200).json({
      success: true,
      opening1,
      opening2,
      character1,
      character2,
      topic,
    })
  } catch (error) {
    console.error("🔍 [START DEBATE API] Error:", error)
    return res.status(500).json({ error: "Failed to start debate", details: error.message })
  }
}
