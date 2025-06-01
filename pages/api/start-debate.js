import { personas, AI_CONFIG } from "../../lib/personas"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { character1, character2, topic } = req.body

    if (!character1 || !character2 || !topic) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    const persona1 = personas[character1]
    const persona2 = personas[character2]

    if (!persona1 || !persona2) {
      return res.status(400).json({ error: "Invalid characters" })
    }

    // Generate opening statements in parallel
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
              content: `${persona1.prompt} You are starting a debate about "${topic}". Give a brief opening statement (2-3 sentences max). Be authentic to your character. ${AI_CONFIG.WORD_LIMIT_INSTRUCTION}`,
            },
            {
              role: "user",
              content: `Give your opening statement on the topic: "${topic}"`,
            },
          ],
          max_tokens: AI_CONFIG.TOKEN_LIMIT,
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
              content: `${persona2.prompt} You are starting a debate about "${topic}". Give a brief opening statement (2-3 sentences max). Be authentic to your character. ${AI_CONFIG.WORD_LIMIT_INSTRUCTION}`,
            },
            {
              role: "user",
              content: `Give your opening statement on the topic: "${topic}"`,
            },
          ],
          max_tokens: AI_CONFIG.TOKEN_LIMIT,
          temperature: 0.8,
        }),
      }),
    ])

    if (!opening1Response.ok || !opening2Response.ok) {
      throw new Error("Failed to generate opening statements")
    }

    const [data1, data2] = await Promise.all([opening1Response.json(), opening2Response.json()])

    const opening1 = data1.choices[0]?.message?.content || "I'm ready to discuss this topic."
    const opening2 = data2.choices[0]?.message?.content || "I look forward to this debate."

    return res.status(200).json({
      success: true,
      opening1,
      opening2,
      character1,
      character2,
      topic,
    })
  } catch (error) {
    console.error("Start debate API error:", error)
    return res.status(500).json({ error: "Failed to start debate", details: error.message })
  }
}
