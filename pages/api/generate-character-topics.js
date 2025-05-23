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

    // Create a cache key based on the character pair (sorted for consistency)
    const sortedChars = [character1, character2].sort()
    const cacheKey = `debate_topics:${sortedChars[0]}:${sortedChars[1]}`

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

    console.log(`Generating new topics for ${persona1.name} and ${persona2.name}`)

    // Use GPT-3.5-turbo for faster topic generation
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a debate topic generator. Create exactly 2 compelling debate topics that would be particularly relevant for ${persona1.name} and ${persona2.name} to debate, considering their historical backgrounds, expertise, and philosophical differences. 

Return a JSON array with exactly 2 objects, each having:
- id: a unique kebab-case identifier
- title: a concise, engaging topic title (max 50 characters)
- description: a brief explanation of why this topic suits these debaters (max 100 characters)
- category: one of "philosophy", "arts", "science", "politics", "history", "education"

Focus on topics that would create meaningful intellectual tension between these specific historical figures.`,
        },
        {
          role: "user",
          content: `Generate 2 debate topics specifically for ${persona1.name} and ${persona2.name}. Consider:
- ${persona1.name}: ${persona1.systemPrompt.substring(8, 100)}...
- ${persona2.name}: ${persona2.systemPrompt.substring(8, 100)}...

Return only valid JSON.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    })

    let generatedTopics
    try {
      generatedTopics = JSON.parse(completion.choices[0].message.content.trim())
    } catch (parseError) {
      console.error("Failed to parse GPT response:", completion.choices[0].message.content)
      throw new Error("Invalid response format from GPT")
    }

    // Validate the response structure
    if (!Array.isArray(generatedTopics) || generatedTopics.length !== 2) {
      throw new Error("GPT did not return exactly 2 topics")
    }

    // Ensure each topic has required fields
    const validatedTopics = generatedTopics.map((topic, index) => ({
      id: topic.id || `${character1}-${character2}-topic-${index + 1}`,
      title: topic.title || `Topic ${index + 1}`,
      description: topic.description || "A debate topic for these historical figures",
      category: topic.category || "philosophy",
    }))

    // Cache the topics if Redis is available (cache for 7 days)
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(validatedTopics), "EX", 604800)
        console.log(`Cached topics for ${character1} and ${character2}`)
      } catch (error) {
        console.error("Redis caching error:", error)
      }
    }

    return res.status(200).json({ topics: validatedTopics })
  } catch (error) {
    console.error("Error generating topics:", error)

    // Fallback to default topics if GPT fails
    const { character1, character2 } = req.body // Declare character1 and character2 here
    const fallbackTopics = getDefaultTopics(character1, character2)

    // Still try to cache the fallback topics
    if (redis) {
      try {
        const sortedChars = [character1, character2].sort()
        const cacheKey = `debate_topics:${sortedChars[0]}:${sortedChars[1]}`
        await redis.set(cacheKey, JSON.stringify(fallbackTopics), "EX", 604800)
      } catch (cacheError) {
        console.error("Redis caching error for fallback:", cacheError)
      }
    }

    res.status(200).json({ topics: fallbackTopics })
  }
}

// Enhanced fallback function
function getDefaultTopics(character1, character2) {
  const persona1 = personas[character1]
  const persona2 = personas[character2]

  if (!persona1 || !persona2) {
    return [
      {
        id: "general-philosophy",
        title: "Philosophy and Knowledge",
        description: "The pursuit of wisdom and understanding",
        category: "philosophy",
      },
      {
        id: "general-legacy",
        title: "Historical Legacy",
        description: "The lasting impact on humanity",
        category: "history",
      },
    ]
  }

  // Character-specific fallback topics
  const characterPairs = {
    [`${character1}_${character2}`]: true,
    [`${character2}_${character1}`]: true,
  }

  if (characterPairs["daVinci_socrates"]) {
    return [
      {
        id: "knowledge-vs-wisdom",
        title: "Knowledge vs. Wisdom",
        description: "Is accumulated knowledge the same as true wisdom?",
        category: "philosophy",
      },
      {
        id: "art-as-truth",
        title: "Art as Truth",
        description: "Can artistic expression reveal deeper truths than logic?",
        category: "arts",
      },
    ]
  }

  if (characterPairs["daVinci_frida"]) {
    return [
      {
        id: "personal-vs-universal",
        title: "Personal vs. Universal Art",
        description: "Should art express personal pain or universal beauty?",
        category: "arts",
      },
      {
        id: "innovation-vs-tradition",
        title: "Innovation vs. Tradition",
        description: "Breaking new ground versus respecting artistic heritage",
        category: "arts",
      },
    ]
  }

  // Default fallback
  return [
    {
      id: `${character1}-${character2}-expertise`,
      title: "Approaches to Excellence",
      description: `How ${persona1.name} and ${persona2.name} define mastery`,
      category: "philosophy",
    },
    {
      id: `${character1}-${character2}-legacy`,
      title: "Lasting Impact",
      description: `The enduring influence of ${persona1.name} and ${persona2.name}`,
      category: "history",
    },
  ]
}
