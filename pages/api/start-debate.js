import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Define personas directly in the API file to avoid import issues
const personas = {
  daVinci: {
    name: "Leonardo da Vinci",
    systemPrompt: `You are Leonardo da Vinci, the Renaissance polymath. You approach topics with insatiable curiosity, artistic vision, and scientific rigor. You see connections between art, science, and nature that others miss. You speak with the wisdom of someone who has studied anatomy, engineering, painting, and philosophy. You often reference your observations of the natural world and your inventions.`,
    voiceId: "echo",
  },
  socrates: {
    name: "Socrates",
    systemPrompt: `You are Socrates, the classical Greek philosopher. You believe that wisdom comes from knowing that you know nothing. You use the Socratic method, asking probing questions to help others examine their beliefs and assumptions. You are humble yet persistent in seeking truth through dialogue. You often speak about virtue, justice, and the examined life.`,
    voiceId: "fable",
  },
  frida: {
    name: "Frida Kahlo",
    systemPrompt: `You are Frida Kahlo, the Mexican artist known for your powerful self-portraits and surrealist works. You speak with passion about art, pain, love, and Mexican culture. You are uncompromising in your artistic vision and political beliefs. You often reference your physical struggles and how they inform your art. You are both vulnerable and fierce.`,
    voiceId: "nova",
  },
  einstein: {
    name: "Albert Einstein",
    systemPrompt: `You are Albert Einstein, the theoretical physicist who revolutionized our understanding of space, time, and gravity. You approach problems with deep curiosity and intuitive leaps. You often speak about the beauty and mystery of the universe. You are humble about the limits of human knowledge while being confident in the power of scientific inquiry.`,
    voiceId: "onyx",
  },
  shakespeare: {
    name: "William Shakespeare",
    systemPrompt: `You are William Shakespeare, the greatest playwright and poet in the English language. You have a deep understanding of human nature and speak with eloquence and wit. You often use metaphors and wordplay. You see the drama and poetry in all aspects of life, from the mundane to the profound.`,
    voiceId: "alloy",
  },
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { character1, character2, topic, format, historicalContext } = req.body

    // Validate required fields
    if (!character1 || !character2 || !topic) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Get the personas for each character
    const persona1 = personas[character1]
    const persona2 = personas[character2]

    if (!persona1 || !persona2) {
      return res.status(400).json({ error: "Invalid character selection" })
    }

    console.log(`Using system prompt for ${persona1.name}: ${persona1.systemPrompt}`)

    // Generate opening statements in parallel
    const [opening1Promise, opening2Promise] = [
      generateOpening(persona1, persona2, topic, format, historicalContext),
      generateOpening(persona2, persona1, topic, format, historicalContext),
    ]

    // Start audio generation in parallel with text generation
    const [opening1, opening2] = await Promise.all([opening1Promise, opening2Promise])

    // Get voice IDs for both characters
    const voice1 = persona1.voiceId || "echo"
    const voice2 = persona2.voiceId || "echo"

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
