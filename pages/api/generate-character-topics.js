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

    console.log(`Generating topics for ${expertise1} and ${expertise2}`)

    // Generate both serious and light topics
    const [seriousTopic, lightTopic] = await Promise.all([
      generateSeriousTopic(expertise1, expertise2),
      generateLightTopic(expertise1, expertise2),
    ])

    const topics = [seriousTopic, lightTopic]

    console.log("Generated topics:", topics)

    // Validate topics don't contain forbidden content
    const validatedTopics = topics.map((topic, index) => validateUniversalTopic(topic, index))

    console.log("Final validated topics:", validatedTopics)

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

// Generate a serious, intellectual topic
async function generateSeriousTopic(expertise1, expertise2) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `Create ONE serious, intellectual debate topic for two great minds.

DEBATER BACKGROUNDS:
- First debater: ${expertise1}
- Second debater: ${expertise2}

RULES:
- Create a UNIVERSAL topic (no specific names or people)
- Make it intellectually engaging and thought-provoking
- Should be relevant to both debaters' expertise
- Focus on deep, meaningful concepts

Return ONLY a single JSON object with:
- id: unique kebab-case identifier
- title: serious topic (max 50 characters, no names)
- description: thoughtful explanation (max 100 characters, no names)
- category: one of "philosophy", "arts", "science", "politics", "history", "education"`,
      },
      {
        role: "user",
        content: `Generate 1 serious, intellectual debate topic for a ${expertise1} and a ${expertise2}. Return only a single JSON object.`,
      },
    ],
    temperature: 0.8,
    max_tokens: 200,
  })

  const content = completion.choices[0].message.content.trim()
  return parseTopicResponse(content, "serious")
}

// Generate a lighter, more humorous topic
async function generateLightTopic(expertise1, expertise2) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `Create ONE lighter, more playful debate topic for two great minds.

DEBATER BACKGROUNDS:
- First debater: ${expertise1}
- Second debater: ${expertise2}

RULES:
- Create a UNIVERSAL topic (no specific names or people)
- Make it fun, witty, or slightly humorous
- Should still be relevant to their expertise but more accessible
- Think everyday situations, quirky questions, or playful "what-ifs"
- Keep it intelligent but not overly serious

Examples of light topics:
- "The Art of Procrastination"
- "Why Do Socks Disappear in the Laundry?"
- "The Philosophy of Pizza Toppings"
- "Is Perfectionism a Blessing or Curse?"

Return ONLY a single JSON object with:
- id: unique kebab-case identifier
- title: light/fun topic (max 50 characters, no names)
- description: playful explanation (max 100 characters, no names)
- category: one of "philosophy", "arts", "science", "politics", "history", "education"`,
      },
      {
        role: "user",
        content: `Generate 1 light, playful debate topic for a ${expertise1} and a ${expertise2}. Make it fun but still intellectually engaging. Return only a single JSON object.`,
      },
    ],
    temperature: 1.0, // Higher temperature for more creativity
    max_tokens: 200,
  })

  const content = completion.choices[0].message.content.trim()
  return parseTopicResponse(content, "light")
}

// Parse a single topic response
function parseTopicResponse(content, type) {
  if (!content || typeof content !== "string") {
    throw new Error(`Empty or invalid ${type} topic response`)
  }

  let cleanContent = content.trim()

  // Remove markdown code blocks if present
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "")
  } else if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "")
  }

  cleanContent = cleanContent.trim()

  // Try to find JSON object in the response
  const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    cleanContent = jsonMatch[0]
  }

  try {
    const topic = JSON.parse(cleanContent)
    return {
      id: sanitizeString(topic.id) || `${type}-topic-${Date.now()}`,
      title: sanitizeString(topic.title) || `${type} Topic`,
      description: sanitizeString(topic.description) || `A ${type} debate topic`,
      category: validateCategory(topic.category) || "philosophy",
    }
  } catch (parseError) {
    console.error(`${type} topic JSON parse error:`, cleanContent)
    throw new Error(`Failed to parse ${type} topic JSON: ${parseError.message}`)
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

// Less aggressive validation that only catches obvious problems
function validateUniversalTopic(topic, index) {
  // Only check for the most obvious forbidden words
  const strictlyForbiddenWords = [
    "shakespeare",
    "mozart",
    "freud",
    "leonardo",
    "socrates",
    "frida",
    "twain",
    "spinoza",
    "hypatia",
    "gandhi",
    "da vinci",
  ]

  const title = (topic.title || "").toLowerCase()
  const description = (topic.description || "").toLowerCase()

  const containsStrictlyForbidden = strictlyForbiddenWords.some(
    (word) => title.includes(word) || description.includes(word),
  )

  if (containsStrictlyForbidden) {
    console.log(`Topic ${index + 1} contained forbidden word, replacing:`, topic)
    // Use different fallbacks - serious for first, light for second
    const fallbacks = [
      {
        id: `serious-fallback-${Date.now()}-${index}`,
        title: "The Source of Wisdom",
        description: "Where does true understanding come from?",
        category: "philosophy",
      },
      {
        id: `light-fallback-${Date.now()}-${index}`,
        title: "The Art of Procrastination",
        description: "Is delaying tasks a form of creative thinking?",
        category: "philosophy",
      },
    ]
    return fallbacks[index % fallbacks.length]
  }

  return topic
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

// Enhanced fallback function with mixed serious/light topics
function getDefaultTopics(character1, character2) {
  const seriousFallbacks = [
    {
      id: "nature-of-knowledge",
      title: "The Nature of Knowledge",
      description: "How do we distinguish between belief and true knowledge?",
      category: "philosophy",
    },
    {
      id: "role-of-emotion",
      title: "Role of Emotion in Understanding",
      description: "Do feelings help or hinder our grasp of reality?",
      category: "philosophy",
    },
    {
      id: "beauty-and-truth",
      title: "Beauty and Truth",
      description: "Is there a connection between aesthetic beauty and truth?",
      category: "philosophy",
    },
  ]

  const lightFallbacks = [
    {
      id: "art-of-procrastination",
      title: "The Art of Procrastination",
      description: "Is delaying tasks a form of creative thinking?",
      category: "philosophy",
    },
    {
      id: "perfect-imperfection",
      title: "Perfect Imperfection",
      description: "Are flaws what make things truly beautiful?",
      category: "arts",
    },
    {
      id: "wisdom-of-fools",
      title: "The Wisdom of Fools",
      description: "Do jesters and comedians reveal deeper truths?",
      category: "philosophy",
    },
  ]

  // Always return one serious, one light
  const serious = seriousFallbacks[Math.floor(Math.random() * seriousFallbacks.length)]
  const light = lightFallbacks[Math.floor(Math.random() * lightFallbacks.length)]

  return [serious, light]
}
