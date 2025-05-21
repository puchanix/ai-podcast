// pages/api/generate-debate-topics.js
import OpenAI from "openai"
import { personas } from "../../lib/personas"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Fallback topics in case the API call fails
const fallbackTopics = [
  {
    id: "science-method",
    title: "Scientific Method",
    description: "Approaches to scientific discovery and experimentation",
    category: "science",
  },
  {
    id: "human-nature",
    title: "Human Nature",
    description: "The fundamental characteristics of humanity",
    category: "philosophy",
  },
  {
    id: "technology-progress",
    title: "Technological Progress",
    description: "The benefits and risks of advancing technology",
    category: "technology",
  },
  {
    id: "art-purpose",
    title: "Purpose of Art",
    description: "The role of artistic expression in society",
    category: "arts",
  },
  {
    id: "education-methods",
    title: "Education Methods",
    description: "How to best educate future generations",
    category: "education",
  },
  {
    id: "historical-legacy",
    title: "Historical Legacy",
    description: "How history shapes our present and future",
    category: "history",
  },
]

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    console.log("Generate debate topics API called")

    const { character1, character2 } = req.body

    // Validate required fields
    if (!character1 || !character2) {
      console.error("Missing required fields:", { character1, character2 })
      return res.status(400).json({
        error: "Missing required fields",
        details: "Both character1 and character2 are required",
      })
    }

    // Get the personas for each character
    const persona1 = personas[character1]
    const persona2 = personas[character2]

    if (!persona1 || !persona2) {
      console.error("Invalid character selection:", {
        character1,
        character2,
        persona1: !!persona1,
        persona2: !!persona2,
      })

      // Return fallback topics instead of error
      console.log("Returning fallback topics due to invalid character selection")
      return res.status(200).json({ topics: fallbackTopics })
    }

    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set")
      return res.status(200).json({ topics: fallbackTopics })
    }

    try {
      // Generate topics using OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Generate 6 debate topics that would be interesting for a debate between ${persona1.name} and ${persona2.name}, considering their historical backgrounds, expertise, and perspectives.`,
          },
          {
            role: "user",
            content: `Create 6 debate topics for a conversation between ${persona1.name} and ${persona2.name}. For each topic, provide:
            1. A short title (2-4 words)
            2. A brief description (under 10 words)
            3. A category (science, philosophy, politics, arts, technology, history, or education)
            
            Format the response as a JSON array of objects with id, title, description, and category fields.`,
          },
        ],
      })

      const responseText = completion.choices[0].message.content.trim()

      // Parse the JSON response
      let topics
      try {
        // Try to parse the response as JSON
        topics = JSON.parse(responseText)

        // Ensure each topic has an id
        topics = topics.map((topic, index) => ({
          ...topic,
          id: topic.id || `topic-${index + 1}`,
        }))
      } catch (parseError) {
        console.error("Error parsing OpenAI response as JSON:", parseError)
        console.log("Response text:", responseText)

        // Return fallback topics if parsing fails
        return res.status(200).json({ topics: fallbackTopics })
      }

      return res.status(200).json({ topics })
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError)

      // Return fallback topics instead of error
      return res.status(200).json({ topics: fallbackTopics })
    }
  } catch (error) {
    console.error("Error generating debate topics:", error)

    // Return fallback topics instead of error
    return res.status(200).json({ topics: fallbackTopics })
  }
}
