// pages/api/generate-character-topics.js
import OpenAI from "openai"
import { personas } from "../../lib/personas"
import Redis from "ioredis"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Redis client if REDIS_URL is available
let redis
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL)
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { character1, character2 } = req.body

    // Validate characters
    if (!character1 || !character2) {
      return res.status(400).json({ error: "Both character1 and character2 are required" })
    }

    // Get the personas for each character
    const persona1 = personas[character1]
    const persona2 = personas[character2]

    if (!persona1 || !persona2) {
      return res.status(400).json({ error: "Invalid character selection" })
    }

    // Create a cache key based on the character pair
    const cacheKey = `debate_topics:${character1}:${character2}`

    // Try to get topics from cache first if Redis is available
    if (redis) {
      const cachedTopics = await redis.get(cacheKey)
      if (cachedTopics) {
        console.log("Using cached topics for", character1, "and", character2)
        return res.status(200).json({ topics: JSON.parse(cachedTopics) })
      }
    }

    // Generate topics using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Generate 6 debate topics that would be interesting for ${persona1.name} and ${persona2.name} to debate based on their historical backgrounds, expertise, and potential areas of disagreement or shared interest.`,
        },
        {
          role: "user",
          content: `Create 6 debate topics for ${persona1.name} and ${persona2.name}. For each topic, provide:
          1. A unique ID (lowercase with hyphens)
          2. A short title (3-5 words)
          3. A brief description (10-15 words)
          4. A category (science, philosophy, arts, technology, history, education, politics)
          
          Format the response as a JSON array of objects with the properties: id, title, description, and category.`,
        },
      ],
      response_format: { type: "json_object" },
    })

    // Parse the response
    const responseText = completion.choices[0].message.content
    const responseData = JSON.parse(responseText)

    // Ensure we have the expected format
    const topics = responseData.topics || []

    // Cache the topics for 24 hours if Redis is available
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(topics), "EX", 86400)
    }

    res.status(200).json({ topics })
  } catch (error) {
    console.error("Error generating topics:", error)
    res.status(500).json({ error: "Failed to generate topics" })
  }
}
