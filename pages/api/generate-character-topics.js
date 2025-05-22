// pages/api/generate-character-topics.js
import OpenAI from "openai"
import { personas } from "../../lib/personas"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Redis client if REDIS_URL is available
let redis = null
try {
  if (process.env.REDIS_URL) {
    // Dynamic import to avoid build errors if ioredis is not installed
    const Redis = require("ioredis")
    redis = new Redis(process.env.REDIS_URL)
  }
} catch (error) {
  console.warn("Redis not available:", error.message)
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
      try {
        const cachedTopics = await redis.get(cacheKey)
        if (cachedTopics) {
          console.log("Using cached topics for", character1, "and", character2)
          return res.status(200).json({ topics: JSON.parse(cachedTopics) })
        }
      } catch (error) {
        console.error("Redis error:", error)
        // Continue with OpenAI if Redis fails
      }
    }

    // Special case for da Vinci and Socrates
    if (
      (character1 === "daVinci" && character2 === "socrates") ||
      (character1 === "socrates" && character2 === "daVinci")
    ) {
      const daVinciSocratesTopics = [
        {
          id: "knowledge-truth",
          title: "Knowledge vs. Truth",
          description: "Is knowledge the same as truth, and how do we discover either?",
          category: "philosophy",
        },
        {
          id: "art-science-relationship",
          title: "Art and Science",
          description: "The relationship between artistic expression and scientific inquiry",
          category: "arts",
        },
      ]

      // Cache the topics if Redis is available
      if (redis) {
        try {
          await redis.set(cacheKey, JSON.stringify(daVinciSocratesTopics), "EX", 86400)
        } catch (error) {
          console.error("Redis caching error:", error)
        }
      }

      return res.status(200).json({ topics: daVinciSocratesTopics })
    }

    // Special case for other character pairs - use predefined topics
    const defaultTopics = getDefaultTopics(character1, character2)

    // Cache the topics if Redis is available
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(defaultTopics), "EX", 86400)
      } catch (error) {
        console.error("Redis caching error:", error)
      }
    }

    return res.status(200).json({ topics: defaultTopics })
  } catch (error) {
    console.error("Error generating topics:", error)
    res.status(500).json({ error: "Failed to generate topics", details: error.message })
  }
}

// Add a helper function to get default topics
function getDefaultTopics(character1, character2) {
  // Get the personas for each character
  const persona1 = personas[character1]
  const persona2 = personas[character2]

  // Create default topics based on character names
  return [
    {
      id: `${character1}-${character2}-philosophy`,
      title: "Philosophy and Knowledge",
      description: `How ${persona1.name} and ${persona2.name} view the pursuit of wisdom`,
      category: "philosophy",
    },
    {
      id: `${character1}-${character2}-legacy`,
      title: "Historical Legacy",
      description: `The lasting impact of ${persona1.name} and ${persona2.name} on humanity`,
      category: "history",
    },
  ]
}
