import { characters } from "../../../data/characters"

export default async function handler(req, res) {
  try {
    const { character1, character2, topic, format, historicalContext } = req.body

    if (!character1 || !character2 || !topic) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    // Get character details
    const char1 = characters.find((c) => c.id === character1)
    const char2 = characters.find((c) => c.id === character2)

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // Generate debate content using OpenAI
    const prompt = `
      Create an opening statement for a debate between ${char1.name} and ${char2.name} on the topic of "${topic}".
      ${
        historicalContext
          ? "The characters should only use knowledge available during their lifetimes."
          : "The characters can reference modern knowledge."
      }
      Format: ${format}
      
      Return two separate opening statements, one for each character.
    `

    let opening1, opening2

    // Check if we have an OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn("No OpenAI API key found, using placeholder text")
      opening1 = `As ${char1.name}, I would approach the topic of "${topic}" by considering the fundamental principles that have guided my work. This subject is fascinating because it touches on the core of human understanding and progress.`
      opening2 = `From my perspective as ${char2.name}, I see "${topic}" through a different lens. While I appreciate ${char1.name}'s approach, I believe we must also consider the practical implications and historical context of this matter.`
    } else {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
                content: `You are creating a debate between historical figures ${char1.name} and ${char2.name}.`,
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
          }),
        })

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices[0].message.content

        // Split the content into two parts
        const parts = content.split(/(?:Character 2:|Second character:|${char2.name}:)/i, 2)
        opening1 = parts[0].replace(/(?:Character 1:|First character:|${char1.name}:)/i, "").trim()
        opening2 = parts[1] ? parts[1].trim() : `As ${char2.name}, I have a different perspective on ${topic}.`
      } catch (error) {
        console.error("Error generating debate content:", error)
        opening1 = `As ${char1.name}, I would approach the topic of "${topic}" by considering the fundamental principles that have guided my work. This subject is fascinating because it touches on the core of human understanding and progress.`
        opening2 = `From my perspective as ${char2.name}, I see "${topic}" through a different lens. While I appreciate ${char1.name}'s approach, I believe we must also consider the practical implications and historical context of this matter.`
      }
    }

    // Generate audio URLs for both characters
    const audioUrl1 = `/api/stream-audio?id=debate_${character1}_${Date.now()}&text=${encodeURIComponent(opening1)}&voice=${encodeURIComponent(char1.voice)}`

    // Add a small delay to ensure unique timestamps
    const timestamp2 = Date.now() + 100
    const audioUrl2 = `/api/stream-audio?id=debate_${character2}_${timestamp2}&text=${encodeURIComponent(opening2)}&voice=${encodeURIComponent(char2.voice)}`

    return res.json({
      opening1,
      opening2,
      audioUrl1,
      audioUrl2,
    })
  } catch (error) {
    console.error("Error in start debate API:", error)
    return res.status(500).json({ error: "Failed to start debate" })
  }
}
