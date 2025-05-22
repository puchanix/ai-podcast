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
        {
          id: "human-potential",
          title: "Human Potential",
          description: "The limits and possibilities of human achievement and understanding",
          category: "philosophy",
        },
        {
          id: "ideal-society",
          title: "Ideal Society",
          description: "What constitutes the perfect social and political structure?",
          category: "politics",
        },
        {
          id: "beauty-truth",
          title: "Beauty and Truth",
          description: "Is beauty objective or subjective, and how does it relate to truth?",
          category: "arts",
        },
        {
          id: "innovation-tradition",
          title: "Innovation vs. Tradition",
          description: "The value of new ideas versus established wisdom",
          category: "philosophy",
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
    let topics = []

    try {
      const responseData = JSON.parse(responseText)
      topics = responseData.topics || []
    } catch (error) {
      console.error("Error parsing OpenAI response:", error)
      // Return default topics if parsing fails
      return res.status(200).json({
        topics: [
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
        ],
      })
    }

    // Cache the topics for 24 hours if Redis is available
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(topics), "EX", 86400)
      } catch (error) {
        console.error("Redis caching error:", error)
        // Continue even if caching fails
      }
    }

    res.status(200).json({ topics })
  } catch (error) {
    console.error("Error generating topics:", error)
    res.status(500).json({ error: "Failed to generate topics", details: error.message })
  }
}
