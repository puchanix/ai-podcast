import OpenAI from "openai"
import { count } from "console"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Enhanced static topics as fallback
const staticTopics = [
  {
    id: "consciousness-nature",
    title: "The Nature of Consciousness",
    description: "What defines consciousness and can machines achieve it?",
    category: "philosophy",
  },
  {
    id: "art-vs-science",
    title: "Art vs Science as Truth",
    description: "Which better reveals fundamental truths about existence?",
    category: "philosophy",
  },
  {
    id: "individual-vs-society",
    title: "Individual Freedom vs Social Order",
    description: "How much personal freedom should society allow?",
    category: "politics",
  },
  {
    id: "progress-vs-tradition",
    title: "Progress vs Tradition",
    description: "Should we embrace change or preserve established ways?",
    category: "culture",
  },
  {
    id: "knowledge-vs-wisdom",
    title: "Knowledge vs Wisdom",
    description: "Is accumulating facts more valuable than understanding meaning?",
    category: "philosophy",
  },
  {
    id: "emotion-vs-reason",
    title: "Emotion vs Reason in Decision Making",
    description: "Should we trust our hearts or our minds when making choices?",
    category: "psychology",
  },
  {
    id: "fate-vs-free-will",
    title: "Fate vs Free Will",
    description: "Are our lives predetermined or do we shape our own destiny?",
    category: "philosophy",
  },
  {
    id: "beauty-objective",
    title: "Is Beauty Objective or Subjective?",
    description: "Does true beauty exist independently of the observer?",
    category: "aesthetics",
  },
]

// Improved topic generation prompts - focusing on universal concepts
const topicPrompts = {
  philosophical:
    "Generate a universal philosophical debate topic about fundamental concepts like existence, reality, knowledge, or truth. The topic should be timeless and not reference any specific person, culture, or era.",

  scientific:
    "Create a universal debate topic about the nature of discovery, knowledge, or understanding the world. Focus on broad concepts that transcend specific discoveries or individuals.",

  artistic:
    "Suggest a universal debate topic about creativity, beauty, expression, or the purpose of art. Focus on timeless questions about artistic creation and meaning.",

  social:
    "Generate a universal debate topic about human nature, society, justice, or governance. Focus on fundamental questions about how humans should live together.",

  existential:
    "Create a universal debate topic about life's meaning, purpose, mortality, or human existence. Focus on deep questions that all humans face.",

  ethical:
    "Suggest a universal moral debate topic about right and wrong, virtue, duty, or ethical decision-making. Focus on timeless moral dilemmas and principles.",
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { useAI = true, count = 6 } = req.body

    // If AI is disabled or no API key, return static topics
    if (!useAI || !process.env.OPENAI_API_KEY) {
      const shuffledTopics = [...staticTopics].sort(() => Math.random() - 0.5)
      return res.status(200).json({
        topics: shuffledTopics.slice(0, count),
        source: "static",
      })
    }

    // Generate AI topics
    const categories = Object.keys(topicPrompts)
    const selectedCategories = categories.sort(() => Math.random() - 0.5).slice(0, Math.min(count, categories.length))

    const aiTopics = await Promise.all(
      selectedCategories.map(async (category) => {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are creating universal debate topics for any two great minds to discuss. 

CRITICAL RULES:
- Never mention specific people, names, or historical figures
- Never use "vs" or "compared to" language  
- Never reference specific cultures, eras, or locations
- Create topics that are timeless and universal
- Focus on abstract concepts and fundamental questions
- Make topics that any two intelligent people could debate from different perspectives`,
              },
              {
                role: "user",
                content: `${topicPrompts[category]}

Return your response in this exact JSON format:
{
  "title": "Universal debate topic (max 6 words, no names or specific references)",
  "description": "Brief description of the debate question (max 12 words, no names or specific references)",
  "category": "${category}"
}

Examples of GOOD topics:
- "The Nature of True Happiness"
- "Logic vs Intuition in Decision Making"  
- "The Purpose of Human Suffering"

Examples of BAD topics (avoid these):
- "Shakespeare vs Mozart in Creativity"
- "Freud's Theory of Dreams"
- "Ancient vs Modern Philosophy"`,
              },
            ],
            max_tokens: 150,
            temperature: 0.8,
          })

          const response = completion.choices[0]?.message?.content?.trim()
          if (!response) throw new Error("Empty response")

          // Try to parse JSON response
          const topicData = JSON.parse(response)

          // Validate that the topic doesn't contain names or specific references
          const title = topicData.title || ""
          const description = topicData.description || ""

          // Simple check for common names/references that should be avoided
          const forbiddenWords = [
            "shakespeare",
            "mozart",
            "freud",
            "da vinci",
            "socrates",
            "vs",
            "compared to",
            "according to",
          ]
          const containsForbidden = forbiddenWords.some(
            (word) => title.toLowerCase().includes(word) || description.toLowerCase().includes(word),
          )

          if (containsForbidden) {
            throw new Error("Topic contains forbidden references")
          }

          return {
            id: `ai-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: title || `${category.charAt(0).toUpperCase() + category.slice(1)} Debate`,
            description: description || "A fundamental question for debate",
            category: topicData.category || category,
          }
        } catch (error) {
          console.error(`Error generating ${category} topic:`, error)
          // Return a fallback topic for this category
          const fallback = staticTopics.find((t) => t.category === category) || staticTopics[0]
          return {
            ...fallback,
            id: `fallback-${category}-${Date.now()}`,
          }
        }
      }),
    )

    // Mix AI topics with some static ones for variety
    const staticSample = staticTopics
      .filter((topic) => !aiTopics.some((ai) => ai.category === topic.category))
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(0, count - aiTopics.length))

    const allTopics = [...aiTopics, ...staticSample].sort(() => Math.random() - 0.5).slice(0, count)

    return res.status(200).json({
      topics: allTopics,
      source: "mixed",
    })
  } catch (error) {
    console.error("Error generating debate topics:", error)

    // Fallback to static topics on any error
    const shuffledTopics = [...staticTopics].sort(() => Math.random() - 0.5)
    return res.status(200).json({
      topics: shuffledTopics.slice(0, count),
      source: "static_fallback",
    })
  }
}
