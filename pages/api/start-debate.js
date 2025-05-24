import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  console.log("🔍 start-debate API called with body:", req.body)

  try {
    const { character1, character2, topic, format, historicalContext } = req.body

    console.log("🔍 Extracted parameters:", { character1, character2, topic, format, historicalContext })

    // Validate required fields
    if (!character1 || !character2 || !topic) {
      console.error("🔍 Missing required fields:", { character1, character2, topic })
      return res.status(400).json({
        error: "Missing required fields",
        received: { character1, character2, topic, format, historicalContext },
      })
    }

    // Import personas dynamically to ensure we get the same ones as the frontend
    const { personas } = await import("../../lib/personas")

    console.log("🔍 Available personas from lib/personas:", Object.keys(personas))

    // Get the personas for each character
    const persona1 = personas[character1]
    const persona2 = personas[character2]

    console.log("🔍 Looking up personas:", { character1, character2 })
    console.log("🔍 Found persona1:", persona1?.name)
    console.log("🔍 Found persona2:", persona2?.name)

    if (!persona1 || !persona2) {
      console.error("🔍 Invalid character selection:", {
        character1,
        character2,
        persona1: !!persona1,
        persona2: !!persona2,
      })
      return res.status(400).json({
        error: "Invalid character selection",
        available: Object.keys(personas),
        requested: { character1, character2 },
      })
    }

    console.log(`Using system prompt for ${persona1.name}: ${persona1.systemPrompt}`)

    // Generate opening statements in parallel
    const [opening1Promise, opening2Promise] = [
      generateOpening(persona1, persona2, topic, format, historicalContext),
      generateOpening(persona2, persona1, topic, format, historicalContext),
    ]

    // Start audio generation in parallel with text generation
    const [opening1, opening2] = await Promise.all([opening1Promise, opening2Promise])

    // Get voice IDs for both characters using the getVoiceId function
    const voice1 = persona1.getVoiceId ? persona1.getVoiceId() : persona1.voiceId || "echo"
    const voice2 = persona2.getVoiceId ? persona2.getVoiceId() : persona2.voiceId || "echo"

    console.log("🔍 Using voice IDs:", { voice1, voice2 })

    // Generate audio for both openings in parallel
    const [audioUrl1, audioUrl2] = await Promise.all([
      generateStreamingAudio(opening1, voice1),
      generateStreamingAudio(opening2, voice2),
    ])

    res.status(200).json({
      opening1,
      opening2,
      audioUrl1,
      audioUrl2,
    })
  } catch (error) {
    console.error("Error starting debate:", error)
    res.status(500).json({ error: "Failed to start debate" })
  }
}

// Function to generate an opening statement for a character
async function generateOpening(persona, otherPersona, topic, format, historicalContext) {
  // Enhanced system prompt to prevent name prefixing
  const systemPrompt = `${persona.systemPrompt}

You are debating ${otherPersona.name} on "${topic}".
Keep your opening statement very concise (40-60 words maximum). Be direct and impactful.

CRITICAL INSTRUCTIONS:
- Do NOT state your name or prefix your response with your name
- Do NOT say "${persona.name}:" or any variation
- Speak directly as yourself without introduction
- Jump straight into your argument`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Give your opening statement on: "${topic}". Be very concise and powerful. Do not state your name.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 80,
    })

    return completion.choices[0].message.content.trim()
  } catch (error) {
    console.error("Error generating opening statement:", error)
    throw error
  }
}

// Function to generate streaming audio URL
async function generateStreamingAudio(text, voiceId) {
  try {
    // Return the streaming URL instead of generating audio immediately
    const audioId = `debate_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    return `/api/stream-audio-realtime?id=${audioId}&text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceId)}`
  } catch (error) {
    console.error("Error generating streaming audio:", error)
    throw error
  }
}
