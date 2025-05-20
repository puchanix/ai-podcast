import { characters } from "../../../data/characters"

export default async function handler(req, res) {
  try {
    const { character1, character2, userQuestion, currentMessages, format, historicalContext } = req.body

    if (!character1 || !character2 || !userQuestion) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    // Get character details
    const char1 = characters.find((c) => c.id === character1)
    const char2 = characters.find((c) => c.id === character2)

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // Generate debate content using OpenAI
    const previousExchange = currentMessages
      .map((msg) => {
        if (msg.character === "user") return `Question: ${msg.content}`
        const speaker = msg.character === character1 ? char1.name : char2.name
        return `${speaker}: ${msg.content}`
      })
      .join("\n\n")

    const prompt = `
      Continue a debate between ${char1.name} and ${char2.name}.
      ${
        historicalContext
          ? "The characters should only use knowledge available during their lifetimes."
          : "The characters can reference modern knowledge."
      }
      Format: ${format}
      
      Previous exchange:
      ${previousExchange}
      
      User question: ${userQuestion}
      
      Provide responses from both characters to the user's question.
    `

    let response1, response2

    // Check if we have an OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn("No OpenAI API key found, using placeholder text")
      response1 = `As ${char1.name}, I find this question about "${userQuestion}" quite intriguing. Based on my understanding and experience, I would approach this by examining the fundamental principles involved.`
      response2 = `From my perspective as ${char2.name}, while I appreciate ${char1.name}'s insights, I believe we must also consider other aspects of "${userQuestion}" that relate to broader contexts and implications.`
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
        response1 = parts[0].replace(/(?:Character 1:|First character:|${char1.name}:)/i, "").trim()
        response2 = parts[1] ? parts[1].trim() : `As ${char2.name}, I have a different perspective on this question.`
      } catch (error) {
        console.error("Error generating debate content:", error)
        response1 = `As ${char1.name}, I find this question about "${userQuestion}" quite intriguing. Based on my understanding and experience, I would approach this by examining the fundamental principles involved.`
        response2 = `From my perspective as ${char2.name}, while I appreciate ${char1.name}'s insights, I believe we must also consider other aspects of "${userQuestion}" that relate to broader contexts and implications.`
      }
    }

    // Generate audio URLs for both characters
    const audioUrl1 = `/api/stream-audio?id=debate_${character1}_${Date.now()}&text=${encodeURIComponent(response1)}&voice=${encodeURIComponent(char1.voice)}`

    // Add a small delay to ensure unique timestamps
    const timestamp2 = Date.now() + 100
    const audioUrl2 = `/api/stream-audio?id=debate_${character2}_${timestamp2}&text=${encodeURIComponent(response2)}&voice=${encodeURIComponent(char2.voice)}`

    return res.json({
      response1,
      response2,
      audioUrl1,
      audioUrl2,
    })
  } catch (error) {
    console.error("Error in continue debate API:", error)
    return res.status(500).json({ error: "Failed to continue debate" })
  }
}
