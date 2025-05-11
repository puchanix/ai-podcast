// pages/api/generate-debate-topics.js
import { characters } from "../../data/characters"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const config = {
  runtime: "nodejs",
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { character1, character2 } = req.body

    // Get character details
    const char1 = characters.find((c) => c.id === character1)
    const char2 = characters.find((c) => c.id === character2)

    if (!char1 || !char2) {
      return res.status(400).json({ error: "Character not found" })
    }

    // Generate debate topics using AI
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Generate 6 interesting debate topics for a conversation between ${char1.name} and ${char2.name}. 
      Consider their historical backgrounds, areas of expertise, and potential philosophical disagreements.
      
      For each topic, provide:
      1. A short title (3-5 words)
      2. A brief description (10-15 words)
      3. A category (science, philosophy, politics, arts, technology, or history)
      
      Format the response as a JSON array of objects with the properties: id, title, description, and category.
      Example:
      [
        {
          "id": "unique-id-1",
          "title": "Nature of Reality",
          "description": "Perspectives on what constitutes true reality and human perception",
          "category": "philosophy"
        }
      ]`,
      temperature: 0.7,
      maxTokens: 1000,
    })

    // Parse the response
    let topics
    try {
      // Extract JSON from the response if needed
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      const jsonString = jsonMatch ? jsonMatch[0] : text
      topics = JSON.parse(jsonString)
    } catch (error) {
      console.error("Error parsing topics:", error)
      return res.status(500).json({ error: "Failed to generate topics" })
    }

    return res.status(200).json({ topics })
  } catch (error) {
    console.error("Error generating debate topics:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}