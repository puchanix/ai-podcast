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

    // Determine the areas of expertise for both characters
    const expertise1 = getExpertiseArea(character1)
    const expertise2 = getExpertiseArea(character2)

    // Create the OpenAI request with RELEVANT UNIVERSAL topic generation
    const openaiPromise = openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are creating debate topics for two great minds with different areas of expertise.

DEBATER BACKGROUNDS:
- First debater: ${expertise1} (${persona1.name})
- Second debater: ${expertise2} (${persona2.name})

CRITICAL RULES:
- Create UNIVERSAL topics that don't mention specific people or names
- Topics should be relevant to BOTH debaters' areas of expertise
- Focus on concepts both minds would find intellectually engaging
- Never use "vs" between people or direct comparisons
- Make topics that leverage their different perspectives

GOOD EXAMPLES:
- For artist + philosopher: "The Role of Beauty in Understanding Truth"
- For scientist + artist: "Logic vs Intuition in Creative Discovery"
- For two philosophers: "The Nature of Human Consciousness"

BAD EXAMPLES (avoid):
- "Shakespeare vs Mozart in Creativity"
- "Freud's Theory of Dreams"
- "Who had more influence"

Return ONLY a valid JSON array with exactly 2 objects. Each object must have:
- id: unique kebab-case identifier
- title: relevant universal topic (max 50 characters, no names)
- description: brief explanation (max 100 characters, no names)
- category: one of "philosophy", "arts", "science", "politics", "history", "education"

Do not wrap the response in markdown code blocks. Return only the JSON array.`,
        },
        {
          role: "user",
          content: `Generate 2 universal debate topics that would be particularly engaging for a ${expertise1} and a ${expertise2} to discuss. Focus on areas where their different expertise would create interesting perspectives. Return only valid JSON array.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 400,
    })

    // Race between OpenAI request and timeout
    const completion = await Promise.race([openaiPromise, timeoutPromise])

    // Parse the response with robust error handling
    const topics = parseGPTResponse(completion.choices[0].message.content, character1, character2)

    // Validate topics don't contain forbidden content
    const validatedTopics = topics.map((topic) => validateUniversalTopic(topic))

    return validatedTopics
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

// Get the area of expertise for each character
function getExpertiseArea(characterId) {
  const expertiseMap = {
    daVinci: "Renaissance polymath (art, science, invention)",
    socrates: "Ancient philosopher (ethics, knowledge, wisdom)",
    frida: "Artist (self-expression, identity, pain)",
    shakespeare: "Playwright and poet (human nature, drama)",
    mozart: "Classical composer (musical harmony, creativity)",
    twain: "Writer and humorist (social criticism, storytelling)",
    freud: "Psychoanalyst (unconscious mind, human behavior)",
    spinoza: "Rationalist philosopher (ethics, nature, logic)",
    hypatia: "Mathematician and philosopher (logic, astronomy)",
    gandhi: "Political leader (nonviolence, justice, truth)",
  }

  return expertiseMap[characterId] || "great thinker"
}

// Validate that topics are truly universal but relevant
function validateUniversalTopic(topic) {
  const forbiddenWords = [
    "shakespeare",
    "mozart",
    "freud",
    "da vinci",
    "socrates",
    "frida",
    "twain",
    "spinoza",
    "hypatia",
    "gandhi",
    "leonardo",
    "william",
    "wolfgang",
    "sigmund",
    "baruch",
    "mahatma",
    "vs",
    "versus",
    "compared to",
    "according to",
    "influence of",
    "legacy of",
    "who",
    "whose",
  ]

  const title = (topic.title || "").toLowerCase()
  const description = (topic.description || "").toLowerCase()

  const containsForbidden = forbiddenWords.some((word) => title.includes(word) || description.includes(word))

  if (containsForbidden) {
    // Replace with a safe universal topic
    return {
      id: `universal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: "The Nature of Truth",
      description: "What constitutes absolute truth versus relative perspective?",
      category: "philosophy",
    }
  }

  return topic
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
      id: sanitizeString(topic.id) || `relevant-topic-${index + 1}`,
      title: sanitizeString(topic.title) || `Relevant Topic ${index + 1}`,
      description: sanitizeString(topic.description) || "A relevant debate topic for these great minds",
      category: validateCategory(topic.category) || "philosophy",
    }
  })

  // Ensure we have exactly 2 topics
  while (validatedTopics.length < 2) {
    const index = validatedTopics.length
    validatedTopics.push({
      id: `relevant-topic-${index + 1}`,
      title: `Relevant Topic ${index + 1}`,
      description: "A relevant debate topic for these great minds",
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

// Enhanced fallback function with RELEVANT topics based on character expertise
function getDefaultTopics(character1, character2) {
  const expertise1 = getExpertiseArea(character1)
  const expertise2 = getExpertiseArea(character2)

  // Character-pair specific relevant topics
  const relevantTopics = {
    // Artist + Artist
    "art-art": [
      {
        id: "purpose-of-art",
        title: "The Purpose of Art",
        description: "Should art serve society or express personal truth?",
        category: "arts",
      },
      {
        id: "beauty-vs-meaning",
        title: "Beauty vs Meaning in Art",
        description: "Is aesthetic beauty more important than deeper meaning?",
        category: "arts",
      },
    ],
    // Artist + Philosopher
    "art-philosophy": [
      {
        id: "art-as-truth",
        title: "Art as a Path to Truth",
        description: "Can artistic expression reveal truths that logic cannot?",
        category: "philosophy",
      },
      {
        id: "emotion-in-understanding",
        title: "Role of Emotion in Understanding",
        description: "Do feelings help or hinder our grasp of reality?",
        category: "philosophy",
      },
    ],
    // Philosopher + Philosopher
    "philosophy-philosophy": [
      {
        id: "nature-of-knowledge",
        title: "The Nature of Knowledge",
        description: "How do we distinguish between belief and true knowledge?",
        category: "philosophy",
      },
      {
        id: "ethics-and-morality",
        title: "Source of Moral Truth",
        description: "Are moral principles universal or culturally determined?",
        category: "philosophy",
      },
    ],
    // Default fallback
    default: [
      {
        id: "wisdom-vs-knowledge",
        title: "Wisdom vs Knowledge",
        description: "Is accumulated information the same as true understanding?",
        category: "philosophy",
      },
      {
        id: "individual-vs-collective",
        title: "Individual vs Collective Good",
        description: "When should personal desires yield to societal needs?",
        category: "politics",
      },
    ],
  }

  // Determine topic category based on expertise
  let topicKey = "default"
  if (expertise1.includes("art") && expertise2.includes("art")) {
    topicKey = "art-art"
  } else if (
    (expertise1.includes("art") && expertise2.includes("philosopher")) ||
    (expertise1.includes("philosopher") && expertise2.includes("art"))
  ) {
    topicKey = "art-philosophy"
  } else if (expertise1.includes("philosopher") && expertise2.includes("philosopher")) {
    topicKey = "philosophy-philosophy"
  }

  return relevantTopics[topicKey] || relevantTopics.default
}
