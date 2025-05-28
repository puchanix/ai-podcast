import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function getVoiceForCharacter(character) {
  const voiceMap = {
    daVinci: "echo",
    socrates: "echo",
    frida: "nova",
    shakespeare: "echo",
    mozart: "echo",
  }
  return voiceMap[character] || "echo"
}

// Character definitions
const characters = {
  daVinci: {
    name: "Leonardo da Vinci",
    systemPrompt:
      "You are Leonardo da Vinci, the great Renaissance polymath. Speak with curiosity about art, science, and invention. Keep responses concise but thoughtful.",
    voice: "echo",
  },
  socrates: {
    name: "Socrates",
    systemPrompt:
      "You are Socrates, the ancient Greek philosopher. Use the Socratic method, asking probing questions. Be wise but humble.",
    voice: "echo",
  },
  frida: {
    name: "Frida Kahlo",
    systemPrompt:
      "You are Frida Kahlo, the passionate Mexican artist. Speak with intensity about art, pain, love, and identity.",
    voice: "nova",
  },
  shakespeare: {
    name: "William Shakespeare",
    systemPrompt:
      "You are William Shakespeare, the Bard of Avon. Speak poetically but accessibly about human nature, love, and drama.",
    voice: "echo",
  },
  mozart: {
    name: "Wolfgang Amadeus Mozart",
    systemPrompt:
      "You are Wolfgang Amadeus Mozart, the classical composer. Speak passionately about music, creativity, and artistic expression.",
    voice: "echo",
  },
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { character1, character2, topic } = req.body

    if (!character1 || !character2 || !topic) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    if (!characters[character1] || !characters[character2]) {
      return res.status(400).json({ error: "Invalid characters" })
    }

    const char1Data = characters[character1]
    const char2Data = characters[character2]

    // Generate opening statements
    const opening1Promise = openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `${char1Data.systemPrompt} You are about to debate the topic: "${topic}". Give a compelling opening statement that establishes your position. Keep it to 2-3 sentences.`,
        },
        {
          role: "user",
          content: `Give your opening statement on the debate topic: "${topic}"`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    })

    const opening2Promise = openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `${char2Data.systemPrompt} You are about to debate the topic: "${topic}". Give a compelling opening statement that establishes your position. Keep it to 2-3 sentences.`,
        },
        {
          role: "user",
          content: `Give your opening statement on the debate topic: "${topic}"`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    })

    const [completion1, completion2] = await Promise.all([opening1Promise, opening2Promise])

    const opening1 = completion1.choices[0].message.content
    const opening2 = completion2.choices[0].message.content

    console.log("🔍 [START DEBATE API] Generated openings successfully")
    console.log("🔍 [START DEBATE API] Opening 1:", opening1.substring(0, 50) + "...")
    console.log("🔍 [START DEBATE API] Opening 2:", opening2.substring(0, 50) + "...")

    // Generate audio for the openings (your frontend expects audioUrl1 and audioUrl2)
    try {
      const audioPromises = [
        fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: opening1,
            voice: getVoiceForCharacter(character1),
          }),
        }),
        fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: opening2,
            voice: getVoiceForCharacter(character2),
          }),
        }),
      ]

      const [audioResponse1, audioResponse2] = await Promise.all(audioPromises)

      let audioUrl1 = null
      let audioUrl2 = null

      if (audioResponse1.ok) {
        const audioData1 = await audioResponse1.json()
        audioUrl1 = audioData1.audioUrl
      }

      if (audioResponse2.ok) {
        const audioData2 = await audioResponse2.json()
        audioUrl2 = audioData2.audioUrl
      }

      return res.status(200).json({
        success: true,
        opening1,
        opening2,
        audioUrl1,
        audioUrl2,
        character1,
        character2,
        topic,
      })
    } catch (audioError) {
      console.log("🔍 [START DEBATE API] Audio generation failed, returning without audio")
      return res.status(200).json({
        success: true,
        opening1,
        opening2,
        character1,
        character2,
        topic,
      })
    }
  } catch (error) {
    console.error("Start debate API error:", error)
    res.status(500).json({ error: "Failed to start debate" })
  }
}
