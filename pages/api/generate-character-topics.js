import OpenAI from "openai"
import { personas } from "../../lib/personas"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
      return res.status(400).json({
        error: "Invalid character selection",
        available: Object.keys(personas),
        requested: { character1, character2 },
      })
    }

    // Generate topics with retry logic for mobile reliability
    const topics = await generateTopicsWithRetry(persona1, persona2, character1, character2)

    return res.status(200).json({ topics })
  } catch (error) {
    console.error("Error generating topics:", error)

    // Always provide fallback topics to prevent UI breaks
    const { character1, character2 } = req.body
    const fallbackTopics = getDefaultTopics(character1, character2)

    return res.status(200).json({ topics: fallbackTopics })
  }
}

// Generate topics with retry logic for mobile networks
async function generateTopicsWithRetry(persona1, persona2, character1, character2, retryCount = 0) {
  const maxRetries = 2
  const timeoutMs = 15000 // 15 second timeout for mobile

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
    })

    // Create the OpenAI request
    const openaiPromise = openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a debate topic generator. Create exactly 2 compelling debate topics for ${persona1.name} and ${persona2.name}.

Return ONLY a valid JSON array with exactly 2 objects. Each object must have:
- id: unique kebab-case identifier
- title: concise topic title (max 50 characters)  
- description: brief explanation (max 100 characters)
- category: one of "philosophy", "arts", "science", "politics", "history", "education"

Do not wrap the response in markdown code blocks. Return only the JSON array.`,
        },
        {
          role: "user",
          content: `Generate 2 debate topics for ${persona1.name} vs ${persona2.name}. Return only valid JSON array.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 400, // Reduced for faster response
    })

    // Race between OpenAI request and timeout
    const completion = await Promise.race([openaiPromise, timeoutPromise])

    // Parse the response with robust error handling
    const topics = parseGPTResponse(completion.choices[0].message.content, character1, character2)

    return topics
  } catch (error) {
    console.error(`Topic generation attempt ${retryCount + 1} failed:`, error.message)

    // Retry on network errors or timeouts
    if (
      retryCount < maxRetries &&
      (error.message.includes("timeout") || error.message.includes("network") || error.message.includes("fetch"))
    ) {
      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 1000))
      return generateTopicsWithRetry(persona1, persona2, character1, character2, retryCount + 1)
    }

    // If all retries failed, throw error to trigger fallback
    throw error
  }
}

// Robust JSON parsing that handles various GPT response formats
function parseGPTResponse(content, character1, character2) {
  if (!content || typeof content !== "string") {
    throw new Error("Empty or invalid response content")
  }

  let cleanContent = content.trim()

  // Remove markdown code blocks if present
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "")
  } else if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "")
  }

  // Remove any leading/trailing whitespace again
  cleanContent = cleanContent.trim()

  // Try to find JSON array in the response if it's embedded in text
  const jsonMatch = cleanContent.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    cleanContent = jsonMatch[0]
  }

  let parsedTopics
  try {
    parsedTopics = JSON.parse(cleanContent)
  } catch (parseError) {
    console.error("JSON parse error. Content was:", cleanContent)
    throw new Error(`Failed to parse JSON: ${parseError.message}`)
  }

  // Validate the response structure
  if (!Array.isArray(parsedTopics)) {
    throw new Error("Response is not an array")
  }

  if (parsedTopics.length === 0) {
    throw new Error("Response array is empty")
  }

  // Take only first 2 topics and validate/sanitize them
  const validatedTopics = parsedTopics.slice(0, 2).map((topic, index) => {
    if (!topic || typeof topic !== "object") {
      throw new Error(`Topic ${index + 1} is not a valid object`)
    }

    return {
      id: sanitizeString(topic.id) || `${character1}-${character2}-topic-${index + 1}`,
      title: sanitizeString(topic.title) || `Topic ${index + 1}`,
      description: sanitizeString(topic.description) || "A debate topic for these historical figures",
      category: validateCategory(topic.category) || "philosophy",
    }
  })

  // Ensure we have exactly 2 topics
  while (validatedTopics.length < 2) {
    const index = validatedTopics.length
    validatedTopics.push({
      id: `${character1}-${character2}-topic-${index + 1}`,
      title: `Topic ${index + 1}`,
      description: "A debate topic for these historical figures",
      category: "philosophy",
    })
  }

  return validatedTopics
}

// Sanitize string inputs
function sanitizeString(str) {
  if (typeof str !== "string") return null
  return str.trim().substring(0, 200) // Prevent overly long strings
}

// Validate category
function validateCategory(category) {
  const validCategories = ["philosophy", "arts", "science", "politics", "history", "education"]
  return validCategories.includes(category) ? category : "philosophy"
}

// Enhanced fallback function with character-specific topics
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

  // Create a normalized pair key for lookup
  const sortedPair = [character1, character2].sort().join("_")

  // Character-specific fallback topics
  const characterPairTopics = {
    daVinci_socrates: [
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
    ],
    daVinci_frida: [
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
    ],
    frida_socrates: [
      {
        id: "emotion-vs-reason",
        title: "Emotion vs. Reason",
        description: "Should decisions be guided by feeling or logic?",
        category: "philosophy",
      },
      {
        id: "suffering-and-wisdom",
        title: "Suffering and Wisdom",
        description: "Does personal pain lead to greater understanding?",
        category: "philosophy",
      },
    ],
    mozart_shakespeare: [
      {
        id: "music-vs-words",
        title: "Music vs. Words",
        description: "Which art form better expresses human emotion?",
        category: "arts",
      },
      {
        id: "divine-inspiration",
        title: "Divine Inspiration",
        description: "Is artistic genius a gift from above or human effort?",
        category: "arts",
      },
    ],
    mozart_socrates: [
      {
        id: "harmony-and-order",
        title: "Harmony and Order",
        description: "Is mathematical harmony the key to understanding life?",
        category: "philosophy",
      },
      {
        id: "beauty-and-truth",
        title: "Beauty and Truth",
        description: "Are beautiful things necessarily true?",
        category: "philosophy",
      },
    ],
    shakespeare_socrates: [
      {
        id: "human-nature",
        title: "Human Nature",
        description: "Are humans fundamentally good or flawed?",
        category: "philosophy",
      },
      {
        id: "knowledge-through-story",
        title: "Knowledge Through Story",
        description: "Do stories teach better than philosophical inquiry?",
        category: "education",
      },
    ],
  }

  // Return character-specific topics or generic fallback
  return (
    characterPairTopics[sortedPair] || [
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
  )
}
